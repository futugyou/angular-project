import {
  Component,
  computed,
  input,
  inject,
  effect,
  signal,
  untracked,
  output,
} from '@angular/core'
import { DatePipe } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonComponent } from '../../ui/button.component'
import { BadgeComponent } from '../../ui/badge.component'
import { LoadingState } from '../../ui/loading-state.component'

import { Select, SelectContent, SelectItem, SelectTrigger } from '../../ui/select.component'

import { ApiClient } from '../../../services/api.service'
import { WorkflowFlowComponent } from './workflow-flow.component'
import { CheckpointInfoModal } from './checkpoint-info-modal.component'
import { ExecutionTimelineComponent } from './execution-timeline.component'
import { validateSchemaForm } from './schema-form-renderer.component'
import type {
  ExtendedResponseStreamEvent,
  ResponseOutputItemAddedEvent,
  WorkflowInfo,
  CheckpointItem,
  JSONSchemaProperty,
  ResponseOutputItemDoneEvent,
} from '../../../types'
import { ResponseRequestInfoEvent } from '../../../types/openai'
import { DevUIStore } from '../../../stores'
import { AgentConversationService } from '../../../services/agent.serivce'
import { CancellableRequestService } from '../../../services/cancellable-request.service'
import { RunWorkflowButtonComponent } from './run-workflow-button.component'
import { WorkflowDetailsModalComponent } from './workflow-details-modal.component'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

type DebugEvent = ExtendedResponseStreamEvent | 'clear'

interface ViewOptions {
  showMinimap: boolean
  showGrid: boolean
  animateRun: boolean
  consolidateBidirectionalEdges: boolean
}

const DEFAULT_OPTIONS: ViewOptions = {
  showMinimap: false,
  showGrid: true,
  animateRun: false,
  consolidateBidirectionalEdges: true,
}

const WORKFLOW_EVENT_TYPES = [
  'response.output_item.added',
  'response.output_item.done',
  'response.created',
  'response.in_progress',
  'response.completed',
  'response.failed',
  'response.workflow_event.completed',
  'response.workflow_event.complete',
]

