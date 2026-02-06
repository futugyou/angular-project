/**
 * API client for DevUI backend
 * Handles agents, workflows, streaming, and session management
 */

import type {
  AgentInfo,
  AgentSource,
  Conversation,
  HealthResponse,
  MetaResponse,
  RunAgentRequest,
  RunWorkflowRequest,
  WorkflowInfo,
  EnvVarRequirement,
  JSONSchema,
} from '../types'
import type { AgentFrameworkRequest } from '../types/agent-framework'
import type { ExtendedResponseStreamEvent } from '../types/openai'
import {
  loadStreamingState,
  updateStreamingState,
  markStreamingCompleted,
  clearStreamingState,
} from './streaming-state.service'
import { environment } from '../../../environments/environment'

// Backend API response type - polymorphic entity that can be agent or workflow
// This matches the Python Pydantic EntityInfo model which has all fields optional
interface BackendEntityInfo {
  id: string
  type: 'agent' | 'workflow'
  name: string
  description?: string
  framework: string
  tools?: (string | Record<string, unknown>)[]
  metadata: Record<string, unknown>
  source?: string
  required_env_vars?: EnvVarRequirement[]
  // Deployment support
  deployment_supported?: boolean
  deployment_reason?: string
  // Agent-specific fields (present when type === "agent")
  instructions?: string
  model_id?: string
  chat_client_type?: string
  context_provider?: string[]
  middleware?: string[]
  // Workflow-specific fields (present when type === "workflow")
  executors?: string[]
  workflow_dump?: Record<string, unknown>
  input_schema?: Record<string, unknown>
  input_type_name?: string
  start_executor_id?: string
}

interface DiscoveryResponse {
  entities: BackendEntityInfo[]
}

// Conversation API types (OpenAI standard)
interface ConversationApiResponse {
  id: string
  object: 'conversation'
  created_at: number
  metadata?: Record<string, unknown>
}

const DEFAULT_API_BASE_URL = environment.VITE_API_BASE_URL

// Retry configuration for streaming
const RETRY_INTERVAL_MS = 1000 // Base retry interval (will use exponential backoff)
const MAX_RETRY_ATTEMPTS = 10 // Max 10 retries (~30 seconds with exponential backoff)

// Get backend URL from localStorage or default
function getBackendUrl(): string {
  const stored = localStorage.getItem('devui_backend_url')
  if (stored) return stored

  return DEFAULT_API_BASE_URL
}

// Helper to sleep for a given duration
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
