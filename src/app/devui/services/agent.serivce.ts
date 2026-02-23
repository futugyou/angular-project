import { Injectable, inject, signal } from '@angular/core'
import { ApiClient } from './api.service'
import { DevUIStore } from '../stores/devuiStore'
import { Conversation, AgentInfo, ExtendedResponseStreamEvent } from '../types'
import { loadStreamingState } from './streaming-state.service'

type DebugEventHandler = (event: ExtendedResponseStreamEvent | 'clear') => void

@Injectable({
  providedIn: 'root',
})
export class AgentConversationService {
  private apiClient = inject(ApiClient)
  protected readonly store = inject(DevUIStore)

  private accumulatedText = ''
  private currentMessageUsage: any = null
  private _conversationError = signal<{
    message: string
    code?: string
    type?: string
  } | null>(null)
  public conversationError = this._conversationError.asReadonly()

  private activeDebugHandler?: DebugEventHandler

  async onAgentChange(selectedAgent: AgentInfo | undefined, activeDebugHandler: DebugEventHandler) {
    this.store.setChatItems([])
    this.store.setIsStreaming(false)
    this.store.setCurrentConversation(undefined)
    this.activeDebugHandler = activeDebugHandler
    this.accumulatedText = ''

    if (!selectedAgent) return

    await this.loadConversations(selectedAgent)
  }

  private async loadConversations(agent: AgentInfo) {
    this.store.setLoadingConversations(true)

    try {
      try {
        const { data: conversations } = await this.apiClient.listConversations(agent.id)
        this.store.setAvailableConversations(conversations)

        if (conversations.length > 0) {
          const mostRecent = conversations[0]
          this.store.setCurrentConversation(mostRecent)
          await this.loadConversationItems(mostRecent, agent)
          return
        }
      } catch (e) {
        console.debug('Backend list not supported, falling back to localStorage')
      }

      const cachedKey = `devui_convs_${agent.id}`
      const cached = localStorage.getItem(cachedKey)
      if (cached) {
        try {
          const convs = JSON.parse(cached) as Conversation[]
          if (convs.length > 0) {
            // 验证后端是否存在
            await this.apiClient.listConversationItems(convs[0].id)
            this.store.setAvailableConversations(convs)
            this.store.setCurrentConversation(convs[0])
            this.store.setChatItems([])
            return
          }
        } catch {
          localStorage.removeItem(cachedKey)
        }
      }

      // --- Step 3: 创建新会话 ---
      const newConversation = await this.apiClient.createConversation({ agent_id: agent.id })
      this.store.setCurrentConversation(newConversation)
      this.store.setAvailableConversations([newConversation])
      this.store.setChatItems([])
      localStorage.setItem(`devui_convs_${agent.id}`, JSON.stringify([newConversation]))
    } catch (error: any) {
      this._conversationError.set({
        message: error?.message || 'Failed to initialize conversation',
        type: 'conversation_creation_error',
      })
    } finally {
      this.store.setLoadingConversations(false)
    }
  }

  private async loadConversationItems(conversation: Conversation, agent: AgentInfo) {
    try {
      let allItems: any[] = []
      let hasMore = true
      let after: string | undefined = undefined
      let storedTraces: any[] = []

      while (hasMore) {
        const result = await this.apiClient.listConversationItems(conversation.id, {
          order: 'asc',
          after,
        })
        allItems = [...allItems, ...result.data]
        hasMore = result.has_more

        if (result.metadata?.traces?.length) {
          storedTraces = result.metadata.traces
        }

        if (hasMore && result.data.length > 0) {
          after = (result.data as any[])?.at(-1)?.id
        }
      }

      this.store.setChatItems(allItems)

      if (storedTraces.length > 0) {
        this.activeDebugHandler?.('clear')
        storedTraces.forEach((trace) => {
          this.activeDebugHandler?.({
            type: 'response.trace.completed',
            data: trace,
            sequence_number: 0,
          })
        })
      }

      const state = loadStreamingState(conversation.id)
      if (state && !state.completed) {
        this.resumeStreamingLogic(state, conversation, agent, allItems)
      }
    } catch {
      this.store.setChatItems([])
    }
  }