@Component({
  selector: 'app-workflow-view',
  standalone: true,
  imports: [
    NgIconComponent,
    NgIconComponent,
    ButtonComponent,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    WorkflowFlowComponent,
    ExecutionTimelineComponent,
    CheckpointInfoModal,
    DatePipe,
    LoadingState,
    BadgeComponent,
    RunWorkflowButtonComponent,
    WorkflowDetailsModalComponent,
  ],
  host: {
    class: 'block relative w-full h-full',
  },
  template: `@if (workflowLoading()) {
      <app-loading-state
        message="Loading workflow..."
        description="Fetching workflow structure and configuration"
      ></app-loading-state>
    } @else if (workflowLoadError()) {
      <div class="flex items-center justify-center h-full">
        <div class="text-center max-w-md p-6">
          <div class="text-red-500 mb-4">
            <svg class="w-16 h-16 mx-auto">...</svg>
          </div>
          <h3 class="text-lg font-semibold mb-2">Failed to Load Workflow</h3>
          <p class="text-sm text-muted-foreground mb-4">{{ workflowLoadError() }}</p>
          <p class="text-xs text-muted-foreground">
            This may not be a valid workflow entity. Check the file contains a workflow export.
          </p>
        </div>
      </div>
    } @else if (!workflowInfo()?.workflow_dump && !executorHistory().length) {
      <app-loading-state
        message="Initializing workflow..."
        description="Setting up workflow execution environment"
      ></app-loading-state>
    } @else {
      <div class="workflow-view flex flex-col h-full">
        <div class="border-b pb-2 p-4 flex-shrink-0">
          <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
            <div class="flex items-center gap-2 min-w-0">
              <h2 class="font-semibold text-sm truncate">
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideWorkflow" class="h-4 w-4 flex-shrink-0"></ng-icon>
                  <span class="truncate">
                    {{ selectedWorkflow().name || selectedWorkflow().id }}
                  </span>
                </div>
              </h2>

              <button
                [appButton]
                variant="ghost"
                size="sm"
                class="h-6 w-6 p-0 flex-shrink-0 btn-ghost"
                [title]="'View workflow details'"
                (click)="detailsModalOpen.set(true)"
              >
                <ng-icon name="lucideInfo" class="h-4 w-4"></ng-icon>
              </button>

              @if (selectedWorkflow().source === 'in_memory') {
                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  class="h-6 w-6 p-0 flex-shrink-0 btn-ghost"
                  [disabled]="isReloading()"
                  [title]="isReloading() ? 'Reloading...' : 'Reload entity code (hot reload)'"
                  (click)="handleReloadEntity()"
                >
                  <ng-icon
                    name="lucideRefreshCw"
                    class="h-4 w-4"
                    [class.animate-spin]="isReloading()"
                  ></ng-icon>
                </button>
              }
            </div>

            @if (workflowInfo()) {
              <div
                class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 flex-shrink-0"
              >
                <app-select
                  [value]="currentSession()?.conversation_id || ''"
                  (valueChange)="handleSessionSelect($event)"
                  [disabled]="loadingSessions()"
                >
                  <app-select-trigger class="w-full sm:w-64">
                    @if (currentSession()) {
                      <div class="flex items-center gap-2 text-xs">
                        <span class="truncate">
                          {{
                            currentSession()?.metadata?.name ||
                              'Checkpoint Storage ' + currentSession()?.conversation_id?.slice(-8)
                          }}
                        </span>
                        @if (currentSession()?.metadata?.checkpoint_summary; as summary) {
                          <div class="flex items-center gap-1 flex-shrink-0">
                            <app-badge variant="secondary" class="h-4 px-1.5 text-[10px]">
                              {{ summary.count }}
                            </app-badge>
                            @if (summary.has_pending_hil) {
                              <app-badge variant="secondary" class="h-4 px-1.5 text-[10px]"
                                >HIL</app-badge
                              >
                            }
                          </div>
                        }
                      </div>
                    } @else {
                      <span>{{
                        loadingSessions()
                          ? 'Loading...'
                          : availableSessions().length === 0
                            ? 'No checkpoint storages'
                            : 'Select checkpoint storage'
                      }}</span>
                    }
                  </app-select-trigger>

                  <app-select-content>
                    @for (session of availableSessions(); track session.conversation_id) {
                      <app-select-item [value]="session.conversation_id">
                        <div class="flex items-center justify-between w-full gap-2">
                          <span class="truncate">
                            {{
                              session.metadata.name ||
                                'Checkpoint Storage ' + session.conversation_id.slice(-8)
                            }}
                          </span>
                          <div class="flex items-center gap-1 flex-shrink-0">
                            @if (session.created_at) {
                              <span class="text-xs text-muted-foreground">
                                {{ session.created_at * 1000 | date: 'shortTime' }}
                              </span>
                            }
                            @if (session.metadata.checkpoint_summary; as summary) {
                              <app-badge variant="secondary" class="h-4 px-1.5 text-[10px]">
                                {{ summary.count }}
                              </app-badge>
                              @if (summary.has_pending_hil) {
                                <app-badge variant="secondary" class="h-4 px-1.5 text-[10px]"
                                  >HIL</app-badge
                                >
                              }
                            }
                          </div>
                        </div>
                      </app-select-item>
                    }
                  </app-select-content>
                </app-select>

                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  class="h-9 w-9 p-0 flex-shrink-0 btn-ghost"
                  [disabled]="!currentSession()"
                  (click)="checkpointInfoModalOpen.set(true)"
                  title="View checkpoint details"
                >
                  <ng-icon name="lucideInfo" class="h-4 w-4"></ng-icon>
                </button>

                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  class="h-9 w-9 p-0 btn-ghost"
                  [disabled]="!currentSession() || loadingSessions()"
                  (click)="handleDeleteSession()"
                  title="Delete current session"
                >
                  <ng-icon name="lucideTrash2" class="h-4 w-4"></ng-icon>
                </button>

                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  class="h-9 px-3 btn-ghost"
                  [disabled]="loadingSessions()"
                  (click)="handleNewSession()"
                  title="New session"
                >
                  <ng-icon name="lucidePlus" class="h-4 w-4"></ng-icon>
                </button>

                @if (timelineMinimized()) {
                  <app-run-workflow-button
                    [inputSchema]="workflowInfo()?.input_schema"
                    (run)="handleWorkflowRun($event.data, $event.checkpointId)"
                    (cancel)="handleCancel()"
                    [isSubmitting]="isStreaming()"
                    [isCancelling]="isCancelling()"
                    [workflowState]="
                      isStreaming()
                        ? 'running'
                        : executorHistory().length > 0
                          ? 'completed'
                          : 'ready'
                    "
                    [checkpoints]="sessionCheckpoints()"
                    [showCheckpoints]="false"
                  ></app-run-workflow-button>
                }
              </div>
            }
          </div>

          @if (selectedWorkflow().description) {
            <p class="text-sm text-muted-foreground">
              {{ selectedWorkflow().description }}
            </p>
          }
        </div>

        @if (pendingHilRequests().length > 0) {
          <div
            class="bg-orange-100 dark:bg-orange-950/30 border-b border-orange-300 dark:border-orange-800 px-4 py-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ng-icon
                  name="lucideAlertCircle"
                  class="w-4 h-4 text-orange-600 dark:text-orange-400"
                ></ng-icon>

                <span class="text-sm font-medium text-orange-900 dark:text-orange-100">
                  Workflow is waiting for your input ({{ pendingHilRequests().length }} request{{
                    pendingHilRequests().length > 1 ? 's' : ''
                  }})
                </span>
              </div>
              <div class="flex items-center gap-2">
                @if (pendingHilRequests().length > 1) {
                  <button
                    [appButton]
                    variant="ghost"
                    size="sm"
                    class="btn-primary btn-sm gap-1"
                    [disabled]="!areAllHilResponsesValid() || isStreaming()"
                    (click)="handleSubmitHilResponses()"
                  >
                    Submit All
                  </button>
                }
                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  class="text-orange-700 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-200"
                  (click)="scrollToHilForm()"
                >
                  Jump to input →
                </button>
              </div>
            </div>
          </div>
        }

        <div class="flex-1 min-h-0 flex gap-0">
          <div class="flex-1 min-w-0 transition-all duration-300">
            @if (workflowInfo()?.workflow_dump) {
              <app-workflow-flow
                [workflowDump]="workflowInfo()?.workflow_dump"
                [events]="workflowEvents()"
                [isStreaming]="isStreaming()"
                (onNodeSelect)="selectedExecutorId.set($event)"
                class="h-full"
                [viewOptions]="viewOptions()"
                [layoutDirection]="layoutDirection()"
                [timelineVisible]="true"
              ></app-workflow-flow>
            }
          </div>

          <div
            class="flex-shrink-0 overflow-hidden transition-all duration-300 ease-out border-l"
            [style.width]="timelineMinimized() ? '2.5rem' : '28rem'"
          >
            @if (timelineMinimized()) {
              <div
                class="h-full w-10 bg-background flex flex-col items-center py-2 cursor-pointer hover:bg-accent/50"
                (click)="timelineMinimized.set(false)"
                title="Expand timeline"
              >
                <ng-icon name="lucideChevronLeft" class="h-4 w-4 text-muted-foreground"></ng-icon>
                <div
                  class="flex-1 flex flex-col items-center justify-center gap-2 pointer-events-none"
                >
                  <div
                    class="text-xs text-muted-foreground select-none"
                    style="writing-mode: vertical-rl; transform: rotate(180deg);"
                  >
                    Execution Timeline
                  </div>
                  @if (workflowEvents().length > 0) {
                    <div
                      class="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                      [class.animate-pulse]="isStreaming()"
                    >
                      {{ workflowEvents().length }}
                    </div>
                  }
                </div>
              </div>
            } @else {
              <div class="w-[28rem] h-full flex flex-col">
                <div class="flex items-center justify-between p-2 border-b">
                  <div class="flex items-center gap-2">
                    <h3 class="text-sm font-medium">Execution Timeline</h3>
                    @if (workflowEvents().length > 0) {
                      <div
                        class="bg-primary text-primary-foreground rounded-full px-2 h-5 flex items-center justify-center text-[11px]"
                        [class.animate-pulse]="isStreaming()"
                      >
                        {{ workflowEvents().length }}
                      </div>
                    }
                  </div>
                  <button
                    [appButton]
                    variant="ghost"
                    size="sm"
                    class="h-8 w-8 p-0 btn-ghost"
                    (click)="timelineMinimized.set(true)"
                  >
                    <ng-icon name="lucideChevronRight" class="h-4 w-4"></ng-icon>
                  </button>
                </div>

                <div class="flex-1 min-h-0 overflow-hidden">
                  <app-execution-timeline
                    [events]="workflowEvents()"
                    [isStreaming]="isStreaming()"
                    [selectedExecutorId]="selectedExecutorId()"
                    [workflowResult]="workflowResult()"
                    [pendingHilRequests]="pendingHilRequests()"
                    [checkpoints]="sessionCheckpoints()"
                    (onRun)="handleWorkflowRun($event.data, $event.checkpointId)"
                    (cancel)="handleCancel()"
                  ></app-execution-timeline>
                </div>
              </div>
            }
          </div>
        </div>

        <app-workflow-details-modal
          [workflow]="selectedWorkflow()"
          [open]="detailsModalOpen()"
          (onOpenChange)="detailsModalOpen.set($event)"
        ></app-workflow-details-modal>

        <app-checkpoint-info-modal
          [session]="currentSession() || null"
          [checkpoints]="sessionCheckpoints()"
          [open]="checkpointInfoModalOpen()"
          (onOpenChange)="checkpointInfoModalOpen.set($event)"
        ></app-checkpoint-info-modal>
      </div>
    }`,
})
export class WorkflowViewComponent {
  selectedWorkflow = input.required<WorkflowInfo>()
  debugEvent = output<DebugEvent>()

