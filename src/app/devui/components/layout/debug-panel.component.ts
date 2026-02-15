import {
  Component,
  computed,
  contentChild,
  input,
  TemplateRef,
  signal,
  ChangeDetectionStrategy,
  ViewEncapsulation,
  inject,
  Pipe,
  PipeTransform,
} from '@angular/core'
import { NgTemplateOutlet, NgClass } from '@angular/common'
import {
  TabsComponent,
  TabsContentComponent,
  TabsListComponent,
  TabsTriggerComponent,
} from '../ui/tab.component'
import { BadgeComponent } from '../ui/badge.component'
import { ButtonComponent } from '../ui/button.component'
import { ScrollAreaComponent, ScrollBarComponent } from '../ui/scroll-area.component'
import {
  TraceAttributes,
  TypedTraceAttributes,
  TraceMessage,
  parseTraceMessages,
  isTextPart,
  isToolCallPart,
  isToolResultPart,
} from '../../types/openai'

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

interface DebugPanelProps {
  events: ExtendedResponseStreamEvent[]
  isStreaming?: boolean
  onMinimize?: () => void
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
export class EventExpandedContent {
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