  private async resumeStreamingLogic(
    state: any,
    conversation: Conversation,
    agent: AgentInfo,
    existingItems: any[],
  ) {
    this.accumulatedText = state.accumulatedText || ''
    const assistantMsg: any = {
      id: state.lastMessageId || `assistant-${Date.now()}`,
      type: 'message',
      role: 'assistant',
      content: this.accumulatedText ? [{ type: 'text', text: this.accumulatedText }] : [],
      status: 'in_progress',
    }

    this.store.setChatItems([...existingItems, assistantMsg])
    this.store.setIsStreaming(true)

    setTimeout(() => this.resumeStreaming(assistantMsg, conversation, agent), 100)
  }

  private async resumeStreaming(
    assistantMessage: any,
    conversation: Conversation,
    agent: AgentInfo,
  ) {
    const storedState = loadStreamingState(conversation.id)
    if (!storedState?.responseId) {
      this.store.setIsStreaming(false)
      return
    }

    try {
      const openAIRequest = {
        model: agent.id,
        input: [],
        stream: true,
        conversation: conversation.id,
      }

      const streamGenerator = this.apiClient.streamAgentExecutionOpenAIDirect(
        agent.id,
        openAIRequest,
        conversation.id,
        undefined,
        storedState.responseId,
      )

      for await (const event of streamGenerator) {
        this.activeDebugHandler?.(event)
        this.handleStreamEvent(event, assistantMessage)
      }

      const finalUsage = this.currentMessageUsage
      this.updateItemStatus(assistantMessage.id, 'completed', finalUsage)
      if (finalUsage) this.store.updateConversationUsage(finalUsage.total_tokens)
    } catch (error: any) {
      this.handleStreamError(assistantMessage.id, error)
    } finally {
      this.store.setIsStreaming(false)
      this.currentMessageUsage = null
    }
  }

  private handleStreamEvent(event: any, assistantMessage: any) {
    switch (event.type) {
      case 'response.completed': {
        const usage = event.response?.usage
        if (usage) {
          this.currentMessageUsage = {
            input_tokens: usage.input_tokens,
            output_tokens: usage.output_tokens,
            total_tokens: usage.total_tokens,
          }
        }
        break
      }

      case 'response.failed': {
        const error = event.response?.error
        const errorMessage = error
          ? typeof error === 'object' && 'message' in error
            ? (error as any).message
            : JSON.stringify(error)
          : 'Request failed'

        this.updateItemContent(
          assistantMessage.id,
          this.accumulatedText || errorMessage,
          'incomplete',
        )
        this.store.setIsStreaming(false)
        break
      }

      case 'response.function_approval.requested': {
        const currentApprovals = this.store.pendingApprovals
        this.store.setPendingApprovals([
          ...currentApprovals,
          {
            request_id: event.request_id,
            function_call: event.function_call,
          },
        ])
        break
      }

      case 'response.function_approval.responded': {
        const filteredApprovals = this.store.pendingApprovals.filter(
          (a) => a.request_id !== event.request_id,
        )
        this.store.setPendingApprovals(filteredApprovals)
        break
      }

      case 'error': {
        const errorMsg = event.message || 'An error occurred'
        this.updateItemContent(assistantMessage.id, this.accumulatedText || errorMsg, 'incomplete')
        this.store.setIsStreaming(false)
        break
      }

      case 'response.output_text.delta': {
        if (event.delta) {
          this.accumulatedText += event.delta
          this.updateItemContent(assistantMessage.id, this.accumulatedText, 'in_progress')
        }
        break
      }

      default:
        break
    }
  }

  private updateItemContent(id: string, text: string, status: any) {
    const items = this.store.chatItems.map((item) =>
      item.id === id && item.type === 'message'
        ? { ...item, content: [{ type: 'text', text }], status }
        : item,
    )
    this.store.setChatItems(items)
  }

  private updateItemStatus(id: string, status: any, usage?: any) {
    const items = this.store.chatItems.map((item) =>
      item.id === id && item.type === 'message' ? { ...item, status, usage } : item,
    )
    this.store.setChatItems(items)
  }

  private handleStreamError(id: string, error: any) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    this.updateItemContent(id, this.accumulatedText || msg, 'incomplete')
  }
}
