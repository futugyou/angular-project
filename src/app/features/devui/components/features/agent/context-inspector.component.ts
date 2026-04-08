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
} from '@angular/core'
import { NgTemplateOutlet, NgClass } from '@angular/common'
import { TooltipDirective, TooltipContent } from '@shared/ui/tooltip.component'
import { BadgeComponent } from '@src/app/shared/ui/badge'
import { CheckboxComponent } from '@shared/ui/checkbox'
import { ScrollAreaComponent } from '@shared/ui/scroll-area.component'
import {
  TraceAttributes,
  type TypedTraceAttributes,
  type TraceMessage,
  parseTraceMessages,
  isTextPart,
  isToolCallPart,
  isToolResultPart,
} from '../../../types/openai'

import type { ExtendedResponseStreamEvent } from '../../../types'
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../../stores'

const SEGMENT_COLORS = {
  // Token segments
  input: 'bg-blue-500 dark:bg-blue-600',
  output: 'bg-emerald-500 dark:bg-emerald-600',
  // Composition segments
  system: 'bg-purple-500 dark:bg-purple-600',
  user: 'bg-blue-500 dark:bg-blue-600',
  assistant: 'bg-emerald-500 dark:bg-emerald-600',
  toolCalls: 'bg-amber-500 dark:bg-amber-600',
  toolResults: 'bg-orange-500 dark:bg-orange-600',
} as const

// Trace data interface matching debug-panel types
interface TraceEventData {
  operation_name?: string
  duration_ms?: number
  status?: string
  attributes?: TypedTraceAttributes
  span_id?: string
  trace_id?: string
  parent_span_id?: string | null
  start_time?: number
  end_time?: number
  entity_id?: string
  response_id?: string | null
}

// Context composition breakdown
interface ContextComposition {
  system: number // character count
  user: number
  assistant: number
  toolCalls: number // function definitions + arguments
  toolResults: number // function outputs
  total: number
}

// Turn data extracted from traces
interface TurnData {
  response_id: string
  timestamp: number
  input_tokens: number
  output_tokens: number
  total_tokens: number
  model?: string
  entity_id?: string
  duration_ms: number
  composition: ContextComposition
}

// Props for the component
interface ContextInspectorProps {
  events: ExtendedResponseStreamEvent[]
}

// Parse message content to extract composition using typed TraceMessage format
function parseComposition(messagesJson: string | unknown): ContextComposition {
  const composition: ContextComposition = {
    system: 0,
    user: 0,
    assistant: 0,
    toolCalls: 0,
    toolResults: 0,
    total: 0,
  }

  try {
    // Use the typed parser for string input
    let messages: TraceMessage[]

    if (typeof messagesJson === 'string') {
      messages = parseTraceMessages(messagesJson)
    } else if (Array.isArray(messagesJson)) {
      messages = messagesJson as TraceMessage[]
    } else {
      return composition
    }

    for (const message of messages) {
      if (!message || typeof message !== 'object') continue

      const role = message.role
      const parts = message.parts

      // Calculate character count for this message
      let charCount = 0

      // Handle parts array (Agent Framework format)
      // Using type guards for type-safe access to part properties
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (!part || typeof part !== 'object') continue

          if (isTextPart(part)) {
            // Text content can be in either 'content' or 'text' field
            const text = part.content || part.text || ''
            charCount += text.length
          } else if (isToolCallPart(part)) {
            // Tool call includes name and arguments
            const name = part.name || ''
            const args = part.arguments || ''
            composition.toolCalls += name.length + args.length
          } else if (isToolResultPart(part)) {
            // Tool result - check both 'result' and 'response' fields
            const result = part.result || part.response || ''
            composition.toolResults += result.length
          }
        }
      }

      // Categorize by role
      if (role === 'system') {
        composition.system += charCount
      } else if (role === 'user') {
        composition.user += charCount
      } else if (role === 'assistant') {
        composition.assistant += charCount
      } else if (role === 'tool') {
        composition.toolResults += charCount
      }
    }

    composition.total =
      composition.system +
      composition.user +
      composition.assistant +
      composition.toolCalls +
      composition.toolResults
  } catch {
    // Parsing failed, return empty composition
  }

  return composition
}

