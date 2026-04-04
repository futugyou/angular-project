import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectorRef,
  OnInit,
  input,
} from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { cn, truncateText } from '@shared/utils/utils'

export type ExecutorState = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface ExecutorNodeData {
  executorId: string
  executorType?: string
  name?: string
  state: ExecutorState
  inputData?: any
  outputData?: any
  error?: string
  isSelected?: boolean
  isStartNode?: boolean
  isEndNode?: boolean
  layoutDirection?: 'LR' | 'TB'
  isStreaming?: boolean
}

@Component({
  selector: 'app-executor-node',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div
      [class]="containerClasses()"
      [class.ring-2]="isSelected()"
      [class.ring-blue-500]="isSelected()"
      [class.ring-offset-2]="isSelected()"
    >
      <div class="p-3">
        <div class="flex items-start gap-3">
          <div class="shrink-0 relative">
            <div
              class="w-10 h-10 rounded-lg bg-gray-900/90 dark:bg-gray-800/90 flex items-center justify-center"
            >
              @if (value().isStartNode) {
                <ng-icon
                  name="lucideHome"
                  class="w-5 h-5 text-[#643FB2] dark:text-[#8B5CF6]"
                ></ng-icon>
              } @else {
                <ng-icon
                  name="lucideWorkflow"
                  class="w-5 h-5 text-gray-300 dark:text-gray-400"
                ></ng-icon>
              }
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <h3 class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {{ value().name || value().executorId }}
              </h3>
              @if (isRunning()) {
                <ng-icon
                  name="lucideLoader2"
                  [class.animate-spin]="shouldAnimate()"
                  class="w-4 h-4 text-[#643FB2] dark:text-[#8B5CF6] shrink-0"
                ></ng-icon>
              }
            </div>
            @if (value().executorType) {
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {{ value().executorType }}
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
                [name]="isOutputExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
                class="w-3 h-3"
              ></ng-icon>
              <span>{{ value().error ? 'Show error' : 'Show output' }}</span>
            </button>

            @if (isOutputExpanded()) {
              <div class="mt-2">
                @if (value().error) {
                  <div
                    class="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 p-2 rounded border border-red-200 dark:border-red-800 wrap-break-word max-h-32 overflow-auto"
                  >
                    {{ truncatedError() }}
                  </div>
                } @else if (value().outputData) {
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
  host: {
    '[class.contents]': 'true',
  },
})
export class ExecutorNodeComponent implements OnInit {
  // @Input() value!: ExecutorNodeData
  value = input.required<ExecutorNodeData>()
  isSelected = signal(false)
  isOutputExpanded = signal(false)
  private nodeTrigger = signal(0)
  private cdr = inject(ChangeDetectorRef)

  ngOnInit() {
    // if (!this.node) return
    // this.nodeTrigger.update((v) => v + 1)
    // this.node.on('change:data', () => {
    //   this.nodeTrigger.update((v) => v + 1)
    //   this.cdr.detectChanges()
    // })
    // this.node.on('selected', () => this.isSelected.set(true))
    // this.node.on('unselected', () => this.isSelected.set(false))
    // const graph = this.node.model?.graph
    // if (graph) {
    //   this.isSelected.set(graph.isSelected(this.node))
    // }
  }

  config = computed(() => {
    const state = this.value().state
    const configs: Record<ExecutorState, any> = {
      running: {
        borderColor: 'border-[#643FB2] dark:border-[#8B5CF6]',
        glow: 'shadow-lg shadow-[#643FB2]/20',
      },
      completed: {
        borderColor: 'border-green-500 dark:border-green-400',
        glow: 'shadow-lg shadow-green-500/20',
      },
      failed: {
        borderColor: 'border-red-500 dark:border-red-400',
        glow: 'shadow-lg shadow-red-500/20',
      },
      cancelled: {
        borderColor: 'border-orange-500 dark:border-orange-400',
        glow: 'shadow-lg shadow-orange-500/20',
      },
      pending: {
        borderColor: 'border-gray-300 dark:border-gray-600',
        glow: '',
      },
    }
    return configs[state] || configs.pending
  })

  isRunning = computed(() => this.value().state === 'running')
  shouldAnimate = computed(() => this.isRunning() && (this.value().isStreaming ?? true))
  hasOutput = computed(() => !!(this.value().outputData || this.value().error))

  containerClasses = computed(() =>
    cn(
      'group relative w-64 bg-card dark:bg-card rounded border-2 transition-all duration-200 block',
      this.config().borderColor,
      this.isRunning() ? this.config().glow : 'shadow-sm',
    ),
  )

  truncatedError = computed(() => {
    const err = this.value().error
    return typeof err === 'string' ? truncateText(err, 200) : ''
  })

  formattedOutput = computed(() => {
    const data = this.value().outputData
    if (!data) return ''
    try {
      return typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    } catch {
      return '[Unable to display output]'
    }
  })

  toggleExpand(event: MouseEvent) {
    event.stopPropagation()
    this.isOutputExpanded.update((v) => !v)
  }
}
