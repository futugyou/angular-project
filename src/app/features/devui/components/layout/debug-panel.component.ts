import {
  Component,
  computed,
  input,
  signal,
  ChangeDetectionStrategy,
  inject,
  Pipe,
  PipeTransform,
  viewChild,
  ElementRef,
  output,
} from '@angular/core'
import { NgClass } from '@angular/common'
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from '@shared/ui/tab.component'
import { BadgeComponent } from '@shared/ui/badge.component'
import { ButtonComponent } from '@shared/ui/button.component'
import { ScrollAreaComponent } from '@shared/ui/scroll-area.component'

import { ContextInspectorComponent } from '../../components/features/agent/context-inspector.component'
import {
  ExtendedResponseStreamEvent,
  ResponseFunctionResultComplete,
  ResponseOutputItemAddedEvent,
  ResponseFunctionToolCall,
  ResponseCompletedEvent,
} from '../../types'
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../stores'

function addSeparatorsToEvents(
  events: ExtendedResponseStreamEvent[],
): (ExtendedResponseStreamEvent | { type: 'separator'; id: string })[] {
  const result: (ExtendedResponseStreamEvent | { type: 'separator'; id: string })[] = []
  let lastWasResponseDone = false

  for (let i = 0; i < events.length; i++) {
    const event = events[i]

    // Add separator before first event after response.done
    if (lastWasResponseDone && event.type !== 'response.done') {
      result.push({ type: 'separator', id: `sep-${i}` })
      lastWasResponseDone = false
    }

    result.push(event)

    // Track when we see response.done
    if (event.type === 'response.done' || event.type === 'response.completed') {
      lastWasResponseDone = true
    }
  }

  return result
}

// Type definitions for event data structures
interface EventDataBase {
  call_id?: string
  executor_id?: string
  timestamp?: string
  [key: string]: unknown
}

interface FunctionCallData extends EventDataBase {
  name?: string
  arguments?: string | object
  function?: unknown
  tool_calls?: unknown[]
}

interface WorkflowEventData extends EventDataBase {
  event_type?: string
  data?: Record<string, unknown>
}

interface TraceEventData extends EventDataBase {
  operation_name?: string
  duration_ms?: number
  status?: string
  attributes?: Record<string, unknown>
  span_id?: string
  trace_id?: string
  parent_span_id?: string | null
  start_time?: number
  end_time?: number
  entity_id?: string
  response_id?: string | null
}

// Helper type for trace hierarchy
interface TraceNode {
  event: ExtendedResponseStreamEvent
  data: TraceEventData
  children: TraceNode[]
}

// Helper type for grouped traces by response
interface TraceGroup {
  response_id: string
  timestamp: number
  traces: TraceNode[]
  totalDuration: number
  entity_id?: string
}

// Helper: Extract function result from DevUI custom event
function getFunctionResultFromEvent(event: ExtendedResponseStreamEvent): {
  call_id: string
  output: string
  status: string
} | null {
  if (event.type === 'response.function_result.complete') {
    const resultEvent = event as ResponseFunctionResultComplete
    return {
      call_id: resultEvent.call_id,
      output: resultEvent.output,
      status: resultEvent.status,
    }
  }
  return null
}

// Helper function to accumulate OpenAI events into meaningful units
function processEventsForDisplay(
  events: ExtendedResponseStreamEvent[],
): ExtendedResponseStreamEvent[] {
  const processedEvents: ExtendedResponseStreamEvent[] = []
  const functionCalls = new Map<
    string,
    {
      name?: string
      arguments: string
      callId: string
      itemId?: string // Track item_id for delta matching
      timestamp: string
    }
  >()
  const callIdToName = new Map<string, string>() // Track call_id -> function name mappings
  let accumulatedText = ''

  for (const event of events) {
    // Skip trace events - they belong in the Traces tab only
    if (event.type === 'response.trace.completed' || event.type === 'response.trace.completed') {
      continue
    }

    // Handle response.output_item.added - NEW! Extract function call metadata
    if (event.type === 'response.output_item.added') {
      const outputEvent = event as ResponseOutputItemAddedEvent
      const item = outputEvent.item

      // If it's a function call item, extract metadata
      if (item.type === 'function_call') {
        // Type assertion for function call
        const funcCall = item as ResponseFunctionToolCall
        const callId = funcCall.call_id

        // Initialize function call tracking with REAL function name from backend!
        functionCalls.set(callId, {
          name: funcCall.name, // ← REAL NAME! (not "unknown")
          arguments: '',
          callId: callId,
          itemId: funcCall.id, // Track item_id for delta matching
          timestamp: new Date().toISOString(),
        })

        // Also track in callIdToName map for result pairing
        callIdToName.set(callId, funcCall.name)
      }

      // Pass through the event for display
      processedEvents.push(event)
      continue
    }

    // Check if this is a function result (OpenAI standard format)
    const isFunctionResult = getFunctionResultFromEvent(event) !== null

    // Always show completion, error, workflow events, and function results
    if (
      event.type === 'response.completed' ||
      event.type === 'response.done' ||
      event.type === 'error' ||
      event.type === 'response.workflow_event.completed' ||
      event.type === 'response.trace.completed' ||
      event.type === 'response.trace.completed' ||
      isFunctionResult
    ) {
      // Flush any accumulated text before showing these events
      if (accumulatedText.trim()) {
        processedEvents.push({
          type: 'response.output_text.delta',
          delta: accumulatedText.trim(),
        } as ExtendedResponseStreamEvent)
        accumulatedText = ''
      }

      // Extract function names from trace events
      if (
        (event.type === 'response.trace.completed' || event.type === 'response.trace.completed') &&
        'data' in event
      ) {
        const traceData = event.data as TraceEventData
        if (
          traceData.attributes &&
          traceData.attributes['gen_ai.output.messages'] &&
          typeof traceData.attributes['gen_ai.output.messages'] === 'string'
        ) {
          try {
            const messages = JSON.parse(traceData.attributes['gen_ai.output.messages'] as string)
            for (const msg of messages) {
              if (msg.parts) {
                for (const part of msg.parts) {
                  if (part.type === 'tool_call' && part.name && part.id) {
                    // Store the call_id -> function name mapping
                    callIdToName.set(part.id, part.name)
                  }
                }
              }
            }
          } catch {
            // Ignore parsing errors
          }
        }
      }

      // For function results, ensure we have the corresponding function call
      const functionResult = getFunctionResultFromEvent(event)
      if (functionResult) {
        const callId = functionResult.call_id

        // Only create function call event if we have actual argument data
        if (callId && functionCalls.has(callId)) {
          const call = functionCalls.get(callId)!
          const functionName = callIdToName.get(callId) || call.name || 'unknown'

          processedEvents.push({
            type: 'response.function_call.complete',
            data: {
              name: functionName,
              arguments: call.arguments,
              call_id: call.callId,
            },
          } as ExtendedResponseStreamEvent)
          functionCalls.delete(callId)
        }
      }

      processedEvents.push(event)
      continue
    }

    // Handle function call start events
    if (event.type === 'response.function_call.delta' && 'data' in event) {
      const callData = event.data as FunctionCallData
      const callId = callData.call_id || `call_${Date.now()}`

      // Initialize or update the function call
      if (!functionCalls.has(callId)) {
        functionCalls.set(callId, {
          name: callData.name || undefined,
          arguments: '',
          callId,
          timestamp: new Date().toISOString(),
        })
      }

      // Update name if provided
      if (callData.name && callData.name.trim()) {
        functionCalls.get(callId)!.name = callData.name.trim()
      }
      continue
    }

    // Handle function call complete events that come directly (not generated by us)
    if (event.type === 'response.function_call.complete' && 'data' in event) {
      // This is already a complete function call event, just pass it through
      processedEvents.push(event)
      continue
    }

    // Handle function call arguments accumulation - UPDATED to use item_id
    if (event.type === 'response.function_call_arguments.delta') {
      let deltaData: string = ''
      let callId: string | null = null

      // Extract delta from actual backend format
      if ('delta' in event && typeof event.delta === 'string') {
        deltaData = event.delta
      }

      // NEW: Use item_id to find the matching function call
      // Since backend now uses call_id as item_id, we can match directly
      if ('item_id' in event && event.item_id) {
        const itemId = event.item_id

        // Find function call by item_id (which equals call_id in our implementation)
        for (const [cId, call] of functionCalls.entries()) {
          if (call.itemId === itemId || cId === itemId) {
            callId = cId
            break
          }
        }
      }

      if (deltaData && callId) {
        const call = functionCalls.get(callId)

        if (call) {
          // Function name should already be set from output_item.added event
          // Just accumulate arguments

          // Skip the initial "{}" delta that backend sends
          if (deltaData === '{}' && call.arguments === '') {
            continue
          }

          // Accumulate the delta (no cleaning needed - use raw delta)
          call.arguments += deltaData
        } else {
          // Shouldn't happen if output_item.added was emitted first
          console.warn(
            `Received argument delta for unknown call with item_id: ${
              'item_id' in event ? event.item_id : 'unknown'
            }`,
          )
        }
      }
      continue
    }

    // Handle text delta events
    if (event.type === 'response.output_text.delta' && 'delta' in event) {
      accumulatedText += event.delta || ''

      // Only emit if we have substantial content AND hit a natural paragraph break
      // This makes the text accumulation much more aggressive
      if (
        accumulatedText.length > 100 &&
        (accumulatedText.includes('\n\n') || accumulatedText.trim().match(/[.!?]\s*$/))
      ) {
        processedEvents.push({
          type: 'response.output_text.delta',
          delta: accumulatedText.trim(),
        } as ExtendedResponseStreamEvent)
        accumulatedText = ''
      }
      continue
    }

    // Handle usage events (skip them as they're noise)
    if (event.type === 'response.usage.complete') {
      continue
    }

    // Handle other event types - pass through
    processedEvents.push(event)
  }

  // Finalize any remaining function calls that didn't get results
  for (const [, call] of functionCalls) {
    if (call.arguments.trim() && call.arguments.trim().length > 2) {
      const functionName = callIdToName.get(call.callId) || call.name || 'unknown'
      processedEvents.push({
        type: 'response.function_call.complete',
        data: {
          name: functionName,
          arguments: call.arguments,
          call_id: call.callId,
        },
      } as ExtendedResponseStreamEvent)
    }
  }

  // Finalize any remaining text
  if (accumulatedText.trim()) {
    processedEvents.push({
      type: 'response.output_text.delta',
      delta: accumulatedText.trim(),
    } as ExtendedResponseStreamEvent)
  }

  return processedEvents
}

