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
}
