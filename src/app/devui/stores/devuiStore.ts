import type {
  AgentInfo,
  WorkflowInfo,
  ExtendedResponseStreamEvent,
  Conversation,
  PendingApproval,
  OAIProxyMode,
  WorkflowSession,
  CheckpointInfo,
} from '../types'
import type { ConversationItem } from '../types/openai'
import { AttachmentItem } from '../components/ui/types'

interface DevUIState {
  // Entity Management Slice
  agents: AgentInfo[]
  workflows: WorkflowInfo[]
  entities: (AgentInfo | WorkflowInfo)[] // Full list in backend order
  selectedAgent: AgentInfo | WorkflowInfo | undefined
  isLoadingEntities: boolean
  entityError: string | null

  // Conversation Slice (per-agent state)
  currentConversation: Conversation | undefined
  availableConversations: Conversation[]
  chatItems: ConversationItem[]
  isStreaming: boolean
  isSubmitting: boolean
  loadingConversations: boolean
  inputValue: string
  attachments: AttachmentItem[]
  conversationUsage: {
    total_tokens: number
    message_count: number
  }
  pendingApprovals: PendingApproval[]

  // Workflow Session Slice (workflow-specific session management)
  currentSession: WorkflowSession | undefined
  availableSessions: WorkflowSession[]
  sessionCheckpoints: CheckpointInfo[]
  loadingSessions: boolean
  loadingCheckpoints: boolean

  // UI Slice
  showDebugPanel: boolean
  debugPanelMinimized: boolean
  debugPanelWidth: number
  debugEvents: ExtendedResponseStreamEvent[]
  isResizing: boolean
  showToolCalls: boolean // UI setting to show/hide tool calls in chat
  streamingEnabled: boolean // Whether to use streaming mode for responses

  // Debug Panel Preferences (persisted)
  debugPanelTab: 'events' | 'traces' | 'tools' // Main debug panel tab
  debugTraceSubTab: 'spans' | 'context' // OTel Spans vs Context Inspector
  contextInspectorViewMode: 'tokens' | 'composition'
  contextInspectorCumulative: boolean

  // Modal Slice
  showAboutModal: boolean
  showGallery: boolean
  showDeployModal: boolean
  showEntityNotFoundToast: boolean

  // Toast Slice
  toasts: Array<{
    id: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    duration?: number
  }>

  // OpenAI Proxy Mode Slice
  oaiMode: OAIProxyMode

  // Server Meta Slice
  uiMode: 'developer' | 'user'
  runtime: 'python' | 'dotnet'
  serverCapabilities: {
    instrumentation: boolean
    openai_proxy: boolean
    deployment: boolean
  }
  authRequired: boolean
  serverVersion: string | null

  // Deployment Slice
  isDeploying: boolean
  deploymentLogs: string[]
  lastDeployment: {
    url: string
    authToken: string
  } | null
  azureDeploymentEnabled: boolean // Feature flag for Azure deployment
}

// ========================================
// Actions Interface
// ========================================

interface DevUIActions {
  // Entity Actions
  setAgents: (agents: AgentInfo[]) => void
  setWorkflows: (workflows: WorkflowInfo[]) => void
  setEntities: (entities: (AgentInfo | WorkflowInfo)[]) => void
  setSelectedAgent: (agent: AgentInfo | WorkflowInfo | undefined) => void
  addAgent: (agent: AgentInfo) => void
  addWorkflow: (workflow: WorkflowInfo) => void
  updateAgent: (agent: AgentInfo) => void
  updateWorkflow: (workflow: WorkflowInfo) => void
  removeEntity: (entityId: string) => void
  setEntityError: (error: string | null) => void
  setIsLoadingEntities: (loading: boolean) => void

  // Conversation Actions
  setCurrentConversation: (conv: Conversation | undefined) => void
  setAvailableConversations: (convs: Conversation[]) => void
  setChatItems: (items: ConversationItem[]) => void
  setIsStreaming: (streaming: boolean) => void
  setIsSubmitting: (submitting: boolean) => void
  setLoadingConversations: (loading: boolean) => void
  setInputValue: (value: string) => void
  setAttachments: (files: AttachmentItem[]) => void
  updateConversationUsage: (tokens: number) => void
  setPendingApprovals: (approvals: PendingApproval[]) => void