interface EventItemProps {
  event: ExtendedResponseStreamEvent
}

function getEventSummary(event: ExtendedResponseStreamEvent): string {
  switch (event.type) {
    case 'response.output_text.delta':
      if ('delta' in event) {
        const text = event.delta || ''
        return text.length > 60 ? `${text.slice(0, 60)}...` : text
      }
      return 'Text output'

    case 'response.function_call.complete':
      if ('data' in event && event.data) {
        const data = event.data as FunctionCallData

        // Try to extract function name from various possible locations
        let functionName = data.name || 'unknown'

        // Use the function name as provided, no complex inference needed
        if (!functionName || functionName === 'unknown') {
          functionName = 'function_call'
        }

        const argsStr = data.arguments
          ? typeof data.arguments === 'string'
            ? data.arguments.slice(0, 30)
            : JSON.stringify(data.arguments).slice(0, 30)
          : ''
        return `Calling ${functionName}(${argsStr}${argsStr.length >= 30 ? '...' : ''})`
      }
      return 'Function call'

    case 'response.function_call_arguments.delta':
      if ('delta' in event && event.delta) {
        return `Function arg delta: ${event.delta.slice(0, 30)}${
          event.delta.length > 30 ? '...' : ''
        }`
      }
      return 'Function arguments...'

    case 'response.function_result.complete': {
      const resultEvent = event as ResponseFunctionResultComplete
      const truncated = resultEvent.output.slice(0, 40)
      return `Function result: ${truncated}${truncated.length >= 40 ? '...' : ''}`
    }

    case 'response.output_item.added': {
      // Could be a function call
      const addedEvent = event as ResponseOutputItemAddedEvent
      if (addedEvent.item.type === 'function_call') {
        return `Tool call: ${addedEvent.item.name}`
      }
      return 'Output item added'
    }

    case 'response.workflow_event.completed':
      if ('data' in event && event.data) {
        const data = event.data as WorkflowEventData
        return `Executor: ${data.executor_id || 'unknown'}`
      }
      return 'Workflow event'

    case 'response.trace.completed':
      if ('data' in event && event.data) {
        const data = event.data as TraceEventData
        return `Trace: ${data.operation_name || 'unknown'}`
      }
      return 'Trace event'

    case 'response.completed':
      if ('response' in event && event.response && 'usage' in event.response) {
        const completedEvent = event as ResponseCompletedEvent
        const usage = completedEvent.response.usage
        if (usage) {
          return `Response complete (${usage.total_tokens} tokens)`
        }
      }
      return 'Response complete'

    case 'response.done':
      return 'Response complete'

    case 'error':
      // Extract actual error message from error events
      if ('message' in event && typeof event.message === 'string') {
        return event.message
      }
      return 'Error occurred'

    default:
      return `${event.type}`
  }
}

export function getEventIconName(type: string): string {
  switch (type) {
    case 'response.output_text.delta':
      return 'lucideMessageSquare'
    case 'response.function_call.complete':
    case 'response.function_call.delta':
    case 'response.function_call_arguments.delta':
      return 'lucideWrench'
    case 'response.function_result.complete':
    case 'response.output_item.added':
    case 'response.completed':
    case 'response.done':
      return 'lucideCheckCircle2'
    case 'response.workflow_event.completed':
      return 'lucideActivity'
    case 'response.trace.completed':
      return 'lucideSearch'
    case 'error':
      return 'lucideXCircle'
    default:
      return 'lucideAlertCircle'
  }
}

