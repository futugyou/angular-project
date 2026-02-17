import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
  OnDestroy,
} from '@angular/core'
import { NgClass } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { ScrollAreaComponent } from '../../ui/scroll-area.component'
import { ButtonComponent } from '../../ui/button.component'
import { BadgeComponent } from '../../ui/badge.component'
import { HilTimelineItemComponent } from './hil-timeline-item.component'
import { RunWorkflowButtonComponent } from './run-workflow-button.component'
import { ChatMessageInputComponent } from '../../ui/chat-message-input.component'
import { truncateText, isChatMessageSchema } from '../../../lib/utils'

type ExecutorState = 'running' | 'completed' | 'failed' | 'cancelled' | 'pending'

interface ExecutorRun {
  executorId: string
  executorName: string
  itemId: string
  state: ExecutorState
  output: string
  error?: string
  timestamp: number
  runNumber: number
}

@Component({
  selector: 'app-executor-run-item',
  standalone: true,
  imports: [NgClass, NgIconComponent, BadgeComponent],
  template: `
    <div
      class="border rounded-lg transition-all"
      [ngClass]="{
        'border-blue-500 dark:border-blue-400 bg-blue-500/5 dark:bg-blue-500/10': isSelected(),
        'border-border hover:border-muted-foreground/30': !isSelected(),
      }"
    >
      <div class="p-3 cursor-pointer" (click)="handleHeaderClick()">
        <div class="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 mb-1">
          <div class="w-3 text-muted-foreground">
            @if (canExpand()) {
              <ng-icon
                [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
                class="w-3 h-3"
              />
            }
          </div>
          <div>
            <ng-icon [name]="stateIcon().icon" [ngClass]="stateIcon().class" class="w-4 h-4" />
          </div>
          <span class="font-medium text-sm truncate overflow-hidden">
            {{ run().executorName }}
          </span>
          @if (run().runNumber > 1) {
            <app-badge variant="outline" class="text-xs whitespace-nowrap"
              >Run #{{ run().runNumber }}</app-badge
            >
          } @else {
            <div></div>
          }
        </div>
        <div class="flex items-center gap-2 text-xs text-muted-foreground ml-5">
          <span class="font-mono">{{ formattedTime() }}</span>
          <app-badge variant="outline" class="text-xs border" [ngClass]="badgeClass()">
            {{ run().state }}
          </app-badge>
        </div>
      </div>

      @if (isExpanded() && canExpand()) {
        <div class="border-t px-3 py-2 bg-muted/30">
          @if (run().error) {
            <div class="space-y-1">
              <div class="text-xs font-medium text-red-600 dark:text-red-400">Error:</div>
              <pre
                class="text-xs bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded p-2 overflow-y-auto overflow-x-hidden max-h-40 whitespace-pre-wrap break-all"
                >{{ run().error }}</pre
              >
            </div>
          } @else {
            <div class="space-y-1">
              <div class="text-xs font-medium text-muted-foreground">Output:</div>
              <pre
                #outputPre
                class="text-xs bg-background border rounded p-2 overflow-y-auto overflow-x-hidden max-h-60 whitespace-pre-wrap break-all"
                >{{ run().output }}</pre
              >
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class ExecutorRunItemComponent {
  run = input.required<ExecutorRun>()
  isExpanded = input<boolean>(false)
  isSelected = input<boolean>(false)
  isStreaming = input<boolean>(false)

  toggle = output<void>()
  itemClick = output<void>()

  outputPre = viewChild<ElementRef<HTMLPreElement>>('outputPre')

  formattedTime = computed(() => new Date(this.run().timestamp).toLocaleTimeString())
  canExpand = computed(() => this.run().output.trim().length > 0 || !!this.run().error)

  stateIcon = computed(() => {
    const s = this.run().state
    const isStream = this.isStreaming()
    switch (s) {
      case 'running':
        return {
          icon: 'lucideLoader2',
          class: `text-[#643FB2] dark:text-[#8B5CF6] ${isStream ? 'animate-spin' : ''}`,
        }
      case 'completed':
        return { icon: 'lucideCheckCircle', class: 'text-green-500' }
      case 'failed':
        return { icon: 'lucideXCircle', class: 'text-red-500' }
      case 'cancelled':
        return { icon: 'lucideAlertCircle', class: 'text-orange-500' }
      default:
        return { icon: '', class: 'border-2 border-gray-400 rounded-full' }
    }
  })

  badgeClass = computed(() => {
    switch (this.run().state) {
      case 'running':
        return 'bg-[#643FB2]/10 text-[#643FB2] border-[#643FB2]/20'
      case 'completed':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'failed':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'cancelled':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  })

  constructor() {
    effect(() => {
      const el = this.outputPre()?.nativeElement
      if (el && this.isExpanded() && this.run().state === 'running') {
        el.scrollTop = el.scrollHeight
      }
    })
  }

  handleHeaderClick() {
    this.itemClick.emit()
    if (this.canExpand()) this.toggle.emit()
  }
}