  // Store Injection
  protected readonly store = inject(DevUIStore)
  private apiClient = inject(ApiClient)
  private cancellableRequestService = inject(CancellableRequestService)
  private chatService = inject(AgentConversationService)

  workflowInfo = signal<WorkflowInfo | null>(null)
  workflowLoading = signal(false)
  workflowLoadError = signal<string | null>(null)
  openAIEvents = signal<ExtendedResponseStreamEvent[]>([])
  isStreaming = signal(false)
  wasCancelled = signal(false)
  selectedExecutorId = signal<string | null>(null)
  detailsModalOpen = signal(false)
  checkpointInfoModalOpen = signal(false)
  isReloading = signal(false)
  timelineMinimized = signal(false)
  workflowResult = signal<string>('')
  sessionCheckpoints = signal<CheckpointItem[]>([])

  isCancelling = computed(() => this.cancellableRequestService.isCancelling())
  createAbortSignal = () => this.cancellableRequestService.createAbortSignal()
  handleCancel = () => this.cancellableRequestService.handleCancel()
  resetCancelling = () => this.cancellableRequestService.resetCancelling()

  pendingHilRequests = signal<
    Array<{
      request_id: string
      request_data: Record<string, unknown>
      request_schema: JSONSchemaProperty
    }>
  >([])

  hilResponses = signal<Record<string, Record<string, unknown>>>({})

  itemOutputs = signal<Record<string, string>>({})
  currentStreamingItemId = signal<string | null>(null)
  workflowMetadata = signal<Record<string, unknown>>({})

  currentSession = computed(() => this.store.currentSession)
  availableSessions = computed(() => this.store.availableSessions)
  loadingSessions = computed(() => this.store.loadingSessions)
  runtime = computed(() => this.store.runtime)
  streamingEnabled = computed(() => this.store.streamingEnabled)

  readonly viewOptions = signal(
    (() => {
      const saved = localStorage.getItem('workflowViewOptions')
      const defaults = {
        showMinimap: false,
        showGrid: true,
        animateRun: false,
        consolidateBidirectionalEdges: true,
      }

      if (saved) {
        try {
          return { ...defaults, ...JSON.parse(saved) }
        } catch {
          return defaults
        }
      }
      return defaults
    })(),
  )

  readonly layoutDirection = signal<'LR' | 'TB'>(
    (localStorage.getItem('workflowLayoutDirection') as 'LR' | 'TB') || 'TB',
  )