function getEventColor(type: string) {
  switch (type) {
    case 'response.output_text.delta':
      return 'text-gray-600 dark:text-gray-400'
    case 'response.function_call.complete':
    case 'response.function_call.delta':
    case 'response.function_call_arguments.delta':
      return 'text-blue-600 dark:text-blue-400'
    case 'response.function_result.complete':
      return 'text-green-600 dark:text-green-400'
    case 'response.output_item.added':
      return 'text-green-600 dark:text-green-400'
    case 'response.workflow_event.completed':
      return 'text-purple-600 dark:text-purple-400'
    case 'response.trace.completed':
      return 'text-orange-600 dark:text-orange-400'
    case 'response.completed':
      return 'text-green-600 dark:text-green-400'
    case 'response.done':
      return 'text-green-600 dark:text-green-400'
    case 'error':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

// Build hierarchical trace structure from flat trace events
function buildTraceHierarchy(traceEvents: ExtendedResponseStreamEvent[]): TraceGroup[] {
  // Group by response_id first
  const groupedByResponse = new Map<string, ExtendedResponseStreamEvent[]>()

  for (const event of traceEvents) {
    if (!('data' in event)) continue
    const data = event.data as TraceEventData
    const responseId = data.response_id || 'unknown'

    if (!groupedByResponse.has(responseId)) {
      groupedByResponse.set(responseId, [])
    }
    groupedByResponse.get(responseId)!.push(event)
  }

  // Convert each group to hierarchical structure
  const groups: TraceGroup[] = []

  for (const [responseId, events] of groupedByResponse) {
    // Build tree from parent_span_id relationships
    const nodeMap = new Map<string, TraceNode>()
    const rootNodes: TraceNode[] = []

    // First pass: create all nodes
    for (const event of events) {
      if (!('data' in event)) continue
      const data = (event as { data: TraceEventData }).data
      const spanId = data.span_id || `span_${Math.random()}`
      nodeMap.set(spanId, {
        event,
        data,
        children: [],
      })
    }

    // Second pass: build parent-child relationships
    for (const event of events) {
      if (!('data' in event)) continue
      const data = (event as { data: TraceEventData }).data
      const spanId = data.span_id || ''
      const parentSpanId = data.parent_span_id
      const node = nodeMap.get(spanId)

      if (!node) continue

      if (parentSpanId && nodeMap.has(parentSpanId)) {
        // Has a parent in this group
        nodeMap.get(parentSpanId)!.children.push(node)
      } else {
        // Root node (no parent or parent not in this group)
        rootNodes.push(node)
      }
    }

    // Sort root nodes by start_time (earliest first)
    rootNodes.sort((a, b) => (a.data.start_time || 0) - (b.data.start_time || 0))

    // Sort children recursively by start_time
    const sortChildren = (node: TraceNode) => {
      node.children.sort((a, b) => (a.data.start_time || 0) - (b.data.start_time || 0))
      node.children.forEach(sortChildren)
    }
    rootNodes.forEach(sortChildren)

    // Calculate group metadata
    const firstEvent = events[0]
    const firstData =
      firstEvent && 'data' in firstEvent ? (firstEvent.data as TraceEventData) : null
    const timestamp = Math.min(
      ...events.map((e) => {
        const d = 'data' in e ? (e.data as TraceEventData) : null
        return d?.start_time || Date.now() / 1000
      }),
    )
    const totalDuration = events.reduce((sum, e) => {
      const d = 'data' in e ? (e.data as TraceEventData) : null
      return sum + (d?.duration_ms || 0)
    }, 0)

    groups.push({
      response_id: responseId,
      timestamp,
      traces: rootNodes,
      totalDuration,
      entity_id: firstData?.entity_id,
    })
  }

  // Sort groups by timestamp (newest first)
  groups.sort((a, b) => b.timestamp - a.timestamp)

  return groups
}

// Recursively parse escaped JSON strings at any depth
function parseEscapedJson(value: unknown): unknown {
  if (typeof value === 'string') {
    // Try to parse JSON strings (arrays or objects)
    const trimmed = value.trim()
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(value)
        // Recursively process the parsed result
        return parseEscapedJson(parsed)
      } catch {
        return value
      }
    }
    return value
  }

  if (Array.isArray(value)) {
    return value.map(parseEscapedJson)
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = parseEscapedJson(v)
    }
    return result
  }

  return value
}

// Format trace attributes by parsing escaped JSON strings for better readability
function formatTraceAttributes(attributes: Record<string, unknown>): string {
  try {
    const formatted = parseEscapedJson(attributes)
    return JSON.stringify(formatted, null, 2)
  } catch {
    return JSON.stringify(attributes, null, 2)
  }
}

// Get operation type badge color
function getOperationColor(operationName: string): string {
  if (operationName.includes('invoke_agent') || operationName.includes('Agent')) {
    return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
  }
  if (operationName.includes('chat') || operationName.includes('Chat')) {
    return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
  }
  if (operationName.includes('tool') || operationName.includes('execute')) {
    return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
  }
  return 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200'
}

@Pipe({ name: 'jsonStringify', standalone: true })
export class JsonStringifyPipe implements PipeTransform {
  transform(value: any): string {
    return JSON.stringify(value, null, 2)
  }
}

@Pipe({ name: 'traceFormat', standalone: true })
export class TraceFormatPipe implements PipeTransform {
  transform(value: any): string {
    return formatTraceAttributes(value)
  }
}

@Component({
  selector: 'app-message-separator',
  standalone: true,
  template: `
    <div class="flex items-center gap-2 py-3 px-2">
      <div class="flex-1 border-t border-border/50"></div>
    </div>
  `,
  host: { class: 'block w-full' },
})
export class MessageSeparatorComponent {}