  // Workflow Session Actions
  setCurrentSession: (session: WorkflowSession | undefined) => void
  setAvailableSessions: (sessions: WorkflowSession[]) => void
  setSessionCheckpoints: (checkpoints: CheckpointInfo[]) => void
  setLoadingSessions: (loading: boolean) => void
  setLoadingCheckpoints: (loading: boolean) => void
  addSession: (session: WorkflowSession) => void
  removeSession: (conversationId: string) => void

  // UI Actions
  setShowDebugPanel: (show: boolean) => void
  setDebugPanelMinimized: (minimized: boolean) => void
  setDebugPanelWidth: (width: number) => void
  addDebugEvent: (event: ExtendedResponseStreamEvent) => void
  clearDebugEvents: () => void
  setIsResizing: (resizing: boolean) => void
  setShowToolCalls: (show: boolean) => void
  setStreamingEnabled: (enabled: boolean) => void

  // Debug Panel Preference Actions
  setDebugPanelTab: (tab: 'events' | 'traces' | 'tools') => void
  setDebugTraceSubTab: (tab: 'spans' | 'context') => void
  setContextInspectorViewMode: (mode: 'tokens' | 'composition') => void
  setContextInspectorCumulative: (cumulative: boolean) => void

  // Modal Actions
  setShowAboutModal: (show: boolean) => void
  setShowGallery: (show: boolean) => void
  setShowDeployModal: (show: boolean) => void
  setShowEntityNotFoundToast: (show: boolean) => void

  // Toast Actions
  addToast: (toast: {
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
    duration?: number
  }) => void
  removeToast: (id: string) => void

  // OpenAI Proxy Mode Actions
  setOAIMode: (config: OAIProxyMode) => void
  toggleOAIMode: () => void

  // Server Meta Actions
  setServerMeta: (meta: {
    uiMode: 'developer' | 'user'
    runtime: 'python' | 'dotnet'
    capabilities: { instrumentation: boolean; openai_proxy: boolean; deployment: boolean }
    authRequired: boolean
    version?: string
  }) => void

  // Deployment Actions
  startDeployment: () => void
  addDeploymentLog: (log: string) => void
  setDeploymentResult: (result: { url: string; authToken: string }) => void
  stopDeployment: () => void
  clearDeploymentState: () => void
  setAzureDeploymentEnabled: (enabled: boolean) => void

  // Combined Actions (handle multiple state updates + side effects)
  selectEntity: (entity: AgentInfo | WorkflowInfo) => void
}

