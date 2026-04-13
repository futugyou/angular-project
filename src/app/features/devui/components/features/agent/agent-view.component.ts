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
} from '@angular/core'
import { DatePipe, DecimalPipe, JsonPipe, NgClass, SlicePipe } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonComponent } from '@shared/ui/button'
import { ScrollAreaComponent } from '@shared/ui/scroll-area'
import { ChatMessageInputComponent } from '@src/app/features/devui/components/ui/chat-message-input.component'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'

import { SELECT_COMPONENTS } from '@shared/ui/select'
import { AgentDetailsModalComponent } from './agent-details-modal.component'
import { ApiClient } from '../../../services/api.service'
import { ConversationItemBubble } from './conversation-item-bubble.component'
import type {
  AgentInfo,
  RunAgentRequest,
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
import { CancellableRequestService } from '@shared/services/cancellable-request.service'
import { DragDropDirective } from '@shared/directives/drag-drop.directive'
import { loadStreamingState } from '../../../services/streaming-state.service'

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

type DebugEvent = ExtendedResponseStreamEvent | 'clear'

@Component({
  selector: 'app-agent-view',
  standalone: true,
  imports: [
    ChatMessageInputComponent,
    NgIconComponent,
    ButtonComponent,
    ScrollAreaComponent,
    ...SELECT_COMPONENTS,
    AgentDetailsModalComponent,
    ConversationItemBubble,
    DragDropDirective,
    SlicePipe,
    DecimalPipe,
    DatePipe,
    JsonPipe,
  ],
  template: `
    <div
      class="flex h-[calc(100vh-3.5rem)] flex-col relative"
      appDragDrop
      #dd="dragDrop"
      (filesDropped)="handleFiles($event)"
      [appDragDropDisabled]="isSubmitting()"
    >
      @if (dd.isDragOver()) {
        <div
          class="absolute inset-0 z-50 bg-blue-50/95 dark:bg-blue-950/95 backdrop-blur-sm flex items-center justify-center border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg m-2"
        >
          <div class="text-center p-8">
            <div class="text-blue-600 dark:text-blue-400 text-lg font-medium mb-2">
              Drop files here
            </div>
            <div class="text-blue-500/80 dark:text-blue-400/70 text-sm">
              Images, PDFs, audio, and other files
            </div>
          </div>
        </div>
      }

      <div class="border-b pb-2 p-4 shrink-0">
        <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-3">
          <div class="flex items-center gap-2 min-w-0">
            <h2 class="font-semibold text-sm truncate">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideBot" class="h-4 w-4 shrink-0" />
                <span class="truncate">
                  {{
                    oaiMode().enabled
                      ? 'Chat with ' + oaiMode().model
                      : 'Chat with ' + (selectedAgent().name || selectedAgent().id)
                  }}
                </span>
              </div>
            </h2>

            @if (!oaiMode().enabled && uiMode() === 'developer') {
              <button
                [appButton]
                variant="ghost"
                size="sm"
                (click)="detailsModalOpen.set(true)"
                class="h-6 w-6 p-0 shrink-0"
                title="View agent details"
              >
                <ng-icon name="lucideInfo" class="h-4 w-4  " />
              </button>

              @if (selectedAgent().source !== 'in_memory') {
                <button
                  [appButton]
                  variant="ghost"
                  size="sm"
                  (click)="handleReloadEntity()"
                  [disabled]="isReloading()"
                  class="h-6 w-6 p-0 shrink-0"
                  [title]="isReloading() ? 'Reloading...' : 'Reload entity code (hot reload)'"
                >
                  <ng-icon name="lucideRefreshCw" class="h-4 w-4" />
                </button>
              }
            }
          </div>

          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            @let conversation = currentConversation();
            @let usage = conversationUsage();
            <app-select
              [value]="conversation?.id || ''"
              (valueChange)="handleConversationSelect($event)"
              [disabled]="loadingConversations() || isSubmitting()"
              class="w-full sm:w-64"
            >
              <app-select-trigger>
                @if (conversation) {
                  <div class="flex items-center gap-2 text-xs">
                    <span>Conversation {{ conversation.id | slice: -8 }}</span>
                    @if (usage.total_tokens > 0) {
                      <span class="text-muted-foreground">•</span>
                      <span class="text-muted-foreground">
                        {{
                          usage.total_tokens >= 1000
                            ? (usage.total_tokens / 1000 | number: '1.1-1') + 'k'
                            : usage.total_tokens
                        }}
                        tokens
                      </span>
                    }
                  </div>
                } @else {
                  {{ loadingConversations() ? 'Loading...' : 'Select conversation' }}
                }
              </app-select-trigger>

              <app-select-content>
                <app-select-group>
                  @for (conversation of availableConversations(); track conversation.id) {
                    <app-select-item [value]="conversation.id">
                      <div class="flex items-center justify-between w-full">
                        <span>Conversation {{ conversation.id | slice: -8 }}</span>
                        @if (conversation.created_at) {
                          <span class="text-xs text-muted-foreground ml-3">
                            {{ conversation.created_at * 1000 | date: 'shortDate' }}
                          </span>
                        }
                      </div>
                    </app-select-item>
                  } @empty {
                    <div class="p-2 text-xs text-muted-foreground">No conversations</div>
                  }
                </app-select-group>
              </app-select-content>
            </app-select>

            <button
              [appButton]
              variant="outline"
              size="icon"
              (click)="conversation && handleDeleteConversation(conversation.id)"
              [disabled]="!conversation || isSubmitting()"
              [title]="
                conversation
                  ? 'Delete Conversation ' + (conversation.id | slice: -8)
                  : 'No conversation selected'
              "
            >
              <ng-icon name="lucideTrash2" class="h-4 w-4" />
            </button>

            <button
              [appButton]
              variant="outline"
              size="lg"
              (click)="handleNewConversation()"
              [disabled]="!selectedAgent() || isSubmitting()"
              class="whitespace-nowrap"
            >
              <ng-icon name="lucidePlus" class="h-4 w-4 mr-2" />
              <span class="hidden md:inline"> New Conversation</span>
            </button>
          </div>
        </div>

        @if (oaiMode().enabled) {
          <p class="text-sm text-muted-foreground">
            Using OpenAI model directly. Local agent tools and instructions are not applied.
          </p>
        } @else if (selectedAgent().description) {
          <p class="text-sm text-muted-foreground">
            {{ selectedAgent().description }}
          </p>
        }
      </div>

      @let conversationErrorValue = conversationError();
      @if (conversationErrorValue) {
        <div
          class="mx-4 mt-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-start gap-2"
        >
          <ng-icon name="lucideCircle" class="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-destructive">Failed to Create Conversation</div>
            <div class="text-xs text-destructive/90 mt-1 wrap-break-word">
              {{ conversationErrorValue.message }}
            </div>
            @if (conversationErrorValue.code) {
              <div class="text-xs text-destructive/70 mt-1">
                Error Code: {{ conversationErrorValue.code }}
              </div>
            }
          </div>
          <button
            (click)="conversationError.set(null)"
            class="text-destructive hover:text-destructive/80 shrink-0"
          >
            <ng-icon name="lucideX" class="h-4 w-4" />
          </button>
        </div>
      }

      <app-scroll-area class="flex-1 p-4 h-0" #areaViewport>
        <div class="space-y-4">
          @for (group of processedChatItems(); track group.id) {
            <app-conversation-item-bubble
              [item]="group.message"
              [toolCalls]="group.toolCalls"
              [toolResults]="group.toolResults"
            />
          } @empty {
            <div class="flex flex-col items-center justify-center h-32 text-center">
              <div class="text-muted-foreground text-sm">
                Start a conversation with {{ selectedAgent().name || selectedAgent().id }}
              </div>
              <div class="text-xs text-muted-foreground mt-1">Type a message below to begin</div>
            </div>
          }

          @if (wasCancelled() && !isStreaming()) {
            <div class="px-4 py-2">
              <div
                class="border rounded-lg border-orange-500/40 bg-orange-500/5 dark:bg-orange-500/10"
              >
                <div class="px-4 py-3 flex items-center gap-2">
                  <ng-icon
                    name="lucideSquare"
                    class="w-4 h-4 text-orange-500 dark:text-orange-400 fill-current"
                  />
                  <span class="font-medium text-sm text-orange-700 dark:text-orange-300"
                    >Response stopped by user</span
                  >
                </div>
              </div>
            </div>
          }

          <div #messagesEnd></div>
        </div>
      </app-scroll-area>

      @let pendingApprovalsValue = pendingApprovals();
      @if (pendingApprovalsValue.length > 0) {
        <div class="border-t bg-amber-50 dark:bg-amber-950/20 p-4 shrink-0">
          <div class="flex items-start gap-3">
            <ng-icon
              name="lucideAlertCircle"
              class="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-sm mb-2">Approval Required</h4>
              <div class="space-y-2">
                @for (approval of pendingApprovalsValue; track approval.request_id) {
                  <div
                    class="bg-white dark:bg-gray-900 rounded-lg p-3 border border-amber-200 dark:border-amber-900"
                  >
                    <div class="font-mono text-xs mb-3 break-all">
                      <span class="text-blue-600 dark:text-blue-400 font-semibold">{{
                        approval.function_call.name
                      }}</span>
                      <span class="text-gray-500">(</span>
                      <span class="text-gray-700 dark:text-gray-300">{{
                        approval.function_call.arguments | json
                      }}</span>
                      <span class="text-gray-500">)</span>
                    </div>
                    <div class="flex gap-2">
                      <button
                        [appButton]
                        size="sm"
                        (click)="onApprove(approval)"
                        class="flex-1 sm:flex-none"
                      >
                        <ng-icon name="lucideCheck" class="h-4 w-4 mr-1" />Approve
                      </button>
                      <button
                        [appButton]
                        size="sm"
                        variant="outline"
                        (click)="onReject(approval)"
                        class="flex-1 sm:flex-none"
                      >
                        <ng-icon name="lucideX" class="h-4 w-4 mr-1" />Reject
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }

      <div class="border-t shrink-0">
        <div class="p-4">
          <app-chat-message-input
            (onSubmit)="handleChatInputSubmit($event)"
            [isSubmitting]="isSubmitting()"
            [isStreaming]="isStreaming()"
            (onCancel)="handleCancel()"
            [isCancelling]="isCancelling()"
            [placeholder]="'Message ' + (selectedAgent().name || selectedAgent().id) + '...'"
            [showFileUpload]="true"
            [entityName]="selectedAgent().name || selectedAgent().id"
            [disabled]="!selectedAgent() || isSubmitting()"
            [externalFiles]="droppedFiles"
            (onExternalFilesProcessed)="clearDroppedFiles()"
          />
        </div>
      </div>

      <app-agent-details-modal
        [agent]="selectedAgent()"
        [open]="detailsModalOpen()"
        (onOpenChange)="detailsModalOpen.set($event)"
      />
    </div>
  `,
  host: {
    class: 'block',
  },
})
export class AgentViewModalComponent {
  selectedAgent = input.required<AgentInfo>()
  debugEvent = output<DebugEvent>()

  // Store Injection
  protected readonly store = inject(DevUIStore)
  private apiClient = inject(ApiClient)
  private cancellableRequestService = inject(CancellableRequestService)
  private chatService = inject(AgentConversationService)

  azureDeploymentEnabled = computed(() => this.store.azureDeploymentEnabled)

  // Check if deployment is truly supported (both feature flag and backend support)
  currentConversation = computed(() => this.store.currentConversation)
  availableConversations = computed(() => this.store.availableConversations)
  chatItems = computed(() => this.store.chatItems)
  isStreaming = computed(() => this.store.isStreaming)
  isSubmitting = computed(() => this.store.isSubmitting)
  loadingConversations = computed(() => this.store.loadingConversations)
  uiMode = computed(() => this.store.uiMode)
  conversationUsage = computed(() => this.store.conversationUsage)
  pendingApprovals = computed(() => this.store.pendingApprovals)
  oaiMode = computed(() => this.store.oaiMode)
  streamingEnabled = computed(() => this.store.streamingEnabled)

  detailsModalOpen = signal(false)
  conversationError = this.chatService.conversationError

  isReloading = signal(false)
  wasCancelled = signal(false)
  accumulatedTextRef = signal<string>('')

  currentMessageUsage = signal<{
    total_tokens: number
    input_tokens: number
    output_tokens: number
  } | null>(null)

  isCancelling = computed(() => this.cancellableRequestService.isCancelling())
  createAbortSignal = () => this.cancellableRequestService.createAbortSignal()
  handleCancel = () => this.cancellableRequestService.handleCancel()
  resetCancelling = () => this.cancellableRequestService.resetCancelling()

  readonly areaViewport = viewChild<ElementRef<HTMLDivElement>>('areaViewport')
  readonly messagesEnd = viewChild<ElementRef<HTMLDivElement>>('messagesEnd')
  private userJustSentMessage = false
  droppedFiles: File[] | undefined

  constructor() {
    this.chatService.debug$.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.debugEvent.emit(event)
    })

    effect(() => {
      const items = this.chatItems()
      const streaming = this.isStreaming()
      const container = this.areaViewport()?.nativeElement
      const endAnchor = this.messagesEnd()?.nativeElement

      if (!container || !endAnchor) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100

      const shouldScroll = this.userJustSentMessage || isNearBottom

      if (shouldScroll) {
        requestAnimationFrame(() => {
          endAnchor.scrollIntoView({
            behavior: streaming ? 'instant' : 'smooth',
          })

          untracked(() => {
            if (this.userJustSentMessage && !streaming) {
              this.userJustSentMessage = false
            }
          })
        })
      }
    })

    effect(async () => {
      const agent = this.selectedAgent()
      if (!agent) return

      await this.chatService.onAgentChange(agent)
    })
  }

  openUrl(url: string) {
    window.open(url, '_blank')
  }

  handleNewConversation = async () => {
    const selectedAgent = this.selectedAgent()
    if (!selectedAgent) return

    try {
      const newConversation = await this.apiClient.createConversation({
        agent_id: selectedAgent.id,
      })
      this.store.setCurrentConversation(newConversation)
      this.store.setAvailableConversations([newConversation, ...this.store.availableConversations])
      this.store.setChatItems([])
      this.store.setIsStreaming(false)
      this.chatService.conversationError.set(null) // Clear any previous errors
      // Reset conversation usage by setting it to initial state
      this.store.setConversationUsage({ total_tokens: 0, message_count: 0 })
      this.accumulatedTextRef.set('')

      // Clear debug panel for fresh conversation
      this.debugEvent.emit('clear')

      // Update localStorage cache with new conversation
      const cachedKey = `devui_convs_${selectedAgent.id}`
      const updated = [newConversation, ...this.store.availableConversations]
      localStorage.setItem(cachedKey, JSON.stringify(updated))

      this.store.addToast({
        message: 'Conversation created successfully',
        type: 'success',
      })
    } catch (error) {
      // Failed to create conversation - show error to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation'
      this.conversationError.set({
        message: errorMessage,
        type: 'conversation_creation_error',
      })

      this.store.addToast({
        message: 'Failed to create conversation: ' + errorMessage,
        type: 'error',
      })
    }
  }

  async handleDeleteConversation(conversationId: string, event?: MouseEvent): Promise<void> {
    if (event) {
      event.preventDefault()
      event.stopPropagation()
    }

    if (!confirm('Delete this conversation? This cannot be undone.')) {
      return
    }

    try {
      const success = await this.apiClient.deleteConversation(conversationId)

      if (success) {
        const updatedConversations = this.availableConversations().filter(
          (c) => c.id !== conversationId,
        )
        this.store.setAvailableConversations(updatedConversations)
        if (this.currentConversation()?.id === conversationId) {
          this.handleSelectionAfterDelete()
        }

        this.debugEvent.emit('clear')
        this.store.addToast({
          message: 'Conversation deleted successfully',
          type: 'success',
        })
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete conversation. Please try again.')
      this.store.addToast({
        message: 'Failed to delete conversation with ID: ' + conversationId,
        type: 'error',
      })
    }
  }

  private handleSelectionAfterDelete(): void {
    if (this.availableConversations().length > 0) {
      const nextConversation = this.availableConversations()[0]
      this.store.setCurrentConversation(nextConversation)
      this.resetChatState()
    } else {
      this.store.setCurrentConversation(undefined)
      this.resetChatState()

      this.store.setConversationUsage({ total_tokens: 0, message_count: 0 })
      this.accumulatedTextRef.set('')
    }
  }

  private resetChatState(): void {
    this.store.setChatItems([])
    this.store.setIsStreaming(false)
  }

  handleReloadEntity = async () => {
    const selectedAgent = this.selectedAgent()
    const isReloading = this.isReloading()
    if (isReloading || !selectedAgent) return

    this.isReloading.set(true)
    const updateAgent = this.store.updateAgent

    try {
      // Call backend reload endpoint
      await this.apiClient.reloadEntity(selectedAgent.id)

      // Fetch updated entity info
      const updatedAgent = await this.apiClient.getAgentInfo(selectedAgent.id)

      // Update store with fresh metadata
      updateAgent(updatedAgent)

      // Show success toast
      this.store.addToast({
        message: `${selectedAgent.name} has been reloaded successfully`,
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

  handleConversationSelect = async (conversationId: string) => {
    const conversation = this.availableConversations().find((c) => c.id === conversationId)
    if (!conversation) return

    this.store.setCurrentConversation(conversation)

    // Clear debug panel when switching conversations
    this.debugEvent.emit('clear')

    try {
      // Load conversation history from backend with pagination
      let allItems: unknown[] = []
      let hasMore = true
      let after: string | undefined = undefined
      let storedTraces: unknown[] = []

      while (hasMore) {
        const result = await this.apiClient.listConversationItems(conversationId, {
          order: 'asc', // Load in chronological order (oldest first)
          after,
        })
        allItems = allItems.concat(result.data)
        hasMore = result.has_more

        // Capture traces from metadata (only need from one response, they accumulate)
        if (result.metadata?.traces && result.metadata.traces.length > 0) {
          storedTraces = result.metadata.traces
        }

        // Get the last item's ID for pagination
        if (hasMore && result.data.length > 0) {
          const lastItem = result.data[result.data.length - 1] as { id?: string }
          after = lastItem.id
        }
      }

      // Use OpenAI ConversationItems directly (no conversion!)
      const items = allItems as ConversationItem[]

      this.store.setChatItems(items)
      this.store.setIsStreaming(false)

      // Restore stored traces as debug events for context inspection
      if (storedTraces.length > 0) {
        for (const trace of storedTraces) {
          // Convert stored trace back to ResponseTraceComplete event format
          const traceEvent: ExtendedResponseStreamEvent = {
            type: 'response.trace.completed',
            data: trace as Record<string, unknown>,
            sequence_number: 0, // Not used for display
          }
          this.debugEvent.emit(traceEvent)
        }
      }

      // Calculate usage from loaded items
      this.store.setConversationUsage({
        total_tokens: 0, // We don't have usage info in stored items
        message_count: items.length,
      })
      // Check for incomplete stream and restore accumulated text
      const state = loadStreamingState(conversationId)
      if (state?.accumulatedText) {
        this.accumulatedTextRef.set(state.accumulatedText)
        // Add assistant message with resumed text - streaming will continue automatically
        const assistantMsg: ConversationMessage = {
          id: `assistant-${Date.now()}`,
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: state.accumulatedText }],
          status: 'in_progress',
        }
        this.store.setChatItems([...items, assistantMsg])
        this.store.setIsStreaming(true)
      }

      // Scroll to bottom after loading conversation
      setTimeout(() => {
        const endAnchor = this.messagesEnd()?.nativeElement
        if (!endAnchor) return

        requestAnimationFrame(() => {
          endAnchor.scrollIntoView({ behavior: 'smooth' })
        })
      }, 100)
    } catch {
      // 404 means conversation doesn't exist or has no items yet
      // This can happen if server restarted (in-memory store cleared)
      console.debug(`No items found for conversation ${conversationId}, starting with empty chat`)
      this.store.setChatItems([])
      this.store.setIsStreaming(false)
      this.store.setConversationUsage({ total_tokens: 0, message_count: 0 })
    }

    this.accumulatedTextRef.set('')
  }

  handleApproval = async (request_id: string, approved: boolean) => {
    const approval = this.pendingApprovals().find((a) => a.request_id === request_id)
    if (!approval) return

    // Add user's decision as a visible message in the chat
    const messageTimestamp = Math.floor(Date.now() / 1000)
    const userDecisionMessage: ConversationMessage = {
      id: `user-approval-${Date.now()}`,
      type: 'message',
      role: 'user',
      content: [
        {
          type: 'function_approval_request',
          request_id: request_id,
          status: approved ? 'approved' : 'rejected',
          function_call: approval.function_call,
        } as MessageFunctionApprovalRequestContent,
      ],
      status: 'completed',
      created_at: messageTimestamp,
    }

    const currentItems = this.store.chatItems
    this.store.setChatItems([...currentItems, userDecisionMessage])

    // Create approval response in OpenAI-compatible format
    const approvalInput: ResponseInputParam = [
      {
        type: 'message', // CRITICAL: Must set type for backend to recognize it
        role: 'user',
        content: [
          {
            type: 'function_approval_response',
            request_id: request_id,
            approved: approved,
            function_call: approval.function_call,
          } as MessageFunctionApprovalResponseContent,
        ],
      },
    ]

    // Send approval response through the conversation
    const request: RunAgentRequest = {
      input: approvalInput,
      conversation_id: this.currentConversation()?.id,
    }

    // Remove from pending immediately
    this.store.setPendingApprovals(
      this.store.pendingApprovals.filter((a) => a.request_id !== request_id),
    )

    // Trigger send (we'll call this from the UI button handler)
    return request
  }

  handleSendMessage = async (request: RunAgentRequest) => {
    const selectedAgent = this.selectedAgent()
    if (!selectedAgent) return

    // Check if this is a function approval response (internal, don't show in chat)
    const isApprovalResponse = request.input.some(
      (inputItem) =>
        inputItem.type === 'message' &&
        Array.isArray(inputItem.content) &&
        inputItem.content.some((c) => c.type === 'function_approval_response'),
    )

    // Extract content from OpenAI format to create ConversationMessage
    const messageContent: MessageContent[] = []

    // Parse OpenAI ResponseInputParam to extract content
    for (const inputItem of request.input) {
      if (inputItem.type === 'message' && Array.isArray(inputItem.content)) {
        for (const contentItem of inputItem.content) {
          if (contentItem.type === 'input_text') {
            messageContent.push({
              type: 'text',
              text: contentItem.text,
            })
          } else if (contentItem.type === 'input_image') {
            messageContent.push({
              type: 'input_image',
              image_url: contentItem.image_url || '',
              detail: 'auto',
            })
          } else if (contentItem.type === 'input_file') {
            const fileItem = contentItem as ResponseInputFileParam
            messageContent.push({
              type: 'input_file',
              file_data: fileItem.file_data,
              filename: fileItem.filename,
            })
          }
        }
      }
    }

    // Capture timestamp once for both user and assistant messages
    const messageTimestamp = Math.floor(Date.now() / 1000) // Unix seconds

    // Only add user message to UI if it's not an approval response (internal messages)
    if (!isApprovalResponse && messageContent.length > 0) {
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'message',
        role: 'user',
        content: messageContent,
        status: 'completed',
        created_at: messageTimestamp,
      }

      this.store.setChatItems([...this.store.chatItems, userMessage])
    }

    this.store.setIsStreaming(true)

    // Create assistant message placeholder
    const assistantMessage: ConversationMessage = {
      id: `assistant-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: [], // Will be filled during streaming
      status: 'in_progress',
      created_at: messageTimestamp,
    }

    this.store.setChatItems([...this.store.chatItems, assistantMessage])
    try {
      // If no conversation selected, create one automatically
      let conversationToUse = this.currentConversation()
      if (!conversationToUse) {
        try {
          conversationToUse = await this.apiClient.createConversation({
            agent_id: selectedAgent.id,
          })
          this.store.setCurrentConversation(conversationToUse)
          this.store.setAvailableConversations([
            conversationToUse,
            ...this.store.availableConversations,
          ])
          this.conversationError.set(null) // Clear any previous errors
        } catch (error) {
          // Failed to create conversation - show error and stop execution
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to create conversation'
          this.conversationError.set({
            message: errorMessage,
            type: 'conversation_creation_error',
          })
          this.store.setIsSubmitting(false)
          this.store.setIsStreaming(false)
          return // Stop execution - can't send message without conversation
        }
      }

      // Clear any previous streaming state for this conversation before starting new message
      if (conversationToUse?.id) {
        this.apiClient.clearStreamingState(conversationToUse.id)
      }

      const apiRequest = {
        input: request.input,
        conversation_id: conversationToUse?.id,
      }

      // Clear text accumulator for new response
      this.accumulatedTextRef.set('')

      // Create new AbortController for this request
      const signal = this.createAbortSignal()

      // Use OpenAI-compatible API streaming - direct event handling
      const streamGenerator = this.apiClient.streamAgentExecutionOpenAI(
        selectedAgent.id,
        apiRequest,
        signal,
      )

      for await (const openAIEvent of streamGenerator) {
        // Pass all events to debug panel
        this.debugEvent.emit(openAIEvent)

        // Handle response.completed event (OpenAI standard)
        if (openAIEvent.type === 'response.completed') {
          const completedEvent = openAIEvent as ResponseCompletedEvent
          const usage = completedEvent.response?.usage

          if (usage) {
            this.currentMessageUsage.set({
              input_tokens: usage.input_tokens,
              output_tokens: usage.output_tokens,
              total_tokens: usage.total_tokens,
            })
          }
          continue // Continue processing other events
        }

        // Handle response.failed event (OpenAI standard)
        if (openAIEvent.type === 'response.failed') {
          const failedEvent = openAIEvent as ResponseFailedEvent
          const error = failedEvent.response?.error

          // Format error message with details
          let errorMessage = 'Request failed'
          if (error) {
            if (typeof error === 'object' && 'message' in error) {
              errorMessage = error.message as string
              if ('code' in error && error.code) {
                errorMessage += ` (Code: ${error.code})`
              }
            } else if (typeof error === 'string') {
              errorMessage = error
            }
          }

          // Update assistant message with error
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((item) =>
              item.id === assistantMessage.id && item.type === 'message'
                ? {
                    ...item,
                    content: [
                      {
                        type: 'text',
                        text: this.accumulatedTextRef() || errorMessage,
                      } as MessageTextContent,
                    ],
                    status: 'incomplete' as const,
                  }
                : item,
            ),
          )
          this.store.setIsStreaming(false)
          return // Exit stream processing on failure
        }

        // Handle function approval request events
        if (openAIEvent.type === 'response.function_approval.requested') {
          const approvalEvent = openAIEvent as ResponseFunctionApprovalRequestedEvent

          // Add to pending approvals (for popup)
          this.store.setPendingApprovals([
            ...this.store.pendingApprovals,
            {
              request_id: approvalEvent.request_id,
              function_call: approvalEvent.function_call,
            },
          ])

          // Also add to chat UI to show function call progress
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((item) => {
              if (item.id === assistantMessage.id && item.type === 'message') {
                return {
                  ...item,
                  content: [
                    ...item.content,
                    {
                      type: 'function_approval_request',
                      request_id: approvalEvent.request_id,
                      status: 'pending',
                      function_call: approvalEvent.function_call,
                    } as MessageFunctionApprovalRequestContent,
                  ],
                  status: 'in_progress' as const,
                }
              }
              return item
            }),
          )
          continue
        }

        // Handle function call arguments delta (streaming arguments)
        if (openAIEvent.type === 'response.function_call_arguments.delta') {
          const argsEvent = openAIEvent as ResponseFunctionCallArgumentsDelta

          // Update the function call item with accumulated arguments
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((item) => {
              if (item.type === 'function_call' && item.call_id === argsEvent.item_id) {
                return {
                  ...item,
                  arguments: (item.arguments || '') + (argsEvent.delta || ''),
                }
              }
              return item
            }),
          )
          continue
        }

        // Handle function result events (after function execution)
        if (openAIEvent.type === 'response.function_result.complete') {
          const resultEvent = openAIEvent as ResponseFunctionResultComplete

          // Add function result as a separate conversation item for clear visibility
          const functionResultItem: ConversationFunctionCallOutput = {
            id: `result-${Date.now()}`,
            type: 'function_call_output',
            call_id: resultEvent.call_id,
            output: resultEvent.output,
            status: resultEvent.status === 'completed' ? 'completed' : 'incomplete',
            created_at: Math.floor(Date.now() / 1000),
          }

          const currentItems = this.store.chatItems
          this.store.setChatItems([...currentItems, functionResultItem])
          continue
        }

        // Handle error events from the stream
        if (openAIEvent.type === 'error') {
          const errorEvent = openAIEvent as ExtendedResponseStreamEvent & {
            message?: string
          }
          const errorMessage = errorEvent.message || 'An error occurred'

          // Update assistant message with error and stop streaming
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((item) =>
              item.id === assistantMessage.id && item.type === 'message'
                ? {
                    ...item,
                    content: [
                      {
                        type: 'text',
                        text: errorMessage,
                      } as MessageTextContent,
                    ],
                    status: 'incomplete' as const,
                  }
                : item,
            ),
          )
          this.store.setIsStreaming(false)
          return // Exit stream processing early on error
        }

        // Handle output item added events (images, files, data, function calls)
        if (openAIEvent.type === 'response.output_item.added') {
          const outputItemEvent = openAIEvent as ResponseOutputItemAddedEvent
          const item = outputItemEvent.item

          // Handle function calls as separate conversation items
          if (item.type === 'function_call') {
            // Type assertion for function call - narrows from union type
            const funcCall = item as ResponseFunctionToolCall
            const functionCallItem: ConversationFunctionCall = {
              id: funcCall.id || `call-${Date.now()}`,
              type: 'function_call',
              name: funcCall.name,
              arguments: funcCall.arguments || '',
              call_id: funcCall.call_id,
              status: funcCall.status || 'in_progress',
              created_at: Math.floor(Date.now() / 1000),
            }

            const currentItems = this.store.chatItems
            this.store.setChatItems([...currentItems, functionCallItem])
            continue
          }

          // Add output items to assistant message content
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((chatItem) => {
              if (chatItem.id === assistantMessage.id && chatItem.type === 'message') {
                const existingContent = chatItem.content
                let newContent: MessageContent | null = null

                // Map output items to message content
                if (item.type === 'output_image') {
                  newContent = {
                    type: 'output_image',
                    image_url: item.image_url,
                    alt_text: item.alt_text,
                    mime_type: item.mime_type,
                  } as MessageOutputImage
                } else if (item.type === 'output_file') {
                  newContent = {
                    type: 'output_file',
                    filename: item.filename,
                    file_url: item.file_url,
                    file_data: item.file_data,
                    mime_type: item.mime_type,
                  } as MessageOutputFile
                } else if (item.type === 'output_data') {
                  newContent = {
                    type: 'output_data',
                    data: item.data,
                    mime_type: item.mime_type,
                    description: item.description,
                  } as MessageOutputData
                }

                // If we created new content, append it
                if (newContent) {
                  return {
                    ...chatItem,
                    content: [...existingContent, newContent],
                    status: 'in_progress' as const,
                  }
                }
              }
              return chatItem
            }),
          )
          continue // Continue to next event
        }

        // Handle text delta events for chat
        if (
          openAIEvent.type === 'response.output_text.delta' &&
          'delta' in openAIEvent &&
          openAIEvent.delta
        ) {
          this.accumulatedTextRef.update((prev) => (prev || '') + openAIEvent.delta)

          // Update assistant message with accumulated content
          // Preserve any existing non-text content (images, files, data)
          const currentItems = this.store.chatItems
          this.store.setChatItems(
            currentItems.map((item) => {
              if (item.id === assistantMessage.id && item.type === 'message') {
                // Keep existing non-text content, update text content
                const existingNonTextContent = item.content.filter((c) => c.type !== 'text')
                return {
                  ...item,
                  content: [
                    ...existingNonTextContent,
                    {
                      type: 'text',
                      text: this.accumulatedTextRef(),
                    } as MessageTextContent,
                  ],
                  status: 'in_progress' as const,
                }
              }
              return item
            }),
          )
        }

        // Handle completion/error by detecting when streaming stops
        // (Server will close the stream when done, so we'll exit the loop naturally)
      }

      // Stream ended - mark as complete
      // Usage is provided via response.completed event (OpenAI standard)
      const finalUsage = this.currentMessageUsage()

      const currentItems = this.store.chatItems
      this.store.setChatItems(
        currentItems.map((item) =>
          item.id === assistantMessage.id && item.type === 'message'
            ? {
                ...item,
                status: 'completed' as const,
                usage: finalUsage || undefined,
              }
            : item,
        ),
      )
      this.store.setIsStreaming(false)

      // Update conversation-level usage stats
      if (finalUsage) {
        this.store.updateConversationUsage(finalUsage.total_tokens)
      }

      // Reset usage for next message
      this.currentMessageUsage.set(null)
    } catch (error) {
      // Handle abort separately - don't show error message
      if (isAbortError(error)) {
        // User cancelled - mark as cancelled for UI feedback
        this.wasCancelled.set(true)
        // Mark the message as completed with what we have
        const currentItems = this.store.chatItems
        this.store.setChatItems(
          currentItems.map((item) =>
            item.id === assistantMessage.id && item.type === 'message'
              ? {
                  ...item,
                  status: this.accumulatedTextRef()
                    ? ('completed' as const)
                    : ('incomplete' as const),
                  // Keep whatever text we have accumulated
                  content: item.content,
                }
              : item,
          ),
        )
      } else {
        // Other errors - show error message
        const currentItems = this.store.chatItems
        this.store.setChatItems(
          currentItems.map((item) =>
            item.id === assistantMessage.id && item.type === 'message'
              ? {
                  ...item,
                  content: [
                    {
                      type: 'text',
                      text: `Error: ${
                        error instanceof Error ? error.message : 'Failed to get response'
                      }`,
                    } as MessageTextContent,
                  ],
                  status: 'incomplete' as const,
                }
              : item,
          ),
        )
      }
      this.store.setIsStreaming(false)
      this.resetCancelling()
    }
  }

  handleSendMessageSync = async (request: RunAgentRequest) => {
    const selectedAgent = this.selectedAgent()
    if (!selectedAgent) return

    // Check if this is a function approval response (internal, don't show in chat)
    const isApprovalResponse = request.input.some(
      (inputItem) =>
        inputItem.type === 'message' &&
        Array.isArray(inputItem.content) &&
        inputItem.content.some((c) => c.type === 'function_approval_response'),
    )

    // Extract content from OpenAI format to create ConversationMessage
    const messageContent: MessageContent[] = []

    // Parse OpenAI ResponseInputParam to extract content
    for (const inputItem of request.input) {
      if (inputItem.type === 'message' && Array.isArray(inputItem.content)) {
        for (const contentItem of inputItem.content) {
          if (contentItem.type === 'input_text') {
            messageContent.push({
              type: 'text',
              text: contentItem.text,
            })
          } else if (contentItem.type === 'input_image') {
            messageContent.push({
              type: 'input_image',
              image_url: contentItem.image_url || '',
              detail: 'auto',
            })
          } else if (contentItem.type === 'input_file') {
            const fileItem = contentItem as ResponseInputFileParam
            messageContent.push({
              type: 'input_file',
              file_data: fileItem.file_data,
              filename: fileItem.filename,
            })
          }
        }
      }
    }

    // Capture timestamp once for both user and assistant messages
    const messageTimestamp = Math.floor(Date.now() / 1000) // Unix seconds

    // Only add user message to UI if it's not an approval response (internal messages)
    if (!isApprovalResponse && messageContent.length > 0) {
      const userMessage: ConversationMessage = {
        id: `user-${Date.now()}`,
        type: 'message',
        role: 'user',
        content: messageContent,
        status: 'completed',
        created_at: messageTimestamp,
      }

      this.store.setChatItems([...this.store.chatItems, userMessage])
    }

    // Show loading state (but not streaming indicator)
    this.store.setIsSubmitting(true)
    try {
      // If no conversation selected, create one automatically
      let conversationToUse = this.currentConversation()
      if (!conversationToUse) {
        try {
          conversationToUse = await this.apiClient.createConversation({
            agent_id: selectedAgent.id,
          })
          this.store.setCurrentConversation(conversationToUse)
          this.store.setAvailableConversations([
            conversationToUse,
            ...this.store.availableConversations,
          ])
          this.conversationError.set(null)
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to create conversation'
          this.conversationError.set({
            message: errorMessage,
            type: 'conversation_creation_error',
          })
          this.store.setIsSubmitting(false)
          return
        }
      }

      // Call non-streaming API
      const response = await this.apiClient.runAgentSync(selectedAgent.id, {
        input: request.input,
        conversation_id: conversationToUse?.id,
      })

      // Extract content from response output
      const assistantContent: MessageContent[] = []
      const toolCalls: ConversationFunctionCall[] = []
      const toolResults: ConversationFunctionCallOutput[] = []

      if (response.output) {
        for (const outputItem of response.output) {
          if (outputItem.type === 'message') {
            // Extract message content
            const msgItem = outputItem as ResponseOutputMessage
            if (msgItem.content) {
              for (const content of msgItem.content) {
                if (content.type === 'output_text') {
                  assistantContent.push({
                    type: 'text',
                    text: (content as { text: string }).text,
                  } as MessageTextContent)
                } else if (content.type === 'output_image') {
                  assistantContent.push(content as unknown as MessageOutputImage)
                } else if (content.type === 'output_file') {
                  assistantContent.push(content as unknown as MessageOutputFile)
                } else if (content.type === 'output_data') {
                  assistantContent.push(content as unknown as MessageOutputData)
                }
              }
            }
          } else if (outputItem.type === 'function_call') {
            const funcCall = outputItem as unknown as ResponseFunctionToolCall
            toolCalls.push({
              id: funcCall.id || `call-${Date.now()}`,
              type: 'function_call',
              name: funcCall.name,
              arguments: funcCall.arguments || '',
              call_id: funcCall.call_id,
              status: funcCall.status || 'completed',
              created_at: messageTimestamp,
            })
          } else if (outputItem.type === 'function_call_output') {
            const resultItem = outputItem as unknown as { call_id: string; output: string }
            toolResults.push({
              id: `result-${Date.now()}`,
              type: 'function_call_output',
              call_id: resultItem.call_id,
              output: resultItem.output,
              status: 'completed',
              created_at: messageTimestamp,
            })
          }
        }
      }

      // Create assistant message with all content
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: assistantContent,
        status: 'completed',
        created_at: messageTimestamp,
        usage: response.usage
          ? {
              input_tokens: response.usage.input_tokens,
              output_tokens: response.usage.output_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
      }

      // Add all items to chat
      const currentItems = this.store.chatItems
      const newItems: ConversationItem[] = [
        ...currentItems,
        assistantMessage,
        ...toolCalls,
        ...toolResults,
      ]
      this.store.setChatItems(newItems)

      // Update conversation-level usage stats
      if (response.usage) {
        this.store.updateConversationUsage(response.usage.total_tokens)
      }

      // Send debug event with response completed
      this.debugEvent.emit({
        type: 'response.completed',
        response: response,
        sequence_number: 0,
      } as ExtendedResponseStreamEvent)
    } catch (error) {
      // Show error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to get response'
      const assistantMessage: ConversationMessage = {
        id: `assistant-${Date.now()}`,
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          } as MessageTextContent,
        ],
        status: 'incomplete',
        created_at: messageTimestamp,
      }

      const currentItems = this.store.chatItems
      this.store.setChatItems([...currentItems, assistantMessage])
    } finally {
      this.store.setIsSubmitting(false)
    }
  }

  handleChatInputSubmit = async (content: ResponseInputContent[]) => {
    const selectedAgent = this.selectedAgent()
    if (!selectedAgent || content.length === 0) return

    // Set flag to force scroll when user sends message
    this.userJustSentMessage = true
    this.wasCancelled.set(false) // Reset cancelled state for new message

    this.store.setIsSubmitting(true)

    try {
      // Create OpenAI Responses API format
      const openaiInput: ResponseInputParam = [
        {
          type: 'message',
          role: 'user',
          content,
        },
      ]

      const request = {
        input: openaiInput,
        conversation_id: this.currentConversation()?.id,
      }

      // Use streaming or non-streaming based on setting
      if (this.streamingEnabled()) {
        await this.handleSendMessage(request)
      } else {
        await this.handleSendMessageSync(request)
      }
    } finally {
      this.store.setIsSubmitting(false)
    }
  }

  processedChatItems = computed(() => {
    const items = this.chatItems()
    if (items.length === 0) return []

    const toolCallsByMessage = new Map<string, any[]>()
    const toolResultsByMessage = new Map<string, any[]>()

    let lastAssistantMessageId: string | null = null
    const orphanedToolCalls: any[] = []
    const orphanedToolResults: any[] = []

    for (const item of items) {
      if (item.type === 'message' && item.role === 'assistant') {
        if (!toolCallsByMessage.has(item.id)) {
          toolCallsByMessage.set(item.id, [])
          toolResultsByMessage.set(item.id, [])
        }

        if (orphanedToolCalls.length > 0) {
          toolCallsByMessage.get(item.id)?.push(...orphanedToolCalls)
          orphanedToolCalls.length = 0
        }

        if (orphanedToolResults.length > 0) {
          toolResultsByMessage.get(item.id)?.push(...orphanedToolResults)
          orphanedToolResults.length = 0
        }

        lastAssistantMessageId = item.id
      } else if (item.type === 'function_call') {
        if (lastAssistantMessageId) {
          toolCallsByMessage.get(lastAssistantMessageId)?.push(item)
        } else {
          orphanedToolCalls.push(item)
        }
      } else if (item.type === 'function_call_output') {
        if (lastAssistantMessageId) {
          toolResultsByMessage.get(lastAssistantMessageId)?.push(item)
        } else {
          orphanedToolResults.push(item)
        }
      } else if (item.type === 'message' && item.role === 'user') {
        lastAssistantMessageId = null
      }
    }

    return items
      .filter((item) => item.type === 'message')
      .map((item) => ({
        id: item.id,
        message: item,
        toolCalls: toolCallsByMessage.get(item.id) || [],
        toolResults: toolResultsByMessage.get(item.id) || [],
      }))
  })

  trackByItemId(index: number, item: any) {
    return item.id
  }

  async onApprove(approval: PendingApproval) {
    const request = await this.handleApproval(approval.request_id, true)
    if (request) {
      await this.handleSendMessage(request)
    }
  }

  async onReject(approval: PendingApproval) {
    const request = await this.handleApproval(approval.request_id, false)
    if (request) {
      await this.handleSendMessage(request)
    }
  }

  handleFiles(files: File[]) {
    this.droppedFiles = files
  }

  clearDroppedFiles() {
    this.droppedFiles = undefined
  }
}