@Component({
  selector: 'app-event-expanded-content',
  standalone: true,
  imports: [NgIconComponent, JsonStringifyPipe, TraceFormatPipe],
  template: `
    @if (event().type === 'error') {
      @let errorEvent = asError(event());
      <div class="space-y-2">
        <div class="flex items-center gap-2">
          <ng-icon name="lucideXCircle" class="h-4 w-4 text-red-500" />
          <span class="font-semibold text-sm">Error Details</span>
        </div>
        <div class="text-xs">
          @if (errorEvent.message) {
            <div class="mb-2">
              <span class="font-medium text-muted-foreground">Message:</span>
              <div class="mt-1">
                <pre
                  class="text-xs bg-destructive/10 border border-destructive/30 rounded p-2 text-destructive whitespace-pre-wrap break-all"
                  >{{ errorEvent.message }}</pre
                >
              </div>
            </div>
          }
          @if (errorEvent.code) {
            <div class="mb-2">
              <span class="font-medium text-muted-foreground">Code:</span>
              <span class="ml-2 font-mono text-xs">{{ errorEvent.code }}</span>
            </div>
          }
          @if (errorEvent.param) {
            <div class="mb-2">
              <span class="font-medium text-muted-foreground">Parameter:</span>
              <span class="ml-2 font-mono text-xs">{{ errorEvent.param }}</span>
            </div>
          }
          <div>
            <span class="font-medium text-muted-foreground">Raw Event:</span>
            <div class="mt-1">
              <pre
                class="text-xs bg-background border rounded p-2 whitespace-pre-wrap break-all max-h-32 overflow-auto"
                >{{ event() | jsonStringify }}</pre
              >
            </div>
          </div>
        </div>
      </div>
    } @else {
      @switch (event().type) {
        @case ('response.function_call.complete') {
          @if (hasData(event()); as data) {
            @let fcData = asFunctionCall(data);
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideWrench" class="h-4 w-4 text-blue-500" />
                <span class="font-semibold text-sm">Function Call</span>
              </div>
              <div class="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <span class="font-medium text-muted-foreground">Function:</span>
                  <span class="ml-2 font-mono bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                    {{ fcData.name || 'unknown' }}
                  </span>
                </div>
                @if (fcData.call_id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Call ID:</span>
                    <span class="ml-2 font-mono text-xs">{{ fcData.call_id }}</span>
                  </div>
                }
                @if (fcData.arguments) {
                  <div>
                    <span class="font-medium text-muted-foreground">Arguments:</span>
                    <div class="mt-1 max-h-32 overflow-auto">
                      <pre
                        class="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-w-full break-all"
                        >{{ fcData.arguments | jsonStringify }}</pre
                      >
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        @case ('response.function_result.complete') {
          @let resultEvent = asResultEvent(event());
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <ng-icon name="lucideCheckCircle2" class="h-4 w-4 text-green-500" />
              <span class="font-semibold text-sm">Function Result</span>
            </div>
            <div class="grid grid-cols-1 gap-2 text-xs">
              <div>
                <span class="font-medium text-muted-foreground">Call ID:</span>
                <span class="ml-2 font-mono text-xs">{{ resultEvent.call_id }}</span>
              </div>
              <div>
                <span class="font-medium text-muted-foreground">Status:</span>
                <span
                  [class]="
                    'ml-2 px-2 py-1 rounded text-xs font-medium ' +
                    (resultEvent.status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200')
                  "
                >
                  {{ resultEvent.status }}
                </span>
              </div>
              <div>
                <span class="font-medium text-muted-foreground">Output:</span>
                <div class="mt-1 max-h-32 overflow-auto">
                  <pre
                    class="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-w-full break-all"
                    >{{ resultEvent.output }}</pre
                  >
                </div>
              </div>
            </div>
          </div>
        }

        @case ('response.output_item.added') {
          @if (getFunctionResult(event()); as result) {
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideCheckCircle2" class="h-4 w-4 text-green-500" />
                <span class="font-semibold text-sm">Function Result</span>
              </div>
              <div class="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <span class="font-medium text-muted-foreground">Call ID:</span>
                  <span class="ml-2 font-mono text-xs">{{ result.call_id }}</span>
                </div>
                <div>
                  <span class="font-medium text-muted-foreground">Status:</span>
                  <span
                    [class]="
                      'ml-2 px-2 py-1 rounded text-xs font-medium ' +
                      (result.status === 'completed'
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200')
                    "
                  >
                    {{ result.status }}
                  </span>
                </div>
                <div>
                  <span class="font-medium text-muted-foreground">Output:</span>
                  <div class="mt-1 max-h-32 overflow-auto">
                    <pre
                      class="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-w-full break-all"
                      >{{ result.output }}</pre
                    >
                  </div>
                </div>
              </div>
            </div>
          }
        }

        @case ('response.workflow_event.completed') {
          @if (hasData(event()); as data) {
            @let workflow = asWorkflow(data);
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideActivity" class="h-4 w-4 text-purple-500" />
                <span class="font-semibold text-sm">Workflow Event</span>
              </div>
              <div class="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <span class="font-medium text-muted-foreground">Event Type:</span>
                  <span class="ml-2 font-mono bg-purple-100 dark:bg-purple-900 px-2 py-1 rounded">
                    {{ workflow.event_type || 'unknown' }}
                  </span>
                </div>
                @if (workflow.executor_id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Executor:</span>
                    <span class="ml-2 font-mono">{{ workflow.executor_id }}</span>
                  </div>
                }
                @if (workflow.timestamp) {
                  <div>
                    <span class="font-medium text-muted-foreground">Timestamp:</span>
                    <span class="ml-2 font-mono text-xs">{{ workflow.timestamp }}</span>
                  </div>
                }
                @if (workflow.data) {
                  <div>
                    <span class="font-medium text-muted-foreground">Data:</span>
                    <div class="mt-1 max-h-32 overflow-auto">
                      <pre
                        class="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-w-full break-all"
                        >{{ workflow.data | jsonStringify }}</pre
                      >
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        @case ('response.trace.completed') {
          @if (hasData(event()); as data) {
            @let trace = asTrace(data);
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideSearch" class="h-4 w-4 text-orange-500" />
                <span class="font-semibold text-sm">Trace Event</span>
              </div>
              <div class="grid grid-cols-1 gap-2 text-xs">
                <div>
                  <span class="font-medium text-muted-foreground">Operation:</span>
                  <span class="ml-2 font-mono bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                    {{ trace.operation_name || 'unknown' }}
                  </span>
                </div>
                @if (trace.span_id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Span ID:</span>
                    <span class="ml-2 font-mono text-xs">{{ trace.span_id }}</span>
                  </div>
                }
                @if (trace.trace_id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Trace ID:</span>
                    <span class="ml-2 font-mono text-xs">{{ trace.trace_id }}</span>
                  </div>
                }
                @if (trace.duration_ms) {
                  <div>
                    <span class="font-medium text-muted-foreground">Duration:</span>
                    <span class="ml-2 font-mono text-xs">{{
                      formatDuration(trace.duration_ms)
                    }}</span>
                  </div>
                }
                @if (trace.status) {
                  <div>
                    <span class="font-medium text-muted-foreground">Status:</span>
                    <span
                      [class]="
                        'ml-2 px-2 py-1 rounded text-xs font-medium ' +
                        (trace.status === 'StatusCode.UNSET' || trace.status === 'OK'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200')
                      "
                    >
                      {{ trace.status || 'unknown' }}
                    </span>
                  </div>
                }
                @if (trace.entity_id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Entity:</span>
                    <span class="ml-2 font-mono text-xs">{{ trace.entity_id }}</span>
                  </div>
                }
                @if (hasKeys(trace.attributes)) {
                  <div>
                    <span class="font-medium text-muted-foreground">Attributes:</span>
                    <div class="mt-1 max-h-32 overflow-auto">
                      <pre
                        class="text-xs bg-background border rounded p-2 whitespace-pre-wrap break-all"
                      >
                        {{ trace.attributes | traceFormat }}
                      </pre
                      >
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        }

        @case ('response.output_text.delta') {
          @let deltaEvent = asDelta(event());
          @if (deltaEvent.delta) {
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideMessageSquare" class="h-4 w-4 text-gray-500" />
                <span class="font-semibold text-sm">Text Output</span>
              </div>
              <div class="max-h-32 overflow-auto">
                <pre
                  class="text-xs bg-background border rounded p-2 whitespace-pre-wrap max-w-full break-all"
                  >{{ deltaEvent.delta }}</pre
                >
              </div>
            </div>
          }
        }

        @case ('response.completed') {
          @let completed = asCompleted(event());
          @if (completed.response; as res) {
            <div class="space-y-2">
              <div class="grid grid-cols-1 gap-2 text-xs">
                @if (res.usage) {
                  <div><span class="font-medium text-muted-foreground">Usage:</span></div>
                  <div class="ml-4 space-y-1">
                    <div>
                      <span class="font-medium text-muted-foreground">Input tokens:</span>
                      <span class="ml-2 font-mono">{{ res.usage.input_tokens }}</span>
                    </div>
                    <div>
                      <span class="font-medium text-muted-foreground">Output tokens:</span>
                      <span class="ml-2 font-mono">{{ res.usage.output_tokens }}</span>
                    </div>
                    <div>
                      <span class="font-medium text-muted-foreground">Total tokens:</span>
                      <span
                        class="ml-2 font-mono bg-green-100 dark:bg-green-900 px-2 py-1 rounded"
                        >{{ res.usage.total_tokens }}</span
                      >
                    </div>
                  </div>
                }
                @if (res.id) {
                  <div>
                    <span class="font-medium text-muted-foreground">Response ID:</span>
                    <span class="ml-2 font-mono text-xs break-all">{{ res.id }}</span>
                  </div>
                }
                @if (res.model) {
                  <div>
                    <span class="font-medium text-muted-foreground">Model:</span>
                    <span class="ml-2 font-mono text-xs break-all">{{ res.model }}</span>
                  </div>
                }
              </div>
            </div>
          }
        }

        @default {
          <div class="text-xs text-muted-foreground">
            <pre class="bg-background border rounded p-2 overflow-auto max-h-32">{{
              event() | jsonStringify
            }}</pre>
          </div>
        }
      }
    }
  `,
  host: {
    class: 'block',
  },
})
export class EventExpandedContentComponent {
  event = input.required<ExtendedResponseStreamEvent>()

