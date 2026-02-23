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
} from '../../../types'
import { ConversationMessage } from '../../../types/openai'
import { DevUIStore } from '../../../stores'
import { AgentConversationService } from '../../../services/agent.serivce'
import { CancellableRequestService } from '../../../services/cancellable-request.service'
import { DragDropDirective } from '../../../directives/drag-drop.directive'
import { loadStreamingState } from '../../../services/streaming-state.service'

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
}
