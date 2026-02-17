import { input, Component, ChangeDetectionStrategy, signal, computed } from '@angular/core'
import { NgClass, NgStyle, JsonPipe } from '@angular/common'
import { XYFlowModule } from 'ngx-xyflow'
import { provideIcons, NgIconComponent } from '@ng-icons/core'
import { cn, truncateText } from '../../../lib/utils'

export type ExecutorState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface ExecutorNodeData extends Record<string, unknown> {
  executorId: string
  executorType?: string
  name?: string
  state: ExecutorState
  inputData?: unknown
  outputData?: unknown
  error?: string
  isSelected?: boolean
  isStartNode?: boolean
  isEndNode?: boolean
  layoutDirection?: 'LR' | 'TB'
  onNodeClick?: (executorId: string, data: ExecutorNodeData) => void
  isStreaming?: boolean
}

@Component({
  selector: 'executor-node',
  standalone: true,
  imports: [NgClass, NgStyle, NgIconComponent, XYFlowModule],
  template: `
    <div
      [class]="containerClass()"
      [ngClass]="{ 'ring-2 ring-blue-500 ring-offset-2': selected() }"
    >
      <ngx-xyflow-handle
        type="target"
        [position]="targetPosition()"
        id="target"
        class="!w-2 !h-2 !rounded-full !border !border-gray-600 dark:!border-gray-500 transition-colors !min-w-0 !min-h-0"
        [ngStyle]="{ 'background-color': handleBgColor() }"
      />

      <ngx-xyflow-handle
        type="source"
        [position]="sourcePosition()"
        id="source"
        class="!w-2 !h-2 !rounded-full !border !border-gray-600 dark:!border-gray-500 transition-colors !min-w-0 !min-h-0"
        [ngStyle]="{ 'background-color': handleBgColor() }"
      />

      <div class="p-3">
        <div class="flex items-start gap-3">
          <div class="flex-shrink-0 relative">
            <div
              class="w-10 h-10 rounded-lg bg-gray-900/90 dark:bg-gray-800/90 flex items-center justify-center"
            >
              @if (nodeData().isStartNode) {
                <ng-icon name="lucHome" class="w-5 h-5 text-[#643FB2] dark:text-[#8B5CF6]" />
              } @else {
                <ng-icon name="lucWorkflow" class="w-5 h-5 text-gray-300 dark:text-gray-400" />
              }
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <h3 class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {{ nodeData().name || nodeData().executorId }}
              </h3>
              @if (isRunning()) {
                <ng-icon
                  name="lucLoader2"
                  [class]="
                    cn(
                      'w-4 h-4 text-[#643FB2] dark:text-[#8B5CF6] flex-shrink-0',
                      shouldAnimate() ? 'animate-spin' : ''
                    )
                  "
                />
              }
            </div>
            @if (nodeData().executorType) {
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {{ nodeData().executorType }}
              </p>
            }
          </div>
        </div>

        @if (hasOutput()) {
          <div class="mt-2 border-t border-border/50 pt-2">
            <button
              (click)="toggleExpand($event)"
              class="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              <ng-icon
                [name]="isOutputExpanded() ? 'lucChevronDown' : 'lucChevronRight'"
                class="w-3 h-3"
              />
              <span>{{ nodeData().error ? 'Show error' : 'Show output' }}</span>
            </button>

            @if (isOutputExpanded()) {
              <div class="mt-2">
                @if (nodeData().error) {
                  <div
                    class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800 break-words max-h-32 overflow-auto"
                  >
                    {{ truncatedError() }}
                  </div>
                } @else if (nodeData().outputData) {
                  <div
                    class="text-xs text-gray-700 dark:text-gray-300 bg-muted/50 p-2 rounded border max-h-32 overflow-auto"
                  >
                    <pre class="whitespace-pre-wrap font-mono">{{ formattedOutput() }}</pre>
                  </div>
                }
              </div>
            }
          </div>
        }

        @if (isRunning()) {
          <div
            class="absolute inset-0 rounded border-2 border-[#643FB2]/30 dark:border-[#8B5CF6]/30 animate-pulse pointer-events-none"
          ></div>
        }
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutorNodeComponent {
  // --- Inputs Using Signal API ---
  data = input.required<ExecutorNodeData>()
  selected = input<boolean>(false)

  // --- Internal State ---
  isOutputExpanded = signal(false)

  // --- Computeds ---
  nodeData = computed(() => this.data())
  isRunning = computed(() => this.nodeData().state === 'running')
  hasOutput = computed(() => !!(this.nodeData().outputData || this.nodeData().error))
  shouldAnimate = computed(() => this.isRunning() && (this.nodeData().isStreaming ?? true))

  // Handle Positions & Colors
  isVertical = computed(() => this.nodeData().layoutDirection === 'TB')
  targetPosition = computed(() => (this.isVertical() ? 'top' : 'left'))
  sourcePosition = computed(() => (this.isVertical() ? 'bottom' : 'right'))

  stateConfig = computed(() => {
    const s = this.nodeData().state
    const map: Record<ExecutorState, { border: string; glow: string; color: string }> = {
      running: {
        border: 'border-[#643FB2] dark:border-[#8B5CF6]',
        glow: 'shadow-lg shadow-[#643FB2]/20',
        color: '#643FB2',
      },
      completed: {
        border: 'border-green-500 dark:border-green-400',
        glow: 'shadow-lg shadow-green-500/20',
        color: '#10b981',
      },
      failed: {
        border: 'border-red-500 dark:border-red-400',
        glow: 'shadow-lg shadow-red-500/20',
        color: '#ef4444',
      },
      cancelled: {
        border: 'border-orange-500 dark:border-orange-400',
        glow: 'shadow-lg shadow-orange-500/20',
        color: '#f97316',
      },
      pending: {
        border: 'border-gray-300 dark:border-gray-600',
        glow: 'shadow-sm',
        color: '#4b5563',
      },
    }
    return map[s] || map.pending
  })

  containerClass = computed(() =>
    cn(
      'group relative w-64 bg-card dark:bg-card rounded border-2 transition-all duration-200',
      this.stateConfig().border,
      this.isRunning() ? this.stateConfig().glow : 'shadow-sm',
    ),
  )

  handleBgColor = computed(() => this.stateConfig().color)
  truncatedError = computed(() => truncateText(this.nodeData().error || '', 200))
  formattedOutput = computed(() => {
    const out = this.nodeData().outputData
    if (!out) return ''
    return typeof out === 'string' ? out : JSON.stringify(out, null, 2)
  })

  // --- Methods ---
  toggleExpand(event: MouseEvent) {
    event.stopPropagation()
    this.isOutputExpanded.update((v) => !v)
  }

  cn = cn
}

// usage example:
// <ngx-xyflow [nodes]="nodes" [edges]="edges">
//   <ngx-xyflow-node nodeType="executor">
//     <ng-template let-data let-selected="selected">
//       <executor-node [data]="data" [selected]="selected" />
//     </ng-template>
//   </ngx-xyflow-node>
// </ngx-xyflow>