  constructor() {
    effect(() => {
      localStorage.setItem('workflowViewOptions', JSON.stringify(this.viewOptions()))
    })

    effect(() => {
      localStorage.setItem('workflowLayoutDirection', this.layoutDirection())
    })

    effect(() => {
      const info = this.workflowInfo()
      const rt = this.runtime()

      if (info?.id) {
        untracked(() => {
          this.loadSessions()
        })
      }
    })

    effect(() => {
      const currentSession = this.currentSession()
      if (currentSession) {
        untracked(() => {
          this.loadCheckpoints()
        })
      }
    })

    effect((onCleanup) => {
      const workflow = this.selectedWorkflow()

      let isCancelled = false
      onCleanup(() => {
        isCancelled = true
      })

      untracked(async () => {
        this.openAIEvents.set([])
        this.isStreaming.set(false)
        this.selectedExecutorId.set(null)
        this.workflowResult.set('')
        this.workflowLoadError.set(null)
        this.currentStreamingItemId.set(null)
        this.workflowMetadata.set({})

        this.itemOutputs.set({})

        if (workflow?.type !== 'workflow') {
          this.workflowInfo.set(null)
          return
        }

        this.workflowLoading.set(true)

        try {
          const info = await this.apiClient.getWorkflowInfo(workflow.id)

          if (isCancelled) return

          this.workflowInfo.set(info)
        } catch (error) {
          if (isCancelled) return

          this.workflowInfo.set(null)
          const errorMessage = error instanceof Error ? error.message : String(error)
          this.workflowLoadError.set(errorMessage)
          console.error('Error loading workflow info:', error)
        } finally {
          if (!isCancelled) {
            this.workflowLoading.set(false)
          }
        }
      })
    })
  }

  updateOptions(newOptions: Partial<ReturnType<typeof this.viewOptions>>) {
    this.viewOptions.update((prev) => ({ ...prev, ...newOptions }))
  }

  toggleViewOption = (key: keyof typeof this.viewOptions) => {
    this.updateOptions({ [key]: !this.viewOptions()[key] })
  }

  handleReloadEntity = async () => {
    if (this.isReloading() || !this.selectedWorkflow()) return

    this.isReloading.set(true)

    try {
      // Call backend reload endpoint
      await this.apiClient.reloadEntity(this.selectedWorkflow().id)

      // Fetch updated workflow info
      const updatedWorkflow = await this.apiClient.getWorkflowInfo(this.selectedWorkflow().id)

      // Update store with fresh metadata
      this.store.updateWorkflow(updatedWorkflow)

      // Update local state
      this.workflowInfo.set(updatedWorkflow)

      // Show success toast
      this.store.addToast({
        message: `${this.selectedWorkflow().name} has been reloaded successfully`,
        type: 'success',
      })
    } catch (error) {
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Failed to reload entity'
      this.store.addToast({
        message: `Failed to reload: ${errorMessage}`,
        type: 'error',
        duration: 6000,
      })
    } finally {
      this.isReloading.set(false)
    }
  }

  handleSessionChange = async (session: any) => {
    if (!session || !this.workflowInfo()) return

    // Reset workflow view state when switching checkpoint storages
    this.openAIEvents.set([])
    this.isStreaming.set(false)
    this.wasCancelled.set(false)
    this.selectedExecutorId.set(null)
    this.timelineMinimized.set(false)
    this.workflowResult.set('')
    this.pendingHilRequests.set([])
    this.hilResponses.set({})
    this.itemOutputs.set({})
    this.currentStreamingItemId.set(null)
    this.workflowMetadata.set({})
  }

  loadSessions = async () => {
    const workflowInfo = this.workflowInfo()
    const runtime = this.runtime()
    const currentSession = this.currentSession()
    if (!workflowInfo) return

    this.store.setLoadingSessions(true)
    try {
      const response = await this.apiClient.listWorkflowSessions(workflowInfo.id)

      // If no sessions exist, auto-create one
      if (response.data.length === 0) {
        const newSession = await this.apiClient.createWorkflowSession(workflowInfo.id, {
          name: `Checkpoint Storage ${new Date().toLocaleString()}`,
        })
        this.store.setAvailableSessions([newSession])
        this.store.setCurrentSession(newSession)
      } else {
        // Sort by created_at descending (most recent first)
        const sortedSessions = [...response.data].sort((a, b) => b.created_at - a.created_at)

        this.store.setAvailableSessions(sortedSessions)

        // Auto-select most recent session if none selected (but keep current if it exists)
        if (!currentSession) {
          const firstSession = sortedSessions[0]
          this.store.setCurrentSession(firstSession)
          await this.handleSessionChange(firstSession)
        }
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)

      // Silently handle for .NET backend (doesn't support conversations yet)
      // Only show error for Python backend where this is unexpected
      if (runtime !== 'dotnet') {
        this.store.addToast({
          message: 'Failed to load sessions',
          type: 'error',
        })
      }
    } finally {
      this.store.setLoadingSessions(false)
    }
  }

  loadCheckpoints = async () => {
    const currentSession = this.currentSession()
    if (!currentSession) {
      this.sessionCheckpoints.set([])
      return
    }

    try {
      const response = await this.apiClient.listConversationItems(currentSession.conversation_id, {
        limit: 100,
      })
      const checkpointItems = response.data.filter(
        (item): item is CheckpointItem =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          (item as { type: string }).type === 'checkpoint',
      )
      this.sessionCheckpoints.set(checkpointItems)
    } catch (error) {
      console.error(
        `Failed to load checkpoints for session ${currentSession.conversation_id}:`,
        error,
      )
      this.sessionCheckpoints.set([])
    }
  }

  handleSessionSelect = async (sessionId: string) => {
    const session = this.availableSessions().find((s) => s.conversation_id === sessionId)
    if (session) {
      this.store.setCurrentSession(session)
      await this.handleSessionChange(session)
    }
  }