  hasData(e: ExtendedResponseStreamEvent): any | null {
    return e && 'data' in e ? (e as any).data : null
  }

  asError(e: any) {
    return e as ExtendedResponseStreamEvent & { message?: string; code?: string; param?: string }
  }

  asFunctionCall(data: any): FunctionCallData {
    return data as FunctionCallData
  }

  asResultEvent(e: any): ResponseFunctionResultComplete {
    return e as ResponseFunctionResultComplete
  }

  asWorkflow(data: any): WorkflowEventData {
    return data as WorkflowEventData
  }

  asTrace(data: any): TraceEventData {
    return data as TraceEventData
  }

  asDelta(e: any) {
    return e as { delta?: string }
  }

  asCompleted(e: any): ResponseCompletedEvent {
    return e as ResponseCompletedEvent
  }

  getFunctionResult(e: any) {
    const item = e?.item
    return item?.type === 'function_call' || item?.type === 'function_result' ? item : null
  }

  formatDuration(ms: number | string): string {
    return Number(ms).toFixed(2) + 'ms'
  }

  hasKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0
  }
}

@Component({
  selector: 'app-event-item',
  standalone: true,
  imports: [NgClass, NgIconComponent, BadgeComponent, EventExpandedContentComponent],
  template: `
    <div class="border-l-2 border-muted pl-3 py-2 hover:bg-muted/50 transition-colors">
      <div class="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <ng-icon [name]="Icon()" class="h-3 w-3" [ngClass]="colorClass()" />
        <span class="font-mono">{{ timestamp() }}</span>
        <app-badge variant="outline" class="text-xs py-0">
          {{ streamEvent().type ? streamEvent().type.replace('response.', '') : 'unknown' }}
        </app-badge>
      </div>

      <div class="text-sm">
        <div
          class="flex items-center gap-2"
          [class.cursor-pointer]="hasExpandableContent()"
          (click)="hasExpandableContent() && isExpanded.set(!isExpanded())"
        >
          @if (hasExpandableContent()) {
            <div class="text-muted-foreground">
              @if (isExpanded()) {
                <ng-icon name="lucideChevronDown" class="h-3 w-3" />
              } @else {
                <ng-icon name="lucideChevronRight" class="h-3 w-3" />
              }
            </div>
          }

          <div class="text-muted-foreground flex-1">
            {{
              hasExpandableContent() && summary().length > 80
                ? summary().slice(0, 80) + '...'
                : summary()
            }}
          </div>
        </div>

        @if (isExpanded() && hasExpandableContent()) {
          <div class="mt-2 ml-5 p-3 bg-muted/30 rounded border">
            <app-event-expanded-content [event]="streamEvent()" />
          </div>
        }
      </div>
    </div>
  `,
})
export class EventItemComponent {
  streamEvent = input.required<ExtendedResponseStreamEvent>({ alias: 'event' })
  eventType = computed(() => {
    const data = this.streamEvent()
    return data.type || 'unknown'
  })
  isExpanded = signal(false)
  Icon = computed(() => getEventIconName(this.eventType()))
  colorClass = computed(() => getEventColor(this.eventType()))

  // Use stored UI timestamp if available, otherwise compute from event data
  timestamp = computed(() => {
    const data = this.streamEvent()
    return '_uiTimestamp' in data && typeof data._uiTimestamp === 'number'
      ? new Date(data._uiTimestamp * 1000).toLocaleTimeString()
      : new Date().toLocaleTimeString()
  })

  summary = computed(() => {
    const data = this.streamEvent()
    return getEventSummary(data)
  })

  // Determine if this event has expandable content
  hasExpandableContent = computed(() => {
    const data = this.streamEvent()
    return (
      (data.type === 'response.function_call.complete' && 'data' in data && data.data) ||
      data.type === 'response.function_result.complete' ||
      (data.type === 'response.output_item.added' && getFunctionResultFromEvent(data) !== null) ||
      (data.type === 'response.workflow_event.completed' && 'data' in data && data.data) ||
      (data.type === 'response.trace.completed' && 'data' in data && data.data) ||
      (data.type === 'response.trace.completed' && 'data' in data && data.data) ||
      (data.type === 'response.output_text.delta' &&
        'delta' in data &&
        data.delta &&
        data.delta.length > 100) ||
      (data.type === 'response.completed' && 'response' in data && data.response) ||
      // Make error events expandable to show full error details
      data.type === 'error'
    )
  })
}