// Extract turn data from trace events
function extractTurnData(events: ExtendedResponseStreamEvent[]): TurnData[] {
  const traceEvents = events.filter((e) => e.type === 'response.trace.completed')

  // Group by response_id
  const byResponseId = new Map<string, TraceEventData[]>()

  for (const event of traceEvents) {
    if (!('data' in event)) continue
    const data = event.data as TraceEventData
    const responseId = data.response_id || 'unknown'

    if (!byResponseId.has(responseId)) {
      byResponseId.set(responseId, [])
    }
    byResponseId.get(responseId)!.push(data)
  }

  const turns: TurnData[] = []

  for (const [responseId, traces] of byResponseId) {
    let inputTokens = 0
    let outputTokens = 0
    let model: string | undefined
    let timestamp = Date.now() / 1000
    let entity_id: string | undefined
    let totalDuration = 0
    let composition: ContextComposition = {
      system: 0,
      user: 0,
      assistant: 0,
      toolCalls: 0,
      toolResults: 0,
      total: 0,
    }

    for (const trace of traces) {
      const attrs = trace.attributes || {}

      // Get token counts using typed attribute keys
      const traceInput = attrs[TraceAttributes.INPUT_TOKENS]
      const traceOutput = attrs[TraceAttributes.OUTPUT_TOKENS]

      if (traceInput !== undefined) {
        inputTokens += Number(traceInput)
      }
      if (traceOutput !== undefined) {
        outputTokens += Number(traceOutput)
      }

      // Get model using typed attribute key
      if (attrs[TraceAttributes.MODEL]) {
        model = String(attrs[TraceAttributes.MODEL])
      }

      // Get timestamp
      if (trace.start_time && trace.start_time < timestamp) {
        timestamp = trace.start_time
      }

      // Get entity_id
      if (trace.entity_id) {
        entity_id = trace.entity_id
      }

      // Sum durations
      if (trace.duration_ms) {
        totalDuration += Number(trace.duration_ms)
      }

      // Parse composition from input messages using typed attribute key
      const inputMessages = attrs[TraceAttributes.INPUT_MESSAGES]
      if (inputMessages && composition.total === 0) {
        composition = parseComposition(inputMessages)
      }

      // Also check for system instructions using typed attribute key
      const systemInstructions = attrs[TraceAttributes.SYSTEM_INSTRUCTIONS]
      if (
        systemInstructions &&
        typeof systemInstructions === 'string' &&
        composition.system === 0
      ) {
        composition.system = systemInstructions.length
        composition.total += systemInstructions.length
      }
    }

    // Only include turns that have token data
    if (inputTokens > 0 || outputTokens > 0) {
      turns.push({
        response_id: responseId,
        timestamp,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        model,
        entity_id,
        duration_ms: totalDuration,
        composition,
      })
    }
  }

  // Sort by timestamp (oldest first)
  turns.sort((a, b) => a.timestamp - b.timestamp)

  return turns
}

// Calculate summary stats
function calculateStats(turns: TurnData[]) {
  if (turns.length === 0) {
    return {
      totalInput: 0,
      totalOutput: 0,
      totalTokens: 0,
      avgInput: 0,
      avgOutput: 0,
      avgTotal: 0,
      peakInput: 0,
      peakOutput: 0,
      peakTotal: 0,
      turnCount: 0,
    }
  }

  const totalInput = turns.reduce((sum, t) => sum + t.input_tokens, 0)
  const totalOutput = turns.reduce((sum, t) => sum + t.output_tokens, 0)
  const totalTokens = totalInput + totalOutput

  const peakInput = Math.max(...turns.map((t) => t.input_tokens))
  const peakOutput = Math.max(...turns.map((t) => t.output_tokens))
  const peakTotal = Math.max(...turns.map((t) => t.total_tokens))

  return {
    totalInput,
    totalOutput,
    totalTokens,
    avgInput: Math.round(totalInput / turns.length),
    avgOutput: Math.round(totalOutput / turns.length),
    avgTotal: Math.round(totalTokens / turns.length),
    peakInput,
    peakOutput,
    peakTotal,
    turnCount: turns.length,
  }
}