@Component({
  selector: 'app-execution-timeline',
  standalone: true,
  imports: [
    NgClass,
    NgIconComponent,
    ExecutorRunItemComponent,
    ScrollAreaComponent,
    ButtonComponent,
    BadgeComponent,
    HilTimelineItemComponent,
    RunWorkflowButtonComponent,
    ChatMessageInputComponent,
  ],
  template: `
    <div class="h-full flex flex-col border-l bg-muted/30">
      <div class="p-3 border-b bg-background flex items-center justify-between flex-shrink-0">
        <div class="flex items-center gap-2">
          <span class="font-medium text-sm">Execution Timeline</span>
          <app-badge variant="outline" className="text-xs">
            {{ executorRuns().length }}
          </app-badge>
          @if (isStreaming()) {
            <div class="flex items-center gap-1 text-xs text-muted-foreground">
              <div class="h-2 w-2 animate-pulse rounded-full bg-[#643FB2] dark:bg-[#8B5CF6]"></div>
              <span>Running</span>
            </div>
          }
        </div>
        @if (executorRuns().length > 0) {
          <button
            [appButton]
            (click)="handleCopyAll()"
            class="flex items-center h-7 px-2 text-xs transition-colors"
            [ngClass]="copied() ? 'text-green-600' : ''"
          >
            <ng-icon [name]="copied() ? 'lucideCheck' : 'lucideCopy'" class="w-3 h-3 mr-1" />
            {{ copied() ? 'Copied!' : 'Copy All' }}
          </button>
        }
      </div>

      <app-scroll-area class="flex-1 overflow-y-auto p-3 space-y-2">
        @if (executorRuns().length === 0) {
          <div class="text-center text-muted-foreground text-sm py-8">
            {{ isStreaming() ? 'Workflow is running...' : 'Ready to run workflow' }}
          </div>
        } @else {
          @for (run of executorRuns(); track run.itemId + $index) {
            <app-executor-run-item
              [run]="run"
              [isExpanded]="expandedRuns().has(run.executorId + '-' + run.runNumber)"
              [isSelected]="selectedExecutorId() === run.executorId"
              [isStreaming]="isStreaming()"
              (toggle)="toggleExpand(run)"
              (itemClick)="onExecutorClick.emit(run.executorId)"
            />
          }

          @if (pendingHilRequests().length > 0) {
            <div #hilFormContainer class="transition-all duration-300">
              @for (req of pendingHilRequests(); track req.request_id) {
                <app-hil-timeline-item
                  [request]="req"
                  [response]="hilResponses()[req.request_id] || {}"
                  [isSubmitting]="isSubmittingHil()"
                  (responseChange)="
                    onHilResponseChange.emit({ requestId: req.request_id, values: $event })
                  "
                  (submit)="onHilSubmit.emit()"
                />
              }
            </div>
          }
        }

        @if (workflowResult()?.trim() && !isStreaming() && !wasCancelled()) {
          <div class="border rounded-lg border-green-500/40 bg-green-500/5 p-3">
            <div class="flex items-center gap-2 mb-2">
              <ng-icon name="lucideCheckCircle" class="w-4 h-4 text-green-500" />
              <span class="font-medium text-sm">Workflow Complete</span>
            </div>
            <div class="space-y-1">
              <div class="text-xs font-medium text-muted-foreground">Final Output:</div>
              <pre
                class="text-xs bg-background border rounded p-2 overflow-x-hidden whitespace-pre-wrap break-all"
                >{{ workflowResult() }}</pre
              >
            </div>
          </div>
        }

        @if (wasCancelled() && !isStreaming()) {
          <div
            class="border rounded-lg border-orange-500/40 bg-orange-500/5 p-4 flex items-center gap-2"
          >
            <ng-icon name="lucideSquare" class="w-4 h-4 text-orange-500 fill-current" />
            <span class="font-medium text-sm text-orange-700">Execution stopped by user</span>
          </div>
        }

        <div #timelineEnd></div>
      </app-scroll-area>

      @if ((canRun() || canCencal()) && pendingHilRequests().length === 0) {
        <div class="border-t p-3 bg-background flex-shrink-0">
          @if (inputSchema() && isChatMessageSchema(inputSchema())) {
            <app-chat-message-input
              (submit)="(handleChatSubmit)"
              [isSubmitting]="workflowState() === 'running'"
              [isStreaming]="workflowState() === 'running'"
              [isCancelling]="isCancelling()"
              (cancel)="onCancel.emit()"
              placeholder="Message workflow..."
              [showFileUpload]="true"
              entityName="workflow"
            />
          } @else {
            <app-run-workflow-button
              [inputSchema]="inputSchema()"
              [isSubmitting]="workflowState() === 'running'"
              [isCancelling]="isCancelling()"
              [workflowState]="workflowState()"
              [checkpoints]="checkpoints()"
              [showCheckpoints]="false"
              (run)="onRun.emit($event)"
              (cancel)="onCancel.emit()"
            />
          }
        </div>
      }
    </div>
  `,
})
export class ExecutionTimelineComponent implements OnDestroy {
  // Inputs via Signal API
  events = input<any[]>([])
  itemOutputs = input<Record<string, string>>({})
  currentExecutorId = input<string | null>(null)
  isStreaming = input<boolean>(false)
  selectedExecutorId = input<string | null>(null)
  workflowResult = input<string | undefined>()
  pendingHilRequests = input<any[]>([])
  hilResponses = input<Record<string, Record<string, any>>>({})
  isSubmittingHil = input<boolean>(false)
  inputSchema = input<any>()
  isCancelling = input<boolean>(false)
  workflowState = input<'ready' | 'running' | 'completed' | 'error' | 'cancelled'>('ready')
  wasCancelled = input<boolean>(false)
  checkpoints = input<any[]>([])