@Component({
  selector: 'app-events-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgIconComponent,
    BadgeComponent,
    MessageSeparatorComponent,
    EventItemComponent,
    ScrollAreaComponent,
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex items-center justify-between p-3 border-b">
        <div class="flex items-center gap-2">
          <ng-icon name="lucideActivity" class="h-4 w-4" />
          <span class="font-medium">Events</span>
          <app-badge variant="outline">
            {{ processedEvents().length }}
            @if (events().length > processedEvents().length) {
              ({{ events().length }} raw)
            }
          </app-badge>
        </div>

        @if (isStreaming()) {
          <div class="flex items-center gap-1 text-xs text-muted-foreground">
            <div class="h-2 w-2 animate-pulse rounded-full bg-green-500 dark:bg-green-400"></div>
            Streaming
          </div>
        }
      </div>

      <app-scroll-area #scrollRef class="flex-1">
        <div class="p-3">
          @if (processedEvents().length === 0) {
            <div class="text-center text-muted-foreground text-sm py-8">
              @if (events().length === 0) {
                No events yet. Start a conversation to see real-time events.
              } @else {
                Processing events... Accumulated events will appear here.
              }
            </div>
          } @else {
            <div class="space-y-2">
              @for (event of reversedEvents(); track isSeparator(event) ? event.id : $index) {
                @if (isSeparator(event)) {
                  <app-message-separator />
                } @else {
                  <app-event-item [event]="event" />
                }
              }
            </div>
          }
        </div>
      </app-scroll-area>
    </div>
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }
  `,
})
export class EventsTabComponent {
  /**
   * Inputs using Signal API
   */
  events = input.required<ExtendedResponseStreamEvent[]>()
  isStreaming = input<boolean>(false)

  /**
   * ViewChild for the scroll area using Signal API
   */
  scrollRef = viewChild<ElementRef<HTMLDivElement>>('scrollRef')

  processedEvents = computed(() => {
    return processEventsForDisplay(this.events())
  })

  eventsWithSeparators = computed(() => {
    return addSeparatorsToEvents(this.processedEvents())
  })

  reversedEvents = computed(() => {
    return [...this.eventsWithSeparators()].reverse()
  })

  isSeparator(event: any): event is { type: 'separator'; id: string } {
    return event && (event as any).type === 'separator'
  }
}

@Component({
  selector: 'app-trace-tree-node',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div class="relative">
      @if (depth() > 0) {
        <div
          class="absolute left-0 top-0 bottom-0 border-l-2 border-muted"
          [style.marginLeft.px]="(depth() - 1) * 16 + 8"
        ></div>
      }

      <div
        class="flex items-center gap-2 py-1.5 hover:bg-muted/50 rounded transition-colors"
        [style.paddingLeft.px]="depth() * 16"
      >
        <button
          (click)="toggle()"
          class="w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground border-none bg-transparent cursor-pointer"
        >
          @if (hasChildren()) {
            <ng-icon
              [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
              class="text-[12px]"
            />
          } @else {
            <ng-icon
              [name]="showDetails() ? 'lucideChevronDown' : 'lucideChevronRight'"
              class="text-[12px]"
            />
          }
        </button>

        <span [class]="'text-xs px-1.5 py-0.5 rounded font-medium ' + operationColor()">
          {{ processedOperationName() }}
        </span>

        @if (duration()) {
          <span class="text-xs text-muted-foreground font-mono">
            {{ duration() }}
          </span>
        }

        @if (hasTokens()) {
          <span class="text-xs text-muted-foreground font-mono">
            @if (inputTokens() !== undefined) {
              <span>↑{{ inputTokens() }}</span>
            }
            @if (inputTokens() !== undefined && outputTokens() !== undefined) {
              <span class="mx-0.5">/</span>
            }
            @if (outputTokens() !== undefined) {
              <span>↓{{ outputTokens() }}</span>
            }
          </span>
        }
      </div>

      @if (showDetails() && !hasChildren()) {
        <div
          class="mt-1 mb-2 p-2 bg-muted/30 rounded border text-xs"
          [style.marginLeft.px]="depth() * 16 + 20"
        >
          <div class="space-y-1">
            @if (node().data.span_id; as spanId) {
              <div class="flex gap-2">
                <span class="text-muted-foreground w-20">Span ID:</span>
                <span class="font-mono text-xs break-all">{{ spanId }}</span>
              </div>
            }
            @if (node().data.trace_id; as traceId) {
              <div class="flex gap-2">
                <span class="text-muted-foreground w-20">Trace ID:</span>
                <span class="font-mono text-xs break-all">{{ traceId }}</span>
              </div>
            }
            @if (node().data.status; as status) {
              <div class="flex gap-2">
                <span class="text-muted-foreground w-20">Status:</span>
                <span [class]="statusClass()">
                  {{ status }}
                </span>
              </div>
            }
            @if (hasAttributes()) {
              <div class="mt-2">
                <span class="text-muted-foreground block mb-1">Attributes:</span>
                <pre
                  class="text-xs bg-background border rounded p-2 overflow-auto max-h-32 whitespace-pre-wrap break-all"
                  >{{ formattedAttributes() }}</pre
                >
              </div>
            }
          </div>
        </div>
      }

      @if (hasChildren() && isExpanded()) {
        <div>
          @for (child of node().children; track child.data.span_id || $index) {
            <app-trace-tree-node [node]="child" [depth]="depth() + 1" />
          }
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TraceTreeNodeComponent {
  node = input.required<TraceNode>()
  depth = input<number>(0)

  isExpanded = signal<boolean>(false)
  showDetails = signal<boolean>(false)

  constructor() {
    const initialExpanded = this.depth() < 2
    this.isExpanded.set(initialExpanded)
  }

  hasChildren = computed(() => (this.node().children?.length ?? 0) > 0)

  processedOperationName = computed(() => {
    const name = this.node().data.operation_name || 'Unknown'
    return name.replace('Agent.', '').replace('invoke_agent ', '')
  })

  operationColor = computed(() => getOperationColor(this.node().data.operation_name || 'Unknown'))

  duration = computed(() => {
    const ms = this.node().data.duration_ms
    return ms ? `${Number(ms).toFixed(1)}ms` : ''
  })

  inputTokens = computed(() => this.node().data.attributes?.['gen_ai.usage.input_tokens'])
  outputTokens = computed(() => this.node().data.attributes?.['gen_ai.usage.output_tokens'])

  hasTokens = computed(() => this.inputTokens() !== undefined || this.outputTokens() !== undefined)

  hasAttributes = computed(() => {
    const attrs = this.node().data.attributes
    return attrs && Object.keys(attrs).length > 0
  })

  formattedAttributes = computed(() => formatTraceAttributes(this.node().data.attributes ?? {}))

  statusClass = computed(() => {
    const status = this.node().data.status
    const isOk = status === 'StatusCode.UNSET' || status === 'OK'
    return isOk
      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-1.5 py-0.5 rounded text-xs'
      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-1.5 py-0.5 rounded text-xs'
  })

  toggle() {
    if (this.hasChildren()) {
      this.isExpanded.update((v) => !v)
    } else {
      this.showDetails.update((v) => !v)
    }
  }
}

@Component({
  selector: 'app-trace-group-item',
  standalone: true,
  imports: [NgIconComponent, BadgeComponent, TraceTreeNodeComponent],
  template: `
    <div class="border rounded-lg overflow-hidden">
      <div
        class="flex items-center gap-2 p-2 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors"
        (click)="toggleExpand()"
      >
        <div class="text-muted-foreground">
          @if (isExpanded()) {
            <ng-icon name="lucideChevronDown" class="h-4 w-4" />
          } @else {
            <ng-icon name="lucideChevronRight" class="h-4 w-4" />
          }
        </div>

        <span class="font-mono text-xs text-muted-foreground">
          {{ formattedTimestamp() }}
        </span>

        @if (displayEntityId(); as entityId) {
          <app-badge variant="outline" class="text-xs py-0">
            {{ entityId }}
          </app-badge>
        }

        <div class="flex-1"></div>

        @if (formattedDuration(); as duration) {
          <app-badge variant="secondary" class="text-xs py-0">
            {{ duration }}
          </app-badge>
        }

        <span class="text-xs text-muted-foreground">
          {{ spanCount() }} span{{ spanCount() !== 1 ? 's' : '' }}
        </span>
      </div>

      @if (isExpanded()) {
        <div class="p-2 border-t">
          @for (node of group().traces; track node.data.span_id || $index) {
            <app-trace-tree-node [node]="node" [depth]="0" />
          }
        </div>
      }
    </div>
  `,
  host: {
    '[class.block]': 'true',
  },
})
export class TraceGroupItemComponent {
  group = input.required<TraceGroup>()

  isExpanded = signal(true)
  formattedTimestamp = computed(() => {
    return new Date(this.group().timestamp * 1000).toLocaleTimeString()
  })

  displayEntityId = computed(() => {
    const id = this.group().entity_id
    if (!id) return null
    return id.replace('agent_', '').replace('workflow_', '')
  })

  formattedDuration = computed(() => {
    const duration = this.group().totalDuration
    return duration > 0 ? `${duration.toFixed(0)}ms` : ''
  })

  spanCount = computed(() => {
    const countNode = (n: TraceNode): number => {
      return 1 + n.children.reduce((c, child) => c + countNode(child), 0)
    }
    return this.group().traces.reduce((count, node) => count + countNode(node), 0)
  })

  toggleExpand() {
    this.isExpanded.update((v) => !v)
  }
}
@Component({
  selector: 'app-traces-tab',
  standalone: true,
  imports: [
    NgClass,
    NgIconComponent,
    BadgeComponent,
    ScrollAreaComponent,
    TraceGroupItemComponent,
    ContextInspectorComponent,
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex items-center gap-2 p-3 border-b">
        <ng-icon name="lucideSearch" class="h-4 w-4" />
        <span class="font-medium">Traces</span>
        <app-badge variant="outline">{{ traceEvents().length }}</app-badge>

        <div class="flex-1"></div>
        <div class="flex items-center bg-muted rounded-md p-1 min-w-0">
          <button
            type="button"
            (click)="setSubTab('spans')"
            [ngClass]="{
              'bg-background shadow-sm font-medium': subTab() === 'spans',
              'text-muted-foreground hover:text-foreground': subTab() !== 'spans',
            }"
            class="px-3 py-1.5 text-xs rounded transition-colors truncate"
          >
            OTel Spans
          </button>
          <button
            type="button"
            (click)="setSubTab('context')"
            [ngClass]="{
              'bg-background shadow-sm font-medium': subTab() === 'context',
              'text-muted-foreground hover:text-foreground': subTab() !== 'context',
            }"
            class="px-3 py-1.5 text-xs rounded transition-colors flex items-center gap-1.5 min-w-0"
          >
            <ng-icon name="lucideBarChart3" class="h-3.5 w-3.5 shrink-0" />
            <span class="truncate">Context Inspector</span>
          </button>
        </div>
      </div>

      @if (subTab() === 'spans') {
        <div class="flex-1 flex flex-col min-h-0">
          @if (traceEvents().length > 0) {
            <div class="p-3 border-b shrink-0">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideSearch" class="h-4 w-4" />
                <span class="font-medium text-sm">OTel Spans</span>
                <app-badge variant="outline" class="text-xs">
                  {{ traceGroups().length }} turn{{ traceGroups().length !== 1 ? 's' : '' }}
                </app-badge>
              </div>
            </div>
          }

          @if (traceEvents().length === 0) {
            <div class="flex flex-col items-center text-center p-6 pt-9">
              <ng-icon name="lucideBarChart3" class="h-8 w-8 text-muted-foreground mb-3" />
              <div class="text-sm font-medium mb-1">No Data</div>
              <div class="text-xs text-muted-foreground max-w-50">
                Run
                <span class="font-mono bg-accent/10 px-1 rounded"> devui --instrumentation </span>
                and start a conversation.
              </div>
            </div>
          } @else {
            <app-scroll-area class="flex-1">
              <div class="p-3">
                <div class="space-y-3">
                  @for (group of traceGroups(); track group.response_id) {
                    <app-trace-group-item [group]="group" />
                  }
                </div>
              </div>
            </app-scroll-area>
          }
        </div>
      } @else {
        <app-context-inspector [events]="events()" />
      }
    </div>
  `,
})
export class TracesTabComponent {
  // --- Signals ---
  events = input.required<ExtendedResponseStreamEvent[]>()