import { Injectable, signal, effect, inject } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class DevUIStore implements DevUIActions {
  private _state = signal<DevUIState>({
    agents: [],
    workflows: [],
    entities: [],
    selectedAgent: undefined,
    isLoadingEntities: true,
    entityError: null,

    // Conversation State
    currentConversation: undefined,
    availableConversations: [],
    chatItems: [],
    isStreaming: false,
    isSubmitting: false,
    loadingConversations: false,
    inputValue: '',
    attachments: [],
    conversationUsage: { total_tokens: 0, message_count: 0 },
    pendingApprovals: [],

    // Workflow Session State
    currentSession: undefined,
    availableSessions: [],
    sessionCheckpoints: [],
    loadingSessions: false,
    loadingCheckpoints: false,

    // UI State
    showDebugPanel: true,
    debugPanelMinimized: false,
    debugPanelWidth: 320,
    debugEvents: [],
    isResizing: false,
    showToolCalls: true, // Default to showing tool calls
    streamingEnabled: true, // Default to streaming mode (recommended)

    // Debug Panel Preferences (persisted)
    debugPanelTab: 'events', // Default to events tab
    debugTraceSubTab: 'spans', // Default to spans sub-tab
    contextInspectorViewMode: 'tokens', // Default to tokens view
    contextInspectorCumulative: false, // Default to per-message view

    // Modal State
    showAboutModal: false,
    showGallery: false,
    showDeployModal: false,
    showEntityNotFoundToast: false,

    // Toast State
    toasts: [],

    // OpenAI Proxy Mode State
    oaiMode: {
      enabled: false,
      model: 'gpt-4o-mini', // Default to cheaper model
    },

    // Server Meta State
    uiMode: 'developer', // Default to developer mode
    runtime: 'python', // Default to Python runtime
    serverCapabilities: {
      instrumentation: false,
      openai_proxy: false,
      deployment: false,
    },
    authRequired: false,
    serverVersion: null,
    isDeploying: false,
    deploymentLogs: [],
    lastDeployment: null,
    azureDeploymentEnabled: false,
  })

  get agents() {
    return this._state().agents
  }
  get workflows() {
    return this._state().workflows
  }
  get selectedAgent() {
    return this._state().selectedAgent
  }
  get entityError() {
    return this._state().entityError
  }
  get isLoadingEntities() {
    return this._state().isLoadingEntities
  }
  get currentConversation() {
    return this._state().currentConversation
  }
  get availableConversations() {
    return this._state().availableConversations
  }
  get chatItems() {
    return this._state().chatItems
  }
  get isStreaming() {
    return this._state().isStreaming
  }
  get isSubmitting() {
    return this._state().isSubmitting
  }
  get loadingConversations() {
    return this._state().loadingConversations
  }
  get inputValue() {
    return this._state().inputValue
  }
  get attachments() {
    return this._state().attachments
  }
  get conversationUsage() {
    return this._state().conversationUsage
  }
  get pendingApprovals() {
    return this._state().pendingApprovals
  }
  get currentSession() {
    return this._state().currentSession
  }
  get availableSessions() {
    return this._state().availableSessions
  }
  get sessionCheckpoints() {
    return this._state().sessionCheckpoints
  }
  get loadingSessions() {
    return this._state().loadingSessions
  }
  get loadingCheckpoints() {
    return this._state().loadingCheckpoints
  }
  get showDebugPanel() {
    return this._state().showDebugPanel
  }
  get debugPanelMinimized() {
    return this._state().debugPanelMinimized
  }
  get debugPanelWidth() {
    return this._state().debugPanelWidth
  }
  get showToolCalls() {
    return this._state().showToolCalls
  }
  get streamingEnabled() {
    return this._state().streamingEnabled
  }
  get debugEvents() {
    return this._state().debugEvents
  }
  get isResizing() {
    return this._state().isResizing
  }
  get debugPanelTab() {
    return this._state().debugPanelTab
  }
  get debugTraceSubTab() {
    return this._state().debugTraceSubTab
  }
  get contextInspectorViewMode() {
    return this._state().contextInspectorViewMode
  }
  get contextInspectorCumulative() {
    return this._state().contextInspectorCumulative
  }
  get showAboutModal() {
    return this._state().showAboutModal
  }
  get showGallery() {
    return this._state().showGallery
  }
  get showDeployModal() {
    return this._state().showDeployModal
  }
  get showEntityNotFoundToast() {
    return this._state().showEntityNotFoundToast
  }
  get toasts() {
    return this._state().toasts
  }
  get oaiMode() {
    return this._state().oaiMode
  }
  get uiMode() {
    return this._state().uiMode
  }
  get runtime() {
    return this._state().runtime
  }
  get serverCapabilities() {
    return this._state().serverCapabilities
  }
  get authRequired() {
    return this._state().authRequired
  }
  get serverVersion() {
    return this._state().serverVersion
  }
  get isDeploying() {
    return this._state().isDeploying
  }
  get deploymentLogs() {
    return this._state().deploymentLogs
  }
  get lastDeployment() {
    return this._state().lastDeployment
  }
  get azureDeploymentEnabled() {
    return this._state().azureDeploymentEnabled
  }

  setAgents = (agents: any[]) => this.patch({ agents })

  setSelectedAgent = (agent: any) => this.patch({ selectedAgent: agent })

  addAgent = (agent: any) => this.patch({ agents: [...this.agents, agent] })

  addWorkflow = (workflow: any) => this.patch({ workflows: [...this.workflows, workflow] })

  updateAgent = (updatedAgent: any) => {
    const s = this._state()
    this.patch({
      agents: s.agents.map((a: any) => (a.id === updatedAgent.id ? updatedAgent : a)),
      selectedAgent:
        s.selectedAgent?.id === updatedAgent.id && s.selectedAgent?.type === 'agent'
          ? updatedAgent
          : s.selectedAgent,
    })
  }

  updateWorkflow = (updatedWorkflow: any) => {
    const s = this._state()
    this.patch({
      workflows: s.workflows.map((w: any) => (w.id === updatedWorkflow.id ? updatedWorkflow : w)),
      selectedAgent:
        s.selectedAgent?.id === updatedWorkflow.id && s.selectedAgent?.type === 'workflow'
          ? updatedWorkflow
          : s.selectedAgent,
    })
  }

  removeEntity = (entityId: string) => {
    const s = this._state()
    this.patch({
      agents: s.agents.filter((a: any) => a.id !== entityId),
      workflows: s.workflows.filter((w: any) => w.id !== entityId),
      selectedAgent: s.selectedAgent?.id === entityId ? undefined : s.selectedAgent,
    })
  }

  setEntityError = (error: any) => this.patch({ entityError: error })
  setIsLoadingEntities = (loading: boolean) => this.patch({ isLoadingEntities: loading })
  setCurrentConversation = (conv: any) => this.patch({ currentConversation: conv })
  setAvailableConversations = (convs: any[]) => this.patch({ availableConversations: convs })
  setChatItems = (items: any[]) => this.patch({ chatItems: items })
  setIsStreaming = (streaming: boolean) => this.patch({ isStreaming: streaming })
  setIsSubmitting = (submitting: boolean) => this.patch({ isSubmitting: submitting })
  setLoadingConversations = (loading: boolean) => this.patch({ loadingConversations: loading })
  setInputValue = (value: string) => this.patch({ inputValue: value })
  setAttachments = (files: any[]) => this.patch({ attachments: files })
  setWorkflows = (workflows: WorkflowInfo[]) => this.patch({ workflows })
  setEntities = (entities: (AgentInfo | WorkflowInfo)[]) => this.patch({ entities })

  updateConversationUsage = (tokens: number) => {
    const s = this._state()
    this.patch({
      conversationUsage: {
        total_tokens: s.conversationUsage.total_tokens + tokens,
        message_count: s.conversationUsage.message_count + 1,
      },
    })
  }

  setConversationUsage = ({
    total_tokens,
    message_count,
  }: {
    total_tokens: number
    message_count: number
  }) => {
    const s = this._state()
    this.patch({
      conversationUsage: {
        total_tokens: total_tokens,
        message_count: message_count,
      },
    })
  }

  setPendingApprovals = (approvals: any[]) => this.patch({ pendingApprovals: approvals })
  setCurrentSession = (session: any) => this.patch({ currentSession: session })
  setAvailableSessions = (sessions: any[]) => this.patch({ availableSessions: sessions })
  setSessionCheckpoints = (checkpoints: any[]) => this.patch({ sessionCheckpoints: checkpoints })
  setLoadingSessions = (loading: boolean) => this.patch({ loadingSessions: loading })
  setLoadingCheckpoints = (loading: boolean) => this.patch({ loadingCheckpoints: loading })

  addSession = (session: any) =>
    this.patch({ availableSessions: [session, ...this.availableSessions] })

  removeSession = (conversationId: string) => {
    const s = this._state()
    const isCurrent = s.currentSession?.conversation_id === conversationId
    this.patch({
      availableSessions: s.availableSessions.filter(
        (s: any) => s.conversation_id !== conversationId,
      ),
      currentSession: isCurrent ? undefined : s.currentSession,
      sessionCheckpoints: isCurrent ? [] : s.sessionCheckpoints,
    })
  }

  setShowDebugPanel = (show: boolean) => this.patch({ showDebugPanel: show })
  setDebugPanelMinimized = (minimized: boolean) => this.patch({ debugPanelMinimized: minimized })
  setDebugPanelWidth = (width: number) => this.patch({ debugPanelWidth: width })
  setShowToolCalls = (show: boolean) => this.patch({ showToolCalls: show })
  setStreamingEnabled = (enabled: boolean) => this.patch({ streamingEnabled: enabled })

  addDebugEvent = (event: any) => {
    const state = this._state()
    const baseTimestamp = Math.floor(Date.now() / 1000)
    const lastEvent =
      state.debugEvents.length > 0 ? (state.debugEvents[state.debugEvents.length - 1] as any) : null
    const lastTimestamp = lastEvent?._uiTimestamp ?? 0
    const uniqueTimestamp = Math.max(baseTimestamp, lastTimestamp + 1)

    this.patch({
      debugEvents: [
        ...state.debugEvents,
        {
          ...event,
          _uiTimestamp: event.created_at ? event.created_at : uniqueTimestamp,
        },
      ],
    })
  }

  clearDebugEvents = () => this.patch({ debugEvents: [] })
  setIsResizing = (resizing: boolean) => this.patch({ isResizing: resizing })
  setDebugPanelTab = (tab: string) => this.patch({ debugPanelTab: tab })
  setDebugTraceSubTab = (tab: string) => this.patch({ debugTraceSubTab: tab })
  setContextInspectorViewMode = (mode: string) => this.patch({ contextInspectorViewMode: mode })
  setContextInspectorCumulative = (cumulative: boolean) =>
    this.patch({ contextInspectorCumulative: cumulative })

  setShowAboutModal = (show: boolean) => this.patch({ showAboutModal: show })
  setShowGallery = (show: boolean) => this.patch({ showGallery: show })
  setShowDeployModal = (show: boolean) => this.patch({ showDeployModal: show })
  setShowEntityNotFoundToast = (show: boolean) => this.patch({ showEntityNotFoundToast: show })

  addToast = (toast: any) => {
    this.patch({
      toasts: [
        ...this.toasts,
        {
          id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: toast.type || 'info',
          duration: toast.duration || 4000,
          ...toast,
        },
      ],
    })
  }

  removeToast = (id: string) => this.patch({ toasts: this.toasts.filter((t: any) => t.id !== id) })

  setOAIMode = (config: any) => {
    const s = this._state()
    if (config.enabled !== s.oaiMode.enabled) {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('devui_convs_')) localStorage.removeItem(key)
      })
      this.patch({
        oaiMode: config,
        currentConversation: undefined,
        availableConversations: [],
        chatItems: [],
        inputValue: '',
        attachments: [],
        conversationUsage: { total_tokens: 0, message_count: 0 },
        isStreaming: false,
        isSubmitting: false,
        pendingApprovals: [],
        debugEvents: [],
      })
    } else {
      this.patch({ oaiMode: config })
    }
  }

  toggleOAIMode = () => {
    const newEnabled = !this.oaiMode.enabled
    this.setOAIMode({ ...this.oaiMode, enabled: newEnabled })
  }

  setServerMeta = (meta: any) =>
    this.patch({
      uiMode: meta.uiMode,
      runtime: meta.runtime,
      serverCapabilities: meta.capabilities,
      authRequired: meta.authRequired,
      serverVersion: meta.version || null,
    })

  startDeployment = () =>
    this.patch({
      isDeploying: true,
      deploymentLogs: [],
      lastDeployment: null,
    })

  addDeploymentLog = (log: any) =>
    this.patch({ deploymentLogs: [...this._state().deploymentLogs, log] })

  setDeploymentResult = (result: any) =>
    this.patch({
      isDeploying: false,
      lastDeployment: result,
    })

  stopDeployment = () => this.patch({ isDeploying: false })

  clearDeploymentState = () =>
    this.patch({
      isDeploying: false,
      deploymentLogs: [],
      lastDeployment: null,
    })

  setAzureDeploymentEnabled = (enabled: boolean) => this.patch({ azureDeploymentEnabled: enabled })

  selectEntity = (entity: any) => {
    this.patch({
      selectedAgent: entity,
      currentConversation: undefined,
      availableConversations: [],
      chatItems: [],
      inputValue: '',
      attachments: [],
      conversationUsage: { total_tokens: 0, message_count: 0 },
      isStreaming: false,
      isSubmitting: false,
      pendingApprovals: [],
      currentSession: undefined,
      availableSessions: [],
      sessionCheckpoints: [],
      debugEvents: [],
    })

    const url = new URL(window.location.href)
    url.searchParams.set('entity_id', entity.id)
    window.history.pushState({}, '', url)
  }

  private patch(partial: Partial<any>) {
    this._state.update((s) => ({ ...s, ...partial }))
  }

  constructor() {
    const saved = localStorage.getItem('devui-storage')
    if (saved) {
      this.patch(JSON.parse(saved))
    }

    effect(() => {
      const s = this._state()
      const toPersist = {
        showDebugPanel: s.showDebugPanel,
        debugPanelMinimized: s.debugPanelMinimized,
        debugPanelWidth: s.debugPanelWidth,
        showToolCalls: s.showToolCalls,
        streamingEnabled: s.streamingEnabled,
        oaiMode: s.oaiMode,
        azureDeploymentEnabled: s.azureDeploymentEnabled,
        debugPanelTab: s.debugPanelTab,
        debugTraceSubTab: s.debugTraceSubTab,
        contextInspectorViewMode: s.contextInspectorViewMode,
        contextInspectorCumulative: s.contextInspectorCumulative,
      }
      localStorage.setItem('devui-storage', JSON.stringify(toPersist))
    })
  }
}