  handleNewSession = async () => {
    const workflowInfo = this.workflowInfo()
    if (!workflowInfo) return

    try {
      const newSession = await this.apiClient.createWorkflowSession(workflowInfo.id, {
        name: `Checkpoint Storage ${new Date().toLocaleString()}`,
      })

      // Debug logging
      console.log('[WorkflowView] Created new session:', newSession.conversation_id)
      console.log('[WorkflowView] Previous session:', this.currentSession()?.conversation_id)

      this.store.addSession(newSession)
      this.store.setCurrentSession(newSession)
      await this.handleSessionChange(newSession)

      // Force a small delay to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 100))

      this.store.addToast({ message: 'New checkpoint storage created', type: 'success' })
    } catch (error) {
      console.error('Failed to create checkpoint storage:', error)
      this.store.addToast({ message: 'Failed to create checkpoint storage', type: 'error' })
    }
  }

  handleDeleteSession = async () => {
    const currentSession = this.currentSession()
    const workflowInfo = this.workflowInfo()
    if (!currentSession || !workflowInfo) return

    if (!confirm('Delete this session? All checkpoints will be lost.')) return

    try {
      await this.apiClient.deleteWorkflowSession(workflowInfo.id, currentSession.conversation_id)
      this.store.removeSession(currentSession.conversation_id)
      this.store.addToast({ message: 'Session deleted', type: 'success' })
    } catch (error) {
      console.error('Failed to delete session:', error)
      this.store.addToast({ message: 'Failed to delete session', type: 'error' })
    }
  }

  workflowEvents = computed(() => {
    return this.openAIEvents().filter((event) => WORKFLOW_EVENT_TYPES.includes(event.type))
  })

  executorHistory = computed(() => {
    const history: Array<{
      executorId: string
      message: string
      timestamp: string
      status: 'running' | 'completed' | 'error'
    }> = []

    this.workflowEvents().forEach((event) => {
      // Handle new standard OpenAI events
      if (
        event.type === 'response.output_item.added' ||
        event.type === 'response.output_item.done'
      ) {
        const item = (event as ResponseOutputItemAddedEvent | ResponseOutputItemDoneEvent).item
        if (item && item.type === 'executor_action' && 'executor_id' in item && item.executor_id) {
          history.push({
            executorId: String(item.executor_id),
            message:
              event.type === 'response.output_item.added'
                ? 'Executor started'
                : item.status === 'completed'
                  ? 'Executor completed'
                  : item.status === 'failed'
                    ? 'Executor failed'
                    : 'Executor processing',
            timestamp: new Date().toISOString(),
            status:
              item.status === 'completed'
                ? 'completed'
                : item.status === 'failed'
                  ? 'error'
                  : 'running',
          })
        }
      }
      // Fallback: handle .complete variant for backwards compatibility
      else if (
        event.type === 'response.workflow_event.complete' &&
        'data' in event &&
        event.data &&
        typeof event.data === 'object'
      ) {
        const data = event.data as Record<string, unknown>
        if (data['executor_id'] != null) {
          history.push({
            executorId: String(data['executor_id']),
            message: String(data['event_type'] || 'Processing'),
            timestamp: String(data['timestamp'] || new Date().toISOString()),
            status: String(data['event_type'] || '').includes('Completed')
              ? 'completed'
              : String(data['event_type'] || '').includes('Error')
                ? 'error'
                : 'running',
          })
        }
      }
    })

    return history
  })

  activeExecutors = computed(() => {
    if (!this.isStreaming()) return []
    const recent = this.executorHistory()
      .filter((h) => h.status === 'running')
      .slice(-2)
    return recent.map((h) => h.executorId)
  })