  // --- Store ---
  private store = inject(DevUIStore)

  // --- Computed ---
  subTab = computed(() => this.store.debugTraceSubTab)

  traceEvents = computed(() => this.events().filter((e) => e.type === 'response.trace.completed'))

  traceGroups = computed(() => buildTraceHierarchy(this.traceEvents()))

  // --- Actions ---
  setSubTab(tab: 'spans' | 'context') {
    this.store.setDebugTraceSubTab(tab)
  }
}

@Component({
  selector: 'app-tool-event-item',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    @if (shouldRender()) {
      <div class="border rounded p-3">
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <ng-icon name="lucideZap" class="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            <span class="font-medium text-sm">
              {{ isFunctionCall() ? 'Tool Call' : 'Tool Result' }}
            </span>
            @if (isFunctionCall() && callData()?.['name']) {
              <span class="text-xs text-muted-foreground"> ({{ callData()?.['name'] }}) </span>
            }
          </div>
          <span class="text-xs text-muted-foreground font-mono">
            {{ timestamp() }}
          </span>
        </div>

        @if (isFunctionCall() && callData(); as data) {
          <div
            class="p-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded"
          >
            <div class="flex items-center gap-2 mb-2">
              <ng-icon name="lucideWrench" class="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span
                class="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded"
              >
                CALL
              </span>
              <span class="font-medium text-sm">
                {{ data['name'] || 'unknown' }}
              </span>
            </div>

            @if (data['arguments'] !== undefined) {
              <div class="text-xs">
                <span class="text-muted-foreground mb-1 block"> Arguments: </span>
                <pre
                  class="p-2 bg-background border rounded text-xs overflow-auto max-h-32 max-w-full break-all whitespace-pre-wrap"
                  >{{ formattedArguments() }}</pre
                >
              </div>
            }
          </div>
        }

        @if (isFunctionResult() && resultData(); as result) {
          <div
            class="p-2 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded"
          >
            <div class="flex items-center gap-2 mb-2">
              <ng-icon
                name="lucideCheckCircle2"
                class="h-3 w-3 text-green-600 dark:text-green-400"
              />
              <span
                class="text-xs font-mono bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded"
              >
                RESULT
              </span>
              @if (result.status !== 'completed') {
                <span
                  class="ml-auto px-2 py-1 rounded text-xs font-medium bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                >
                  {{ result.status }}
                </span>
              }
            </div>

            <div class="text-xs space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-muted-foreground">Call ID:</span>
                <span class="font-mono text-xs break-all">
                  {{ result.call_id }}
                </span>
              </div>
              <div>
                <span class="text-muted-foreground block mb-1">Output:</span>
                <pre
                  class="p-2 bg-background border rounded text-xs overflow-auto max-h-32 break-all whitespace-pre-wrap"
                  >{{ result.output }}</pre
                >
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class ToolEventItemComponent {
  // Input Signal
  event = input.required<ExtendedResponseStreamEvent>()

  // Computed Values
  timestamp = computed(() => {
    const e = this.event()
    if ('_uiTimestamp' in e && typeof e._uiTimestamp === 'number') {
      return new Date(e._uiTimestamp * 1000).toLocaleTimeString()
    }
    return new Date().toLocaleTimeString()
  })

  isFunctionCall = computed(() => this.event().type === 'response.function_call.complete')

  resultData = computed(() => getFunctionResultFromEvent(this.event()))

  isFunctionResult = computed(() => this.resultData() !== null)

  shouldRender = computed(() => this.isFunctionCall() || this.isFunctionResult())

  callData = computed(() => {
    const e = this.event()
    return this.isFunctionCall() && 'data' in e ? (e.data as EventDataBase) : null
  })

  formattedArguments = computed(() => {
    const args = this.callData()?.['arguments']
    if (args === undefined) return ''
    return typeof args === 'string' ? args : JSON.stringify(args, null, 1)
  })
}

@Component({
  selector: 'app-tools-tab',
  standalone: true,
  imports: [
    NgIconComponent,
    ScrollAreaComponent,
    BadgeComponent,
    MessageSeparatorComponent,
    ToolEventItemComponent,
  ],
  template: `
    <div class="h-full flex flex-col">
      <div class="flex items-center gap-2 p-3 border-b">
        <ng-icon name="lucideWrench" class="h-4 w-4" />
        <span class="font-medium">Tools</span>
        <app-badge variant="outline">{{ toolEventsCount() }}</app-badge>
      </div>

      <app-scroll-area class="flex-1">
        <div class="p-3">
          @if (reversedToolEvents().length === 0) {
            <div class="text-center text-muted-foreground text-sm py-8">
              No tool executions yet. Tool calls will appear here during conversations.
            </div>
          } @else {
            <div class="space-y-3">
              @for (event of reversedToolEvents(); track $index) {
                @if (isSeparator(event)) {
                  <app-message-separator />
                } @else {
                  <app-tool-event-item [event]="event" />
                }
              }
            </div>
          }
        </div>
      </app-scroll-area>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolsTabComponent {
  events = input.required<ExtendedResponseStreamEvent[]>()

  private processedToolData = computed(() => {
    const rawEvents = this.events()
    const processedEvents = processEventsForDisplay(rawEvents)

    const toolEvents: (ExtendedResponseStreamEvent | { type: 'separator'; id: string })[] = []

    const functionCalls = processedEvents.filter(
      (event) => event.type === 'response.function_call.complete',
    )

    const functionResults = rawEvents.filter((event) => getFunctionResultFromEvent(event) !== null)

    const resultsByCallId = new Map<string, ExtendedResponseStreamEvent>()
    functionResults.forEach((result) => {
      const resultData = getFunctionResultFromEvent(result)
      if (resultData) {
        resultsByCallId.set(String(resultData.call_id), result)
      }
    })

    const pairedEvents: ExtendedResponseStreamEvent[] = []

    functionCalls.forEach((call) => {
      pairedEvents.push(call)

      const data = (call as any).data as EventDataBase | undefined
      if (data?.call_id) {
        const callId = String(data.call_id)
        const matchingResult = resultsByCallId.get(callId)
        if (matchingResult) {
          pairedEvents.push(matchingResult)
          resultsByCallId.delete(callId)
        }
      }
    })

    resultsByCallId.forEach((result) => {
      pairedEvents.push(result)
    })

    return addSeparatorsToEvents(pairedEvents)
  })

  reversedToolEvents = computed(() => [...this.processedToolData()].reverse())

  toolEventsCount = computed(
    () => this.processedToolData().filter((e) => (e as any).type !== 'separator').length,
  )

  isSeparator(event: any): event is { type: 'separator'; id: string } {
    return event && event.type === 'separator'
  }
}
@Component({
  selector: 'app-debug-panel',
  standalone: true,
  host: {
    class: 'flex-1 border-l flex flex-col min-h-0',
  },
  imports: [
    NgIconComponent,
    TabsComponent,
    TabsListComponent,
    TabsTriggerComponent,
    TabsContentComponent,
    ButtonComponent,
    EventsTabComponent,
    TracesTabComponent,
    ToolsTabComponent,
  ],
  template: `
    <app-tabs
      [value]="activeTab()"
      (valueChange)="setActiveTab($any($event))"
      class="flex-1 flex flex-col min-h-0"
    >
      <div class="px-3 pt-3 flex items-center gap-2 shrink-0">
        <app-tabs-list class="flex-1">
          <button tabsTrigger value="events" class="flex-1 gap-1.5">
            Events
            @if (counts().eventsCount > 0) {
              <span
                class="text-[10px] bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full min-w-5 text-center"
              >
                {{ counts().eventsCount }}
              </span>
            }
          </button>

          <button tabsTrigger value="traces" class="flex-1 gap-1.5">
            Traces
            @if (counts().tracesCount > 0) {
              <span
                class="text-[10px] bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full min-w-5 text-center"
              >
                {{ counts().tracesCount }}
              </span>
            }
          </button>

          <button tabsTrigger value="tools" class="flex-1 gap-1.5">
            Tools
            @if (counts().toolsCount > 0) {
              <span
                class="text-[10px] bg-muted-foreground/20 text-muted-foreground px-1.5 py-0.5 rounded-full min-w-5 text-center"
              >
                {{ counts().toolsCount }}
              </span>
            }
          </button>
        </app-tabs-list>

        @if (canMinimize()) {
          <button
            appButton="ghost"
            size="sm"
            (click)="onMinimize.emit()"
            class="h-8 w-8 p-0 shrink-0"
            title="Minimize debug panel"
          >
            <ng-icon name="lucideChevronRight" class="h-4 w-4" />
          </button>
        }
      </div>

      <app-tabs-content value="events" class="flex-1 mt-0 overflow-hidden">
        <app-events-tab [events]="events()" [isStreaming]="isStreaming()" />
      </app-tabs-content>

      <app-tabs-content value="traces" class="flex-1 mt-0 overflow-hidden">
        <app-traces-tab [events]="events()" />
      </app-tabs-content>

      <app-tabs-content value="tools" class="flex-1 mt-0 overflow-hidden">
        <app-tools-tab [events]="events()" />
      </app-tabs-content>
    </app-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebugPanelComponent {
  // --- Signal Inputs ---
  events = input.required<any[]>()
  isStreaming = input(false)
  canMinimize = input(false)

  // --- Signal Outputs ---
  onMinimize = output<void>()

  // --- Store & Logic ---
  private store = inject(DevUIStore)

  activeTab = computed(() => this.store.debugPanelTab)

  setActiveTab(v: 'events' | 'traces' | 'tools') {
    this.store.setDebugPanelTab(v)
  }

  // --- Computed (Replacement for useMemo) ---
  counts = computed(() => {
    const rawEvents = this.events()
    const processedEvents = processEventsForDisplay(rawEvents)

    const eventsCount = processedEvents.length
    const tracesCount = rawEvents.filter((e) => e.type === 'response.trace.completed').length
    const toolsCount =
      processedEvents.filter((e) => e.type === 'response.function_call.complete').length +
      rawEvents.filter((e) => getFunctionResultFromEvent(e) !== null).length

    return { eventsCount, tracesCount, toolsCount }
  })
}
