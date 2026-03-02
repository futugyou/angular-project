import { Component, computed, input, inject, effect, signal, untracked } from '@angular/core'
import { AppHeaderComponent } from './components/layout/app-header.component'
import { DebugPanelComponent } from './components/layout/debug-panel.component'
import { SettingsModalComponent } from './components/layout/settings-modal.component'
import { DeploymentModalComponent } from './components/layout/deployment-modal.component'
import { GalleryViewComponent } from './components/features/gallery/gallery-view.component'
import { AgentViewModalComponent } from './components/features/agent/agent-view.component'
import { WorkflowViewComponent } from './components/features/workflow/workflow-view.component'
import { Toast, ToastContainer } from './components/ui/toast.component'
import { ApiClient } from './services/api.service'
import { NgIconComponent } from '@ng-icons/core'
import type { AgentInfo, WorkflowInfo, ExtendedResponseStreamEvent } from './types'
import { ButtonComponent } from './components/ui/button.component'
import { InputComponent } from './components/ui/input.component'
import { DevUIStore } from './stores'

@Component({
  selector: 'dev-ui',
  standalone: true,
  imports: [
    AppHeaderComponent,
    NgIconComponent,
    ButtonComponent,
    DebugPanelComponent,
    SettingsModalComponent,
    SettingsModalComponent,
    DeploymentModalComponent,
    DeploymentModalComponent,
    GalleryViewComponent,
    GalleryViewComponent,
    AgentViewModalComponent,
    WorkflowViewComponent,
    WorkflowViewComponent,
    Toast,
    ToastContainer,
    InputComponent,
  ],
  template: ``,
  host: {
    class: 'block',
  },
})
export class DevuiComponent {
  authRequired = signal(false)
  authToken = signal('')
  isTestingToken = signal(false)
  authError = signal('')
  private apiClient = inject(ApiClient)
  private store = inject(DevUIStore)

  agents = computed(() => this.store.agents)
  workflows = computed(() => this.store.workflows)
  entities = computed(() => this.store.entities)
  selectedAgent = computed(() => this.store.selectedAgent)
  azureDeploymentEnabled = computed(() => this.store.azureDeploymentEnabled)
  isLoadingEntities = computed(() => this.store.isLoadingEntities)
  entityError = computed(() => this.store.entityError)

  oaiMode = computed(() => this.store.oaiMode)
  uiMode = computed(() => this.store.uiMode)

  handleAuthTokenSubmit = async () => {
    const authToken = this.authToken()
    if (!authToken.trim()) return

    this.isTestingToken.set(true)
    this.authError.set('')

    try {
      // Set token in API client (stores in localStorage)
      this.apiClient.setAuthToken(authToken.trim())

      // Test the token with an actual PROTECTED endpoint (not /meta which is public)
      await this.apiClient.getEntities()

      // If successful, reload to initialize with new token
      window.location.reload()
    } catch (error) {
      // Token is invalid - clear it and show error
      this.apiClient.clearAuthToken()
      this.isTestingToken.set(false)

      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      if (errorMsg === 'UNAUTHORIZED') {
        this.authError.set('Invalid token. Please check and try again.')
      } else {
        this.authError.set(`Failed to connect: ${errorMsg}`)
      }
    }
  }

  handleMouseDown = (e: MouseEvent) => {
    e.preventDefault()
    this.store.setIsResizing(true)

    const startX = e.clientX
    const startWidth = this.store.debugPanelWidth

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = startX - e.clientX // Subtract because we're dragging from right
      const newWidth = Math.max(200, Math.min(window.innerWidth * 0.5, startWidth + deltaX))
      this.store.setDebugPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      this.store.setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  constructor() {
    effect(() => {
      const loadData = async () => {
        try {
          // Fetch server metadata first (ui_mode, capabilities, auth status)
          const meta = await this.apiClient.getMeta()

          // Check if auth is required
          if (meta.auth_required) {
            this.authRequired.set(true)

            // If we don't have a token, stop here and show auth UI
            if (!this.apiClient.getAuthToken()) {
              this.store.setEntityError('UNAUTHORIZED')
              this.store.setIsLoadingEntities(false)
              return
            }
          }

          this.store.setServerMeta({
            uiMode: meta.ui_mode,
            runtime: meta.runtime,
            capabilities: meta.capabilities,
            authRequired: meta.auth_required,
            version: meta.version,
          })

          // Single API call instead of two parallel calls to same endpoint
          const {
            entities: allEntities,
            agents: agentList,
            workflows: workflowList,
          } = await this.apiClient.getEntities()

          this.store.setEntities(allEntities)
          this.store.setAgents(agentList)
          this.store.setWorkflows(workflowList)

          // Check if there's an entity_id in the URL
          const urlParams = new URLSearchParams(window.location.search)
          const entityId = urlParams.get('entity_id')

          let selectedEntity: AgentInfo | WorkflowInfo | undefined

          // Try to find entity from URL parameter first
          if (entityId) {
            selectedEntity = allEntities.find((e) => e.id === entityId)

            // If entity not found but was requested, show notification
            if (!selectedEntity) {
              this.store.setShowEntityNotFoundToast(true)
            }
          }

          // Fallback to first available entity if URL entity not found
          if (!selectedEntity) {
            // Use the first entity from the backend's original order
            // This respects the backend's intended display order
            selectedEntity = allEntities.length > 0 ? allEntities[0] : undefined

            // Update URL to match actual selected entity (or clear if none)
            if (selectedEntity) {
              const url = new URL(window.location.href)
              url.searchParams.set('entity_id', selectedEntity.id)
              window.history.replaceState({}, '', url)
            } else {
              // Clear entity_id if no entities available
              const url = new URL(window.location.href)
              url.searchParams.delete('entity_id')
              window.history.replaceState({}, '', url)
            }
          }

          if (selectedEntity) {
            this.store.selectEntity(selectedEntity)

            // Load full info for the first entity immediately
            if (selectedEntity.metadata?.['lazy_loaded'] === false) {
              try {
                if (selectedEntity.type === 'agent') {
                  const fullAgent = await this.apiClient.getAgentInfo(selectedEntity.id)
                  this.store.updateAgent(fullAgent)
                } else {
                  const fullWorkflow = await this.apiClient.getWorkflowInfo(selectedEntity.id)
                  this.store.updateWorkflow(fullWorkflow)
                }
              } catch (error) {
                console.error(
                  `Failed to load full info for first entity ${selectedEntity.id}:`,
                  error,
                )
                // Show toast for entity load errors (don't use setEntityError - that kills the whole UI)
                const errorMessage = error instanceof Error ? error.message : String(error)
                this.store.addToast({
                  type: 'error',
                  message: `Failed to load "${selectedEntity.id}": ${errorMessage}`,
                })
              }
            }
          }

          this.store.setIsLoadingEntities(false)
        } catch (error) {
          console.error('Failed to load agents/workflows:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to load data'

          // Check if this is an auth error
          if (errorMessage === 'UNAUTHORIZED') {
            this.authRequired.set(true)
          }

          this.store.setEntityError(errorMessage)
          this.store.setIsLoadingEntities(false)
        }
      }

      untracked(() => loadData())
    })

    effect(() => {
      if (this.oaiMode().enabled && this.selectedAgent()?.type === 'workflow') {
        // Workflows don't work with OpenAI proxy - switch to first available agent
        const firstAgent = this.agents()[0]
        if (firstAgent) {
          untracked(() => {
            this.store.selectEntity(firstAgent)
          })
        }
      }
    })
  }
}
