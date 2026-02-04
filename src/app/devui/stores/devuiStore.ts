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

type DevUIStore = DevUIState & DevUIActions