  handleSendWorkflowData = async (inputData: Record<string, unknown>, checkpointId?: string) => {
    const selectedWorkflow = this.selectedWorkflow()
    if (!selectedWorkflow || selectedWorkflow.type !== 'workflow') return

    this.isStreaming.set(true)
    this.wasCancelled.set(false) // Reset cancelled state for new run
    this.openAIEvents.set([]) // Clear previous OpenAI events for new execution

    // Clear per-item outputs and metadata for new run
    this.workflowResult.set('')

    this.itemOutputs.set({})
    this.currentStreamingItemId.set(null)
    this.workflowMetadata.set({})

    // Clear HIL state for new workflow run
    this.pendingHilRequests.set([])
    this.hilResponses.set({})

    // Clear debug panel events for new workflow run
    this.debugEvent.emit('clear')

    // Create new AbortController for this request
    const signal = this.createAbortSignal()
    const currentSession = this.currentSession()
    try {
      // Debug logging to track conversation ID usage
      console.log('[WorkflowView] Running workflow with:')
      console.log('  - Current session ID:', currentSession?.conversation_id)
      console.log('  - Input data:', inputData)

      const request = {
        input_data: inputData,
        conversation_id: currentSession?.conversation_id || undefined, // Pass session conversation_id for checkpoint support
        checkpoint_id: checkpointId, // Pass checkpoint ID when resuming from a checkpoint
      }

      // Clear any previous streaming state before starting new workflow execution
      // Use conversation ID if available, otherwise use workflow ID
      if (currentSession?.conversation_id) {
        this.apiClient.clearStreamingState(currentSession.conversation_id)
      } else {
        this.apiClient.clearStreamingState(selectedWorkflow.id)
      }

      // Use OpenAI-compatible API streaming - direct event handling
      const streamGenerator = this.apiClient.streamWorkflowExecutionOpenAI(
        selectedWorkflow.id,
        request,
        signal,
      )

      for await (const openAIEvent of streamGenerator) {
        // Store workflow-related events for tracking
        if (WORKFLOW_EVENT_TYPES.includes(openAIEvent.type)) {
          this.openAIEvents.update((prev) => {
            // Generate unique timestamp for each event
            const baseTimestamp = Math.floor(Date.now() / 1000)
            const lastTimestamp =
              prev.length > 0
                ? (prev[prev.length - 1] as { _uiTimestamp?: number })._uiTimestamp || 0
                : 0
            const uniqueTimestamp = Math.max(baseTimestamp, lastTimestamp + 1)

            return [
              ...prev,
              {
                ...openAIEvent,
                _uiTimestamp: uniqueTimestamp,
              } as ExtendedResponseStreamEvent & { _uiTimestamp: number },
            ]
          })
        }

        // Pass to debug panel
        this.debugEvent.emit(openAIEvent)

        // Handle new standard OpenAI events
        if (openAIEvent.type === 'response.output_item.added') {
          const item = (openAIEvent as ResponseOutputItemAddedEvent).item

          // Handle executor action items
          if (item && item.type === 'executor_action' && item.executor_id && item.id) {
            // Track this item ID as the current streaming target
            this.currentStreamingItemId.set(item.id)
            // Initialize output for this specific item (not executor!)
            if (!this.itemOutputs()[item.id]) {
              this.itemOutputs()[item.id] = ''
            }
          }

          // Handle message items from Magentic agents (Option A implementation)
          if (
            item &&
            item.type === 'message' &&
            'metadata' in item &&
            (item['metadata'] as { source?: string } | undefined)?.source === 'magentic' &&
            item.id
          ) {
            // Track this message ID as the current streaming target for Magentic agents
            this.currentStreamingItemId.set(item.id)
            // Initialize output for this message
            if (!this.itemOutputs()[item.id]) {
              this.itemOutputs()[item.id] = ''
            }
          }

          // Handle workflow output messages (from ctx.yield_output) - different from agent messages
          if (
            item &&
            item.type === 'message' &&
            (!('metadata' in item) ||
              !(item['metadata'] as { source?: string } | undefined)?.source) &&
            'content' in item &&
            Array.isArray(item['content'])
          ) {
            // Extract text from message content
            for (const content of item['content'] as Array<{ type: string; text?: string }>) {
              if (content.type === 'output_text' && content.text) {
                const text = content.text // Capture for closure
                // Append to workflow result (support multiple yield_output calls)
                this.workflowResult.update((prev) => {
                  if (prev && prev.length > 0) {
                    // If there's existing output, add separator
                    return prev + '\n\n' + text
                  }
                  return text
                })

                // Try to parse as JSON for structured metadata
                try {
                  const parsed = JSON.parse(content.text)
                  if (typeof parsed === 'object' && parsed !== null) {
                    this.workflowMetadata.set(parsed)
                  }
                } catch {
                  // Not JSON, keep as text
                }
              }
            }
          }
        }

        // Handle workflow completion
        if (openAIEvent.type === 'response.completed') {
          // Workflow completed successfully
          // Final output is already in workflowResult from text streaming or output_item.added
        }

        // Handle workflow failure
        if (openAIEvent.type === 'response.failed') {
          // Error will be displayed in timeline
        }

        // Fallback support for workflow_event format (used for unhandled event types)
        if (
          openAIEvent.type === 'response.workflow_event.completed' &&
          'data' in openAIEvent &&
          openAIEvent.data
        ) {
          const data = openAIEvent.data as {
            event_type?: string
            data?: unknown
            executor_id?: string | null
          }

          // Track when executor starts (fallback for old workflow_event format)
          if (data.event_type === 'ExecutorInvokedEvent' && data.executor_id) {
            // Create synthetic item ID for fallback format (no real item.id available)
            const syntheticItemId = `fallback_${data.executor_id}_${Date.now()}`
            this.currentStreamingItemId.set(syntheticItemId)
            // Initialize output for this item
            if (!this.itemOutputs()[syntheticItemId]) {
              this.itemOutputs()[syntheticItemId] = ''
            }
          }

          // Handle workflow completion and output events
          if (
            (data.event_type === 'WorkflowCompletedEvent' ||
              data.event_type === 'WorkflowOutputEvent') &&
            data.data
          ) {
            // Store object data for metadata
            if (typeof data.data === 'object') {
              this.workflowMetadata.set(data.data as Record<string, unknown>)
            }
            this.currentStreamingItemId.set(null)
          }
        }

        // Handle text output - assign to current item (not executor!)
        if (
          openAIEvent.type === 'response.output_text.delta' &&
          'delta' in openAIEvent &&
          openAIEvent.delta
        ) {
          // Use the item_id from the event itself (for concurrent workflows)
          // Fall back to currentStreamingItemId for backwards compatibility
          const itemId = openAIEvent.item_id || this.currentStreamingItemId()

          if (itemId) {
            // Initialize item output if needed
            if (!this.itemOutputs()[itemId]) {
              this.itemOutputs()[itemId] = ''
            }

            // Append to specific ITEM's output (not all runs of this executor!)
            this.itemOutputs()[itemId] += openAIEvent.delta
          }
        }

        // Handle HIL (Human-in-the-Loop) requests
        if (openAIEvent.type === 'response.request_info.requested') {
          const hilEvent = openAIEvent as ResponseRequestInfoEvent

          this.pendingHilRequests.update((prev) => [
            ...prev,
            {
              request_id: hilEvent.request_id,
              request_data: hilEvent.request_data,
              request_schema: hilEvent.request_schema as unknown as JSONSchemaProperty,
            },
          ])

          // Initialize responses with default values from schema
          // For enum fields, set to first option; for other fields with defaults, use those
          const schema = hilEvent.request_schema as unknown as JSONSchemaProperty
          const defaultValues: Record<string, unknown> = {}

          if (schema.properties) {
            Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
              const field = fieldSchema as JSONSchemaProperty
              // Set default for enum fields to first option
              if (field.enum && field.enum.length > 0) {
                defaultValues[fieldName] = field.enum[0]
              }
              // Use explicit default value if provided
              else if (field.default !== undefined) {
                defaultValues[fieldName] = field.default
              }
            })
          }

          this.hilResponses.update((prev) => ({
            ...prev,
            [hilEvent.request_id]: defaultValues,
          }))
        }

        // Handle errors (ResponseErrorEvent - fallback error format)
        if (openAIEvent.type === 'error') {
          // Error will be displayed in timeline
          break
        }
      }

