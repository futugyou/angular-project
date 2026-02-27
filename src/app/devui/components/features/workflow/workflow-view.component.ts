import {
  Component,
  computed,
  input,
  output,
  inject,
  effect,
  signal,
  viewChild,
  ElementRef,
  untracked,
  AfterViewInit,
  OnDestroy,
} from '@angular/core'
import { DatePipe, DecimalPipe, JsonPipe, NgClass, SlicePipe } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonComponent } from '../../ui/button.component'
import { ScrollAreaComponent } from '../../ui/scroll-area.component'
import { ChatMessageInputComponent } from '../../ui/chat-message-input.component'

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select.component'

import { ApiClient } from '../../../services/api.service'
import { WorkflowFlowComponent } from './workflow-flow.component'
import { CheckpointInfoModal } from './checkpoint-info-modal.component'
import { ExecutionTimelineComponent } from './execution-timeline.component'
import { SchemaFormRendererComponent } from './schema-form-renderer.component'
import type {
  AgentInfo,
  RunAgentRequest,
  Conversation,
  ExtendedResponseStreamEvent,
  ConversationItem,
  ResponseInputParam,
  MessageContent,
  ResponseInputFileParam,
  ResponseCompletedEvent,
  ResponseFailedEvent,
  MessageTextContent,
  ResponseFunctionResultComplete,
  ConversationFunctionCallOutput,
  ResponseOutputItemAddedEvent,
  ResponseFunctionToolCall,
  ConversationFunctionCall,
  ResponseInputContent,
  PendingApproval,
  WorkflowInfo,
  CheckpointItem,
  JSONSchemaProperty,
} from '../../../types'
import {
  ConversationMessage,
  MessageFunctionApprovalRequestContent,
  MessageFunctionApprovalResponseContent,
  MessageOutputData,
  MessageOutputFile,
  MessageOutputImage,
  ResponseFunctionApprovalRequestedEvent,
  ResponseFunctionCallArgumentsDelta,
  ResponseOutputMessage,
} from '../../../types/openai'
import { DevUIStore } from '../../../stores'
import { AgentConversationService } from '../../../services/agent.serivce'
import { CancellableRequestService } from '../../../services/cancellable-request.service'
import { DragDropDirective } from '../../../directives/drag-drop.directive'
import { loadStreamingState } from '../../../services/streaming-state.service'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

type DebugEventHandler = (event: ExtendedResponseStreamEvent | 'clear') => void

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

@Component({
  selector: 'app-workflow-view',
  standalone: true,
  imports: [
    NgClass,
    NgIconComponent,
    ChatMessageInputComponent,
    NgIconComponent,
    ButtonComponent,
    ScrollAreaComponent,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    WorkflowFlowComponent,
    ExecutionTimelineComponent,
    SchemaFormRendererComponent,
    CheckpointInfoModal,
    DragDropDirective,
    SlicePipe,
    DecimalPipe,
    DatePipe,
    JsonPipe,
  ],
  host: {
    class: 'block relative w-full h-full',
  },
  template: ` <div class="w-full h-full relative"></div> `,
})
export class WorkflowViewComponent {
  selectedWorkflow = input.required<WorkflowInfo>()
  onDebugEvent = input.required<DebugEventHandler>()

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

  readonly itemOutputs = viewChild<ElementRef<HTMLDivElement>>('itemOutputs')
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

        const itemOutputs = this.itemOutputs()?.nativeElement
        if (itemOutputs) {
          itemOutputs.innerHTML = ''
        }

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
    const itemOutputs = this.itemOutputs()?.nativeElement
    if (itemOutputs) {
      itemOutputs.innerHTML = ''
    }
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
}
