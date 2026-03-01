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
  ResponseOutputItemDoneEvent,
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
  ResponseRequestInfoEvent,
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
    this.onDebugEvent()('clear')

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
        this.onDebugEvent()(openAIEvent)

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
    this.onDebugEvent()('clear')

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
      this.onDebugEvent()(completedEvent)

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
      this.onDebugEvent()(errorEvent)
    }
  }
}