// Aggregate composition across all turns
function aggregateComposition(turns: TurnData[]): ContextComposition {
  return turns.reduce(
    (acc, turn) => ({
      system: acc.system + turn.composition.system,
      user: acc.user + turn.composition.user,
      assistant: acc.assistant + turn.composition.assistant,
      toolCalls: acc.toolCalls + turn.composition.toolCalls,
      toolResults: acc.toolResults + turn.composition.toolResults,
      total: acc.total + turn.composition.total,
    }),
    { system: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, total: 0 },
  )
}

// Color constants - single source of truth for all visualizations

function formatTokenCount(n: number): string {
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`
  }
  return String(n)
}

// Helper to create token segments (input/output)
function createTokenSegments(input: number, output: number): BarSegment[] {
  return [
    { key: 'input', value: input, color: SEGMENT_COLORS.input, label: 'Input' },
    { key: 'output', value: output, color: SEGMENT_COLORS.output, label: 'Output' },
  ]
}

// Helper to create composition segments
function createCompositionSegments(composition: ContextComposition): BarSegment[] {
  return [
    { key: 'system', value: composition.system, color: SEGMENT_COLORS.system, label: 'System' },
    { key: 'user', value: composition.user, color: SEGMENT_COLORS.user, label: 'User' },
    {
      key: 'assistant',
      value: composition.assistant,
      color: SEGMENT_COLORS.assistant,
      label: 'Assistant',
    },
    {
      key: 'toolCalls',
      value: composition.toolCalls,
      color: SEGMENT_COLORS.toolCalls,
      label: 'Tool Calls',
    },
    {
      key: 'toolResults',
      value: composition.toolResults,
      color: SEGMENT_COLORS.toolResults,
      label: 'Tool Results',
    },
  ]
}

export interface BarSegment {
  key: string
  value: number
  color: string
  label: string
}

@Component({
  selector: 'app-segmented-bar',
  standalone: true,
  imports: [NgTemplateOutlet, TooltipDirective, TooltipContent],
  template: `
    <div style="display: flex; align-items: center; gap: 0.5rem; width: 100%;">
      <div
        class="relative rounded overflow-hidden flex-1"
        style="position: relative; border-radius: 0.25rem; overflow: hidden; flex: 1 1 0%; background-color: rgba(120, 120, 120, 0.1);"
        [style.height.px]="height()"
      >
        @if (total() > 0) {
          <div
            style="display: flex; height: 100%; transition: all 300ms;"
            [style.width.%]="widthPercent()"
          >
            @for (seg of segmentsWithMeta(); track seg.key) {
              <div
                [appTooltip]="segTooltip"
                class="segment-item"
                [class]="seg.color"
                [style.width.%]="(seg.value / total()) * 100"
                style="height: 100%; transition: all 150ms; cursor: default; transform-origin: bottom;"
              >
                <app-tooltip-content #segTooltip>
                  <div style="display: flex; align-items: center; gap: 0.375rem; font-size: 12px;">
                    <div
                      style="width: 0.5rem; height: 0.5rem; border-radius: 0.125rem; flex-shrink: 0;"
                      [class]="seg.color"
                    ></div>
                    <span style="font-weight: 500;">{{ seg.label }}</span>
                    <span style="opacity: 0.8;">
                      {{ format(seg.value) }} ({{ seg.percent }}%)
                    </span>
                  </div>
                </app-tooltip-content>
              </div>
            }
          </div>
        } @else {
          <div
            style="width: 100%; height: 100%; border-radius: 0.25rem; background-color: rgba(120, 120, 120, 0.05);"
          ></div>
        }
      </div>

      @if (labelTemplate()) {
        <ng-container
          [ngTemplateOutlet]="labelTemplate()!"
          [ngTemplateOutletContext]="{ $implicit: total(), segments: segments() }"
        />
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .segment-item:hover {
      filter: brightness(1.1);
      transform: scaleY(1.15);
    }
  `,
})
export class SegmentedBarComponent {
  segments = input.required<BarSegment[]>()
  maxValue = input.required<number>()
  height = input<number>(20)

  labelTemplate = contentChild(TemplateRef)

  total = computed(() => this.segments().reduce((sum, s) => sum + s.value, 0))

  widthPercent = computed(() => {
    const t = this.total()
    const m = this.maxValue()
    return m > 0 ? (t / m) * 100 : 100
  })

  segmentsWithMeta = computed(() => {
    const t = this.total()
    return this.segments()
      .filter((s) => s.value > 0)
      .map((seg) => ({
        ...seg,
        percent: Math.round((seg.value / t) * 100),
      }))
  })

  format(val: number) {
    return formatTokenCount(val)
  }
}

@Component({
  selector: 'app-composition-breakdown',
  standalone: true,
  imports: [NgClass],
  template: `
    <div [class]="className()" [ngClass]="{ 'space-y-1.5': composition().total > 0 }">
      @if (composition().total === 0) {
        <div class="text-xs text-muted-foreground">No composition data available</div>
      } @else {
        @for (item of items(); track item.label) {
          <div class="flex items-center gap-2 text-xs">
            <div [ngClass]="['w-2', 'h-2', 'rounded-sm', item.color]"></div>

            <span class="text-muted-foreground w-20">{{ item.label }}</span>

            <div class="flex-1 h-3 bg-muted/30 rounded overflow-hidden">
              <div
                [ngClass]="[item.color, 'h-full', 'transition-all', 'duration-300']"
                [style.width.%]="item.percent"
              ></div>
            </div>

            <span class="font-mono w-10 text-right text-muted-foreground">
              {{ item.percent }}%
            </span>
          </div>
        }
      }
    </div>
  `,
  host: {
    '[class]': 'className()',
  },
})
export class CompositionBreakdownComponent {
  composition = input.required<ContextComposition>()
  className = input<string>('')

  items = computed(() => {
    const data = this.composition()
    const { system, user, assistant, toolCalls, toolResults, total } = data

    if (total === 0) return []

    const rawItems = [
      { label: 'System', value: system, color: SEGMENT_COLORS.system },
      { label: 'User', value: user, color: SEGMENT_COLORS.user },
      { label: 'Assistant', value: assistant, color: SEGMENT_COLORS.assistant },
      { label: 'Tool Calls', value: toolCalls, color: SEGMENT_COLORS.toolCalls },
      { label: 'Tool Results', value: toolResults, color: SEGMENT_COLORS.toolResults },
    ]

    return rawItems
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percent: Math.round((item.value / total) * 100),
      }))
  })
}

@Component({
  selector: 'app-turn-row',
  standalone: true,
  imports: [NgIconComponent, SegmentedBarComponent, CompositionBreakdownComponent],
  template: `
    <div class="border-b border-muted/50 last:border-0">
      <div
        class="flex items-center gap-3 py-2 px-2 hover:bg-muted/30 cursor-pointer transition-colors"
        (click)="isExpanded.set(!isExpanded())"
      >
        <div
          class="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0"
        >
          {{ index() + 1 }}
        </div>

        <div class="flex-1 min-w-0">
          @if (viewMode() === 'tokens') {
            <app-segmented-bar [segments]="tokenSegments()" [maxValue]="maxValue()" [height]="20">
              <ng-template #renderLabel let-segs>
                <div
                  class="flex items-center gap-1 text-xs font-mono text-muted-foreground min-w-20 justify-end"
                >
                  <span class="text-blue-600 dark:text-blue-400"
                    >↑{{ formatToken(segs[0]?.value || 0) }}</span
                  >
                  <span>/</span>
                  <span class="text-emerald-600 dark:text-emerald-400"
                    >↓{{ formatToken(segs[1]?.value || 0) }}</span
                  >
                </div>
              </ng-template>
            </app-segmented-bar>
          } @else {
            <app-segmented-bar
              [segments]="compositionSegments()"
              [maxValue]="maxCompositionValue()"
              [height]="20"
            >
              <ng-template #renderLabel let-total>
                <div class="text-xs font-mono text-muted-foreground min-w-12.5 text-right">
                  {{ formatToken(mathRound(total / 4)) }}~
                </div>
              </ng-template>
            </app-segmented-bar>
          }
        </div>

        <div class="text-muted-foreground shrink-0">
          <ng-icon
            [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
            class="h-4 w-4"
          />
        </div>
      </div>

      @if (isExpanded()) {
        <div class="pb-3">
          <div class="flex items-start gap-3 px-2">
            <div class="w-6 flex justify-center shrink-0">
              <div class="w-px h-full bg-muted"></div>
            </div>

            <div class="flex-1 min-w-0">
              <div class="flex items-start gap-2">
                <div class="text-muted-foreground text-xs mt-1">└─</div>
                <div class="flex-1 space-y-3">
                  <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <div>
                      Time: <span class="font-mono text-foreground">{{ timestamp() }}</span>
                    </div>
                    <div>
                      Duration:
                      <span class="font-mono text-foreground"
                        >{{ turn().duration_ms.toFixed(0) }}ms</span
                      >
                    </div>
                    @if (turn().model) {
                      <div>
                        Model: <span class="font-mono text-foreground">{{ turn().model }}</span>
                      </div>
                    }
                    @if (turn().entity_id) {
                      <div>
                        Entity:
                        <span class="font-mono text-foreground">{{ turn().entity_id }}</span>
                      </div>
                    }
                  </div>

                  @if (viewMode() === 'tokens') {
                    <div class="flex gap-4 text-xs">
                      <div>
                        <span class="text-blue-600 dark:text-blue-400">Input:</span>
                        <span class="font-mono ml-1">{{
                          turn().input_tokens.toLocaleString()
                        }}</span>
                      </div>
                      <div>
                        <span class="text-emerald-600 dark:text-emerald-400">Output:</span>
                        <span class="font-mono ml-1">{{
                          turn().output_tokens.toLocaleString()
                        }}</span>
                      </div>
                      <div>
                        <span class="text-muted-foreground">Total:</span>
                        <span class="font-mono ml-1">{{
                          turn().total_tokens.toLocaleString()
                        }}</span>
                      </div>
                    </div>
                  }

                  @if (viewMode() === 'composition' && turn().composition.total > 0) {
                    <div>
                      <div class="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <ng-icon name="lucideInfo" class="h-3 w-3" />
                        Context Composition (estimated from ~{{
                          formatToken(mathRound(turn().composition.total / 4))
                        }}
                        tokens)
                      </div>
                      <app-composition-breakdown [composition]="turn().composition" />
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TurnRowComponent {
  // Inputs using Signal API
  turn = input.required<TurnData>()
  index = input.required<number>()
  maxValue = input.required<number>()
  maxCompositionValue = input.required<number>()
  cumulativeInput = input.required<number>()
  cumulativeOutput = input.required<number>()
  cumulativeComposition = input.required<ContextComposition>()
  showCumulative = input.required<boolean>()
  viewMode = input.required<'tokens' | 'composition'>()

  // Internal state
  isExpanded = signal(false)

  // Computed signals for logic
  displayInput = computed(() =>
    this.showCumulative() ? this.cumulativeInput() : this.turn().input_tokens,
  )

  displayOutput = computed(() =>
    this.showCumulative() ? this.cumulativeOutput() : this.turn().output_tokens,
  )

  displayComposition = computed(() =>
    this.showCumulative() ? this.cumulativeComposition() : this.turn().composition,
  )

  tokenSegments = computed(() => createTokenSegments(this.displayInput(), this.displayOutput()))

  compositionSegments = computed(() => createCompositionSegments(this.displayComposition()))

  timestamp = computed(() => {
    return new Date(this.turn().timestamp * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  })

  // Utilities for template
  formatToken(val: number) {
    return formatTokenCount(val)
  }

  mathRound(val: number) {
    return Math.round(val)
  }
}

export type StatColor = 'default' | 'blue' | 'green'

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div class="flex items-center gap-2 p-2 bg-muted/30 rounded">
      <ng-icon [name]="iconName()" [class]="['h-4', 'w-4', colorClass()]" />
      <div class="flex-1 min-w-0">
        <div class="text-xs text-muted-foreground truncate">{{ label() }}</div>
        <div class="font-mono text-sm font-medium">{{ value() }}</div>
      </div>
    </div>
  `,
  host: {
    '[class]': '"block"',
  },
})
export class StatCardComponent {
  label = input.required<string>()
  value = input.required<string | number>()

  iconName = input<string>('lucideBarChart3')

  color = input<StatColor>('default')

  colorClass = computed(() => {
    const mapping: Record<StatColor, string> = {
      default: 'text-muted-foreground',
      blue: 'text-blue-600 dark:text-blue-400',
      green: 'text-emerald-600 dark:text-emerald-400',
    }
    return mapping[this.color()]
  })
}

@Component({
  selector: 'app-context-inspector',
  standalone: true,
  imports: [
    NgIconComponent,
    BadgeComponent,
    CheckboxComponent,
    ScrollAreaComponent,
    TurnRowComponent,
    StatCardComponent,
    CompositionBreakdownComponent,
  ],
  template: `
    @if (turns().length === 0) {
      <div class="flex flex-col items-center text-center p-6 pt-9">
        <ng-icon name="lucideBarChart3" class="h-8 w-8 text-muted-foreground mb-3" />
        <div class="text-sm font-medium mb-1">No Data</div>
        <div class="text-xs text-muted-foreground max-w-50">
          Run <span class="font-mono bg-accent/10 px-1 rounded">devui --instrumentation</span>
          and start a conversation.
        </div>
      </div>
    } @else {
      <div class="h-full flex flex-col">
        <div class="p-3 border-b shrink-0 space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <ng-icon name="lucideBarChart3" class="h-4 w-4" />
              <span class="font-medium text-sm">Context Inspector</span>
              <app-badge variant="outline" class="text-xs">
                {{ turns().length }} turn{{ turns().length !== 1 ? 's' : '' }}
              </app-badge>
            </div>

            <label class="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <app-checkbox
                [checked]="showCumulative()"
                (checkedChange)="setShowCumulative($event)"
                class="h-3.5 w-3.5"
              />
              <span>Cumulative</span>
            </label>
          </div>

          <div class="flex items-center bg-muted rounded-md p-1">
            <button
              (click)="setViewMode('tokens')"
              [class]="
                viewMode() === 'tokens'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              "
              class="flex-1 px-3 py-1.5 text-xs rounded transition-colors"
            >
              Tokens
            </button>
            <button
              (click)="setViewMode('composition')"
              [class]="
                viewMode() === 'composition'
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              "
              class="flex-1 px-3 py-1.5 text-xs rounded transition-colors"
            >
              Composition
            </button>
          </div>

          <div class="text-xs text-muted-foreground">
            {{
              viewMode() === 'tokens'
                ? 'Token usage per turn'
                : 'Context breakdown by message type (chars)'
            }}
          </div>
        </div>

        <app-scroll-area class="flex-1">
          <div class="p-3 space-y-4">
            <div class="flex items-center gap-4 text-xs px-1 flex-wrap">
              @if (viewMode() === 'tokens') {
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-3 h-3 rounded ' + colors.input"></div>
                  <span class="text-muted-foreground">Input (↑)</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-3 h-3 rounded ' + colors.output"></div>
                  <span class="text-muted-foreground">Output (↓)</span>
                </div>
              } @else {
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-2.5 h-2.5 rounded-sm ' + colors.system"></div>
                  <span class="text-muted-foreground">System</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-2.5 h-2.5 rounded-sm ' + colors.user"></div>
                  <span class="text-muted-foreground">User</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-2.5 h-2.5 rounded-sm ' + colors.assistant"></div>
                  <span class="text-muted-foreground">Assistant</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-2.5 h-2.5 rounded-sm ' + colors.toolCalls"></div>
                  <span class="text-muted-foreground">Tools</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <div [class]="'w-2.5 h-2.5 rounded-sm ' + colors.toolResults"></div>
                  <span class="text-muted-foreground">Results</span>
                </div>
              }
              <div class="flex-1"></div>
              <div class="flex items-center gap-1 text-muted-foreground">
                <ng-icon name="lucideInfo" class="h-3 w-3" />
                <span>Click for details</span>
              </div>
            </div>

            <div class="border rounded-lg overflow-hidden">
              @for (turn of turns(); track turn.response_id; let i = $index) {
                <app-turn-row
                  [turn]="turn"
                  [index]="i"
                  [maxValue]="maxValue()"
                  [maxCompositionValue]="maxCompositionValue()"
                  [cumulativeInput]="cumulativeData()[i].input"
                  [cumulativeOutput]="cumulativeData()[i].output"
                  [cumulativeComposition]="cumulativeData()[i].composition"
                  [showCumulative]="showCumulative()"
                  [viewMode]="viewMode()"
                />
              }
            </div>

            <div class="border rounded-lg overflow-hidden">
              <div class="p-3 bg-muted/30 border-b">
                <span class="text-xs font-medium">Session Summary</span>
              </div>

              <div class="p-3 space-y-3">
                <div class="grid grid-cols-3 gap-2">
                  <app-stat-card
                    label="Total Tokens"
                    [value]="formatTokens(stats().totalTokens)"
                    icon="lucideLayers"
                  />
                  <app-stat-card
                    label="Input"
                    [value]="formatTokens(stats().totalInput)"
                    icon="lucideBarChart3"
                    color="blue"
                  />
                  <app-stat-card
                    label="Output"
                    [value]="formatTokens(stats().totalOutput)"
                    icon="lucideBarChart3"
                    color="green"
                  />
                </div>

                @if (turns().length > 1) {
                  <div
                    class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pt-2 border-t border-muted/50"
                  >
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Avg per turn:</span>
                      <span class="font-mono">{{ formatTokens(stats().avgTotal) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Peak turn:</span>
                      <span class="font-mono">{{ formatTokens(stats().peakTotal) }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Avg input:</span>
                      <span class="font-mono text-blue-600 dark:text-blue-400">{{
                        formatTokens(stats().avgInput)
                      }}</span>
                    </div>
                    <div class="flex justify-between">
                      <span class="text-muted-foreground">Avg output:</span>
                      <span class="font-mono text-emerald-600 dark:text-emerald-400">{{
                        formatTokens(stats().avgOutput)
                      }}</span>
                    </div>
                  </div>
                }

                @if (totalComposition().total > 0) {
                  <div class="pt-3 border-t border-muted/50">
                    <div class="flex items-start gap-2">
                      <div class="text-muted-foreground text-xs mt-0.5">└─</div>
                      <div class="flex-1">
                        <div class="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                          <ng-icon name="lucideInfo" class="h-3 w-3" />
                          Total Composition (all turns)
                        </div>
                        <app-composition-breakdown [composition]="totalComposition()" />
                      </div>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </app-scroll-area>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ContextInspectorComponent {
  private store = inject(DevUIStore)
  readonly colors = SEGMENT_COLORS

  // Signal Inputs
  events = input.required<any[]>()

  viewMode = computed(() => this.store.contextInspectorViewMode)
  showCumulative = computed(() => this.store.contextInspectorCumulative)

  turns = computed(() => extractTurnData(this.events()))
  stats = computed(() => calculateStats(this.turns()))
  totalComposition = computed(() => aggregateComposition(this.turns()))

  maxValue = computed(() => {
    const turns = this.turns()
    if (turns.length === 0) return 0
    return this.showCumulative() ? this.stats().totalTokens : 0
  })

  maxCompositionValue = computed(() => {
    const turns = this.turns()
    if (turns.length === 0) return 0
    return this.showCumulative() ? this.totalComposition().total : 0
  })

  cumulativeData = computed(() => {
    let cInput = 0,
      cOutput = 0
    let cComp = { system: 0, user: 0, assistant: 0, toolCalls: 0, toolResults: 0, total: 0 }

    return this.turns().map((t) => {
      cInput += t.input_tokens
      cOutput += t.output_tokens
      cComp = {
        system: cComp.system + t.composition.system,
        user: cComp.user + t.composition.user,
        assistant: cComp.assistant + t.composition.assistant,
        toolCalls: cComp.toolCalls + t.composition.toolCalls,
        toolResults: cComp.toolResults + t.composition.toolResults,
        total: cComp.total + t.composition.total,
      }
      return { input: cInput, output: cOutput, composition: { ...cComp } }
    })
  })

  // Actions
  setViewMode(mode: 'tokens' | 'composition') {
    this.store.setContextInspectorViewMode(mode)
  }

  setShowCumulative(checked: boolean) {
    this.store.setContextInspectorCumulative(checked)
  }

  formatTokens(n: number) {
    return formatTokenCount(n)
  }
}