  // Outputs via Signal API
  onExecutorClick = output<string>()
  onHilResponseChange = output<{ requestId: string; values: Record<string, any> }>()
  onHilSubmit = output<void>()
  canRun = input<boolean>(true)
  onRun = output<any>()
  canCencal = input<boolean>(true)
  onCancel = output<void>()

  // Internal State
  expandedRuns = signal<Set<string>>(new Set())
  copied = signal(false)
  private updateTrigger = signal(0)
  private lastScrolledRun = ''
  private pollingInterval?: any

  // View Childs
  timelineEnd = viewChild<ElementRef>('timelineEnd')
  hilFormContainer = viewChild<ElementRef>('hilFormContainer')

  // Logic: Process Events into Runs
  executorRuns = computed(() => {
    const evs = this.events()
    const outputs = this.itemOutputs()
    this.updateTrigger()
    const runs: ExecutorRun[] = []
    const runCountMap = new Map<string, number>()

    evs.forEach((event) => {
      const uiTimestamp = (event._uiTimestamp || Date.now() / 1000) * 1000

      if (event.type === 'response.output_item.added') {
        const item = event.item
        if (
          item?.type === 'executor_action' ||
          (item?.type === 'message' && item.metadata?.source === 'magentic')
        ) {
          const executorId = item.executor_id || item.metadata?.agent_id
          const itemId = item.id
          const runNumber = (runCountMap.get(executorId) || 0) + 1
          runCountMap.set(executorId, runNumber)

          runs.push({
            executorId,
            executorName: executorId,
            itemId,
            state: 'running',
            output: outputs[itemId] || '',
            timestamp: uiTimestamp,
            runNumber,
          })
        }
      }

      if (event.type === 'response.output_item.done') {
        const item = event.item
        const existing = runs.find((r) => r.itemId === item.id)
        if (existing) {
          existing.state = item.status === 'failed' ? 'failed' : 'completed'
          existing.output = outputs[item.id] || ''
          if (item.error) existing.error = String(item.error)
        }
      }

      if (event.type === 'response.workflow_event.completed' && 'data' in event && event.data) {
        const data = event.data as {
          executor_id?: string
          event_type?: string
          data?: unknown
          timestamp?: string
        }
        const executorId = data.executor_id
        if (!executorId) return

        const eventType = data.event_type

        if (eventType === 'ExecutorInvokedEvent') {
          const runNumber = (runCountMap.get(executorId) || 0) + 1
          runCountMap.set(executorId, runNumber)

          // Create synthetic item ID for fallback format (no real item.id from backend)
          const syntheticItemId = `fallback_${executorId}_${uiTimestamp}`

          runs.push({
            executorId,
            executorName: truncateText(executorId, 35),
            itemId: syntheticItemId,
            state: 'running',
            output: this.itemOutputs()[syntheticItemId] || '',
            timestamp: uiTimestamp,
            runNumber,
          })
        } else if (eventType === 'ExecutorCompletedEvent') {
          // Find the most recent running instance of this executor (search from end)
          let existingRun: ExecutorRun | undefined
          for (let i = runs.length - 1; i >= 0; i--) {
            if (runs[i].executorId === executorId && runs[i].state === 'running') {
              existingRun = runs[i]
              break
            }
          }
          if (existingRun) {
            existingRun.state = 'completed'
            existingRun.output = this.itemOutputs()[existingRun.itemId] || ''
          }
        } else if (eventType?.includes('Error') || eventType?.includes('Failed')) {
          // Find the most recent running instance of this executor (search from end)
          let existingRun: ExecutorRun | undefined
          for (let i = runs.length - 1; i >= 0; i--) {
            if (runs[i].executorId === executorId && runs[i].state === 'running') {
              existingRun = runs[i]
              break
            }
          }
          if (existingRun) {
            existingRun.state = 'failed'
            existingRun.error = typeof data.data === 'string' ? data.data : 'Execution failed'
          }
        }
      }
    })

    return runs
  })

