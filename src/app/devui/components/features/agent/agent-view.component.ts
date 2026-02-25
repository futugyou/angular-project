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
import { NgClass } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonComponent } from '../../ui/button.component'
import { ScrollAreaComponent } from '../../ui/scroll-area.component'
import { ChatMessageInputComponent } from '../../ui/chat-message-input.component'
import { OpenAIMessageRenderer } from './message-renderers/message-renderer.component'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select.component'

import { AgentDetailsModalComponent } from './agent-details-modal.component'
import { ApiClient } from '../../../services/api.service'
import { ConversationItemBubble } from './conversation-item-bubble.component'
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

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    ChatMessageInputComponent,
    NgIconComponent,
    NgClass,
    OpenAIMessageRenderer,
    ButtonComponent,
    ScrollAreaComponent,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
    AgentDetailsModalComponent,
    ConversationItemBubble,
    DragDropDirective,
  ],
  template: `<app-scroll-area class="h-[500px]">
    <div #areaViewport class="scroll-container">
      @for (item of chatItems(); track item.id) {
        <div class="message">{{ item.id }}</div>
      }
      <div #messagesEnd></div>
    </div>
  </app-scroll-area>`,
  host: {
    class: 'block',
  },
})
export class AeploymentModalComponent {
  selectedAgent = input.required<AgentInfo>()
  onDebugEvent = input.required<DebugEventHandler>()

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

  constructor() {
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
    effect(() => {}, { allowSignalWrites: true })
    effect(async () => {
      const agent = this.selectedAgent()
      if (!agent) return

      await this.chatService.onAgentChange(agent, this.onDebugEvent())
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
      this.onDebugEvent()('clear')

      // Update localStorage cache with new conversation
      const cachedKey = `devui_convs_${selectedAgent.id}`
      const updated = [newConversation, ...this.store.availableConversations]
      localStorage.setItem(cachedKey, JSON.stringify(updated))
    } catch (error) {
      // Failed to create conversation - show error to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation'
      this.conversationError.set({
        message: errorMessage,
        type: 'conversation_creation_error',
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

        this.onDebugEvent()('clear')
      }
    } catch (error) {
      console.error(error)
      alert('Failed to delete conversation. Please try again.')
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
    const addToast = this.store.addToast
    const updateAgent = this.store.updateAgent

    try {
      // Call backend reload endpoint
      await this.apiClient.reloadEntity(selectedAgent.id)

      // Fetch updated entity info
      const updatedAgent = await this.apiClient.getAgentInfo(selectedAgent.id)

      // Update store with fresh metadata
      updateAgent(updatedAgent)

      // Show success toast
      addToast({
        message: `${selectedAgent.name} has been reloaded successfully`,
        type: 'success',
      })
    } catch (error) {
      // Show error toast
      const errorMessage = error instanceof Error ? error.message : 'Failed to reload entity'
      addToast({
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
    this.onDebugEvent()('clear')

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
          this.onDebugEvent()(traceEvent)
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
        this.onDebugEvent()(openAIEvent)

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
}