      this.isStreaming.set(false)
    } catch (error) {
      // Handle abort separately - don't show error message
      if (isAbortError(error)) {
        // User cancelled - just stop gracefully
        console.log('Workflow execution cancelled by user')
        this.wasCancelled.set(true) // Mark as cancelled for UI feedback
        // Leave the last state visible to show where workflow was when cancelled
        // Clear any pending HIL requests since workflow is cancelled
        this.pendingHilRequests.set([])
        this.hilResponses.set({})
      } else {
        // Other errors - log them
        console.error('Workflow execution error:', error)
      }
      this.isStreaming.set(false)
      this.resetCancelling()
    }
  }

  handleSendWorkflowDataSync = async (
    inputData: Record<string, unknown>,
    checkpointId?: string,
  ) => {
    const selectedWorkflow = this.selectedWorkflow()
    if (!selectedWorkflow || selectedWorkflow.type !== 'workflow') return

    this.isStreaming.set(false) // Not actually streaming
    this.wasCancelled.set(false)
    this.openAIEvents.set([])
    this.workflowResult.set('')
    this.itemOutputs.set({})
    this.currentStreamingItemId.set(null)
    this.workflowMetadata.set({})
    this.pendingHilRequests.set([])
    this.hilResponses.set({})
    this.debugEvent.emit('clear')

    try {
      const response = await this.apiClient.runWorkflowSync(selectedWorkflow.id, {
        input_data: inputData,
        conversation_id: this.currentSession()?.conversation_id || undefined,
        checkpoint_id: checkpointId,
      })

      // Extract workflow result from response output
      if (response.output) {
        for (const outputItem of response.output) {
          if (
            outputItem.type === 'message' &&
            'content' in outputItem &&
            Array.isArray(outputItem.content)
          ) {
            for (const content of outputItem.content as Array<{ type: string; text?: string }>) {
              if (content.type === 'output_text' && content.text) {
                this.workflowResult.update((prev) => {
                  if (prev && prev.length > 0) {
                    return prev + '\n\n' + content.text
                  }
                  return content.text || ''
                })

                // Try to parse as JSON for structured metadata
                try {
                  const parsed = JSON.parse(content.text || '')
                  if (typeof parsed === 'object' && parsed !== null) {
                    this.workflowMetadata.set(parsed)
                  }
                } catch {
                  // Not JSON, keep as text
                }
              }
            }
          }
        }
      }

      // Create a synthetic completion event for the timeline
      const completedEvent = {
        type: 'response.completed',
        response: response,
        sequence_number: 0,
      } as ExtendedResponseStreamEvent
      this.openAIEvents.set([completedEvent])
      this.debugEvent.emit(completedEvent)

      // Refetch checkpoints after completion
      await this.loadCheckpoints()
    } catch (error) {
      console.error('Workflow execution error:', error)

      // Create a synthetic error event for the timeline
      const errorMessage = error instanceof Error ? error.message : 'Workflow execution failed'
      const errorEvent: ExtendedResponseStreamEvent = {
        type: 'response.failed',
        response: {
          error: { message: errorMessage },
        },
        sequence_number: 0,
      } as ExtendedResponseStreamEvent
      this.openAIEvents.set([errorEvent])
      this.debugEvent.emit(errorEvent)
    }
  }

  handleWorkflowRun = async (inputData: Record<string, unknown>, checkpointId?: string) => {
    if (this.streamingEnabled()) {
      await this.handleSendWorkflowData(inputData, checkpointId)
    } else {
      await this.handleSendWorkflowDataSync(inputData, checkpointId)
    }
  }

  areAllHilResponsesValid = () => {
    // Check each pending request has a valid response
    for (const request of this.pendingHilRequests()) {
      const response = this.hilResponses()[request.request_id] || {}
      // Use the same validation logic as HilTimelineItem
      if (!validateSchemaForm(request.request_schema, response)) {
        return false
      }
    }
    return true
  }

  handleSubmitHilResponses = async () => {
    const selectedWorkflow = this.selectedWorkflow()
    if (!selectedWorkflow || selectedWorkflow.type !== 'workflow') return

    // Only submit if ALL forms are valid
    if (!this.areAllHilResponsesValid()) {
      console.warn('Cannot submit: Not all HIL forms are valid')
      return
    }

    this.isStreaming.set(true)

    // Clear pending HIL requests immediately after submission
    // They've been submitted, so we shouldn't show them anymore
    this.pendingHilRequests.set([])
    this.hilResponses.set({})

    // Create new AbortController for HIL submission
    const signal = this.createAbortSignal()

    try {
      // Create OpenAI request with workflow_hil_response content type
      const request = {
        input_data: [
          {
            type: 'message',
            content: [
              {
                type: 'workflow_hil_response',
                responses: this.hilResponses(),
              },
            ],
          },
        ] as unknown as Record<string, unknown>, // OpenAI Responses API format, cast to satisfy RunWorkflowRequest type
        conversation_id: this.currentSession()?.conversation_id || undefined,
        // checkpoint_id: undefined, // Checkpoint functionality currently disabled
      }

      // Use OpenAI-compatible API streaming to continue workflow
      const streamGenerator = this.apiClient.streamWorkflowExecutionOpenAI(
        selectedWorkflow.id,
        request,
        signal,
      )

      // Track if new HIL requests arrive during response processing
      let newHilRequestsArrived = false
      const newHilRequests = []

      for await (const openAIEvent of streamGenerator) {
        // Store workflow-related events
        if (
          openAIEvent.type === 'response.output_item.added' ||
          openAIEvent.type === 'response.output_item.done' ||
          openAIEvent.type === 'response.created' ||
          openAIEvent.type === 'response.in_progress' ||
          openAIEvent.type === 'response.completed' ||
          openAIEvent.type === 'response.failed' ||
          openAIEvent.type === 'response.workflow_event.completed'
        ) {
          this.openAIEvents.update((prev) => {
            // Generate unique timestamp for each event
            const baseTimestamp = Math.floor(Date.now() / 1000)
            const lastTimestamp =
              prev.length > 0
                ? (prev[prev.length - 1] as { _uiTimestamp?: number })._uiTimestamp || 0
                : 0
            const uniqueTimestamp = Math.max(baseTimestamp, lastTimestamp + 1)

            return [
              ...prev,
              {
                ...openAIEvent,
                _uiTimestamp: uniqueTimestamp,
              } as ExtendedResponseStreamEvent & { _uiTimestamp: number },
            ]
          })
        }

        // Pass to debug panel
        this.debugEvent.emit(openAIEvent)

        // Check for new HIL requests after sending responses - handles multi-round HIL
        if (openAIEvent.type === 'response.request_info.requested') {
          const hilEvent = openAIEvent as ResponseRequestInfoEvent
          newHilRequestsArrived = true

          // Cast to the correct type for setPendingHilRequests
          const typedHilEvent = {
            request_id: hilEvent.request_id,
            request_data: hilEvent.request_data,
            request_schema: hilEvent.request_schema as unknown as JSONSchemaProperty,
          }

          // Collect new requests (don't update state yet)
          newHilRequests.push(typedHilEvent)

          // Initialize response data with defaults from schema
          const schema = hilEvent.request_schema as unknown as JSONSchemaProperty
          const defaultValues: Record<string, unknown> = {}

          if (schema.properties) {
            Object.entries(schema.properties).forEach(([fieldName, fieldSchema]) => {
              const field = fieldSchema as JSONSchemaProperty
              // Set default for enum fields to first option
              if (field.enum && field.enum.length > 0) {
                defaultValues[fieldName] = field.enum[0]
              }
              // Use explicit default value if provided
              else if (field.default !== undefined) {
                defaultValues[fieldName] = field.default
              }
            })
          }

          this.hilResponses.update((prev) => ({
            ...prev,
            [hilEvent.request_id]: defaultValues,
          }))
        }

        // Handle workflow output items (from ctx.yield_output)
        if (openAIEvent.type === 'response.output_item.added') {
          const item = (openAIEvent as ResponseOutputItemAddedEvent).item

          // Handle executor action items
          if (item && item.type === 'executor_action' && item.executor_id && item.id) {
            this.currentStreamingItemId.set(item.id)
            if (!this.itemOutputs()[item.id]) {
              this.itemOutputs.update((prev) => ({
                ...prev,
                [item.id]: '',
              }))
            }
          }

          // Handle workflow output messages
          if (
            item &&
            item.type === 'message' &&
            'content' in item &&
            Array.isArray(item['content'])
          ) {
            // Extract text from message content
            for (const content of item['content'] as Array<{ type: string; text?: string }>) {
              if (content.type === 'output_text' && content.text) {
                const text = content.text // Capture for closure
                // Append to workflow result (support multiple yield_output calls)
                this.workflowResult.update((prev) => {
                  if (prev && prev.length > 0) {
                    // If there's existing output, add separator
                    return prev + '\n\n' + text
                  }
                  return text
                })

                // Try to parse as JSON for structured metadata
                try {
                  const parsed = JSON.parse(text)
                  if (typeof parsed === 'object' && parsed !== null) {
                    this.workflowMetadata.update((prev) => ({ ...prev, current: parsed }))
                  }
                } catch {
                  // Not JSON, keep as text
                }
              }
            }
          }
        }

        // Handle text output - assign to current item (not executor!)
        if (
          openAIEvent.type === 'response.output_text.delta' &&
          'delta' in openAIEvent &&
          openAIEvent.delta
        ) {
          const itemId = this.currentStreamingItemId()
          if (itemId) {
            if (!this.itemOutputs()[itemId]) {
              this.itemOutputs.update((prev) => ({
                ...prev,
                [itemId]: '',
              }))
            }
            this.itemOutputs.update((prev) => ({
              ...prev,
              [itemId]: prev[itemId] + openAIEvent.delta,
            }))
          }
        }

        // Handle completion
        if (openAIEvent.type === 'response.completed') {
          // Workflow completed successfully - refetch checkpoints
          await this.loadCheckpoints()
        }

        // Handle errors
        if (openAIEvent.type === 'response.failed') {
          // Error will be displayed in timeline - refetch checkpoints
          await this.loadCheckpoints()
        }
      }

      // Handle new HIL requests if any arrived during processing
      if (newHilRequestsArrived) {
        // Set the new pending requests
        this.pendingHilRequests.set(newHilRequests)
        // Note: HIL responses are already initialized when requests arrive (lines 1198-1201)
        // No need to reinitialize them here
      }

      // Stream is done - refetch checkpoints to update badge count
      this.isStreaming.set(false)
      await this.loadCheckpoints()
    } catch (error) {
      // Handle abort separately
      if (isAbortError(error)) {
        console.log('HIL submission cancelled by user')
        this.wasCancelled.set(true) // Mark as cancelled for UI feedback
      } else {
        // Other errors
        console.error('HIL submission error:', error)
      }
      this.isStreaming.set(false)
      this.resetCancelling()
      // Refetch checkpoints even on error/cancel
      await this.loadCheckpoints()
    }
  }

  scrollToHilForm = () => {
    const hilForm = document.querySelector('[data-hil-form]')
    hilForm?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }
}