  constructor() {
    effect((onCleanup) => {
      if (this.isStreaming()) {
        const timer = setInterval(() => this.updateTrigger.update((v) => v + 1), 100)
        onCleanup(() => clearInterval(timer))
      }
    })

    effect(() => {
      const currentId = this.currentExecutorId()
      if (currentId) {
        this.expandedRuns.update((prev) => {
          const next = new Set(prev)
          const runs = this.executorRuns()
          const latest = [...runs].reverse().find((r) => r.executorId === currentId)
          if (latest) next.add(`${currentId}-${latest.runNumber}`)
          return next
        })
      }
    })

    effect(() => {
      const runs = this.executorRuns()
      if (runs.length > 0 && this.isStreaming()) {
        const last = runs[runs.length - 1]
        const key = `${last.executorId}-${last.runNumber}`
        if (key !== this.lastScrolledRun) {
          this.lastScrolledRun = key
          this.scrollToEnd()
        }
      }
    })

    effect(() => {
      if (this.pendingHilRequests().length > 0) {
        setTimeout(() => {
          this.hilFormContainer()?.nativeElement.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          })
        }, 100)
      }
    })
  }

  ngOnDestroy() {
    if (this.pollingInterval) clearInterval(this.pollingInterval)
  }

  toggleExpand(run: ExecutorRun) {
    const key = `${run.executorId}-${run.runNumber}`
    this.expandedRuns.update((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  handleCopyAll() {
    const text = this.executorRuns()
      .map((run) => {
        const time = new Date(run.timestamp).toLocaleTimeString()
        return `[${time}] ${run.executorName} (${run.state})\n${run.error || run.output || '(no output)'}\n`
      })
      .join('\n')

    navigator.clipboard.writeText(text)
    this.copied.set(true)
    setTimeout(() => this.copied.set(false), 2000)
  }

  handleChatSubmit(content: any[]) {
    const openaiInput = [{ type: 'message', role: 'user', content }]
    this.onRun.emit(openaiInput)
  }

  private scrollToEnd() {
    setTimeout(() => {
      this.timelineEnd()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }, 100)
  }

  isChatMessageSchema = isChatMessageSchema
}
