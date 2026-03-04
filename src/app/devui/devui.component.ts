import { Component, computed, input, inject, effect, signal, untracked } from '@angular/core'
import { AppHeaderComponent } from './components/layout/app-header.component'
import { DebugPanelComponent } from './components/layout/debug-panel.component'
import { SettingsModalComponent } from './components/layout/settings-modal.component'
import { DeploymentModalComponent } from './components/layout/deployment-modal.component'
import { GalleryViewComponent } from './components/features/gallery/gallery-view.component'
import { AgentViewModalComponent } from './components/features/agent/agent-view.component'
import { WorkflowViewComponent } from './components/features/workflow/workflow-view.component'
import { Toast, ToastContainer, ToastService } from './components/ui/toast.component'
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
    AgentViewModalComponent,
    WorkflowViewComponent,
    WorkflowViewComponent,
    Toast,
    ToastContainer,
    InputComponent,
  ],
  template: ` @if (isLoadingEntities()) {
      <div class="h-screen flex flex-col bg-background">
        <header class="flex h-14 items-center gap-4 border-b px-4">
          <div class="w-64 h-9 bg-muted animate-pulse rounded-md"></div>
          <div class="flex items-center gap-2 ml-auto">
            <div class="w-8 h-8 bg-muted animate-pulse rounded-md"></div>
            <div class="w-8 h-8 bg-muted animate-pulse rounded-md"></div>
          </div>
        </header>

        <div class="flex-1 flex items-center justify-center">
          <div class="text-center">
            <div class="text-lg font-medium">Initializing DevUI...</div>
            <div class="text-sm text-muted-foreground mt-2">
              Loading agents and workflows from your configuration
            </div>
          </div>
        </div>
      </div>
    } @else if (entityError()) {
      <div class="h-screen flex flex-col bg-background">
        <app-header [agents]="[]" [workflows]="[]" />

        <div class="flex-1 flex items-center justify-center p-8">
          <div class="text-center space-y-6 max-w-2xl">
            <div class="flex justify-center">
              <div class="rounded-full bg-muted p-4 animate-pulse">
                @if (isAuthError()) {
                  <ng-icon name="lucideClock" class="h-12 w-12 text-muted-foreground" />
                } @else {
                  <ng-icon name="lucideServerOff" class="h-12 w-12 text-muted-foreground" />
                }
              </div>
            </div>

            <div class="space-y-2">
              <h2 class="text-2xl font-semibold text-foreground">
                {{ isAuthError() ? 'Authentication Required' : "Can't Connect to Backend" }}
              </h2>
              <p class="text-muted-foreground text-base">
                {{
                  isAuthError()
                    ? 'This backend requires a bearer token to access.'
                    : "No worries! Just start the DevUI backend server and you'll be good to go."
                }}
              </p>
            </div>

            @if (isAuthError()) {
              <div class="space-y-4">
                <div class="text-left bg-muted/50 rounded-lg p-4 space-y-3">
                  <p class="text-sm font-medium text-foreground">Enter Authentication Token</p>
                  <app-input
                    type="password"
                    placeholder="Paste token from server logs"
                    [value]="authToken()"
                    (change)="this.handleInputChange($event)"
                    (keydown)="this.handleKeyDown($event)"
                    [disabled]="isTestingToken()"
                    class="font-mono text-sm"
                  />
                  <button
                    [appButton]
                    (click)="handleAuthTokenSubmit()"
                    [disabled]="!authToken().trim() || isTestingToken()"
                    class="w-full"
                  >
                    {{ isTestingToken() ? 'Verifying...' : 'Connect' }}
                  </button>

                  @if (authError()) {
                    <p class="text-sm text-red-600 dark:text-red-400 text-center">
                      {{ authError() }}
                    </p>
                  }
                </div>

                <details class="text-left group">
                  <summary
                    class="text-sm text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2 justify-center"
                  >
                    <ng-icon
                      name="lucideChevronDown"
                      class="h-4 w-4 transition-transform group-open:rotate-180"
                    />
                    Where do I find the token?
                  </summary>
                  <div class="mt-3 text-left bg-muted/30 rounded-lg p-3 space-y-2">
                    <p class="text-xs text-muted-foreground">
                      Look for this in your DevUI server startup logs:
                    </p>
                    <code
                      class="block bg-background px-2 py-1 rounded text-xs font-mono text-foreground"
                    >
                      🔑 DEV TOKEN (localhost only, shown once):
                      <br />
                      &nbsp;&nbsp; abc123xyz...
                    </code>
                  </div>
                </details>
              </div>
            } @else {
              <div class="space-y-3">
                <div class="text-left bg-muted/50 rounded-lg p-4 space-y-3">
                  <p class="text-sm font-medium text-foreground">Start the backend:</p>
                  <code
                    class="block bg-background px-3 py-2 rounded border text-sm font-mono text-foreground"
                  >
                    devui ./agents --port {{ backendPort() }}
                  </code>
                  <p class="text-xs text-muted-foreground">
                    Or launch programmatically with " "
                    <code class="text-xs">serve(entities=[agent])</code>
                  </p>
                </div>

                <p class="text-xs text-muted-foreground">
                  Default: " "
                  <span class="font-mono">{{ currentBackendUrl() }}</span>
                </p>
              </div>

              @if (entityError()) {
                <details class="text-left group">
                  <summary
                    class="text-sm text-muted-foreground cursor-pointer hover:text-foreground flex items-center gap-2"
                  >
                    <ng-icon
                      name="lucideChevronDown"
                      class="h-4 w-4 transition-transform group-open:rotate-180"
                    />
                    Error details
                  </summary>
                  <p
                    class="mt-2 text-xs text-muted-foreground font-mono bg-muted/30 p-3 rounded border"
                  >
                    {{ entityError() }}
                  </p>
                </details>
              }

              <button [appButton] (click)="this.windowReload()" variant="default" class="mt-2">
                Retry Connection
              </button>
            }
          </div>
        </div>

        <app-settings-modal
          [showModal]="showAboutModal()"
          (onBackendUrlChange)="this.store.setShowAboutModal(false)"
        />
      </div>
    } @else {
      <div class="h-screen flex flex-col bg-background max-h-screen">
        <app-header
          [agents]="agents()"
          [workflows]="workflows()"
          [entities]="entities()"
          [selectedItem]="selectedAgent()"
          (onSelect)="handleEntitySelect($event)"
          (onBrowseGallery)="this.store.setShowGallery(true)"
          [isLoading]="isLoadingEntities()"
          (onSettingsClick)="this.store.setShowAboutModal(true)"
        />

        <div class="flex flex-1 overflow-hidden">
          @if (showGallery()) {
            <div class="flex-1 w-full">
              <app-gallery-view
                variant="route"
                (onClose)="this.store.setShowGallery(false)"
                [hasExistingEntities]="agents.length > 0 || workflows.length > 0"
              ></app-gallery-view>
            </div>
          } @else if (agents.length === 0 && workflows.length === 0) {
            <app-gallery-view variant="inline"></app-gallery-view>
          } @else {
            <div class="flex-1 min-w-0">
              @let selectedAgentValue = selectedAgent();
              @if (selectedAgentValue) {
                @if (selectedAgentValue.type === 'agent') {
                  <app-agent-view
                    [selectedAgent]="$any(selectedAgentValue)"
                    (debugEvent)="handleDebugEvent($event)"
                  ></app-agent-view>
                } @else {
                  <app-workflow-view
                    [selectedWorkflow]="$any(selectedAgentValue)"
                    (debugEvent)="handleDebugEvent($event)"
                  ></app-workflow-view>
                }
              } @else {
                <div class="flex-1 flex items-center justify-center text-muted-foreground">
                  Select an agent or workflow to get started.
                </div>
              }
            </div>

            @if (uiMode() === 'developer') {
              @if (showDebugPanel()) {
                <div
                  class="w-1 cursor-col-resize flex-shrink-0 relative group transition-colors duration-200 ease-in-out"
                  [class.bg-primary/40]="isResizing()"
                  [class.bg-border]="!isResizing()"
                  (mousedown)="handleMouseDown($event)"
                >
                  <div class="absolute inset-y-0 -left-2 -right-2 flex items-center justify-center">
                    <div
                      class="h-12 w-1 rounded-full transition-all duration-200 ease-in-out"
                      [class.bg-primary]="isResizing()"
                      [class.shadow-lg]="isResizing()"
                      [class.shadow-primary/25]="isResizing()"
                      [class.bg-primary/30]="!isResizing()"
                    ></div>
                  </div>
                </div>

                <div
                  class="flex-shrink-0 flex flex-col h-[calc(100vh-3.7rem)]"
                  [style.width]="debugPanelMinimized() ? '2.5rem' : debugPanelWidth() + 'px'"
                >
                  @if (debugPanelMinimized()) {
                    <div
                      class="h-full w-10 bg-background border-l flex flex-col items-center py-2 cursor-pointer hover:bg-accent/50 transition-colors"
                      (click)="this.store.setDebugPanelMinimized(false)"
                      title="Expand debug panel"
                    >
                      <ng-icon name="lucideChevronLeft" class="h-4 w-4 text-muted-foreground" />
                      <div
                        class="flex-1 flex flex-col items-center justify-center gap-2 pointer-events-none"
                      >
                        <div
                          class="text-xs text-muted-foreground select-none"
                          style="writing-mode: vertical-rl; transform: rotate(180deg);"
                        >
                          Debug Panel
                        </div>
                        @if (debugEvents().length > 0) {
                          <div
                            class="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                          >
                            {{ debugEvents().length }}
                          </div>
                        }
                      </div>
                    </div>
                  } @else {
                    <app-debug-panel
                      [events]="debugEvents()"
                      [isStreaming]="false"
                      (onMinimize)="this.store.setDebugPanelMinimized(true)"
                    ></app-debug-panel>

                    <div class="border-t bg-muted/30 px-3 py-2.5 flex-shrink-0">
                      <button
                        class="w-full btn-outline btn-sm"
                        (click)="this.store.setShowDeployModal(true)"
                      >
                        <ng-icon name="lucideRocket" class="h-3 w-3 mr-2" />
                        <span class="truncate text-xs">
                          {{
                            azureDeploymentEnabled() && selectedAgent()?.deployment_supported
                              ? 'Deploy to Azure'
                              : 'Deployment Guide'
                          }}
                        </span>
                      </button>
                    </div>
                  }
                </div>
              } @else {
                <div class="flex-shrink-0">
                  <button
                    class="h-full w-10 rounded-none border-l btn-ghost btn-sm"
                    (click)="this.store.setShowDebugPanel(true)"
                    title="Show debug panel"
                  >
                    <ng-icon name="lucidePanelRightOpen" class="h-4 w-4"></ng-icon>
                  </button>
                </div>
              }
            }
          }
        </div>

        <app-settings-modal
          [showModal]="showAboutModal()"
          (onBackendUrlChange)="(this.store.setShowAboutModal)"
        ></app-settings-modal>

        @if (showDeployModal()) {
          <app-deployment-modal
            [open]="showDeployModal()"
            (onOpenChange)="this.store.setShowDeployModal(false)"
            [agentName]="selectedAgent()?.name || ''"
            [entity]="selectedAgent()"
          ></app-deployment-modal>
        }

        @if (showEntityNotFoundToast()) {
          <app-toast
            message="Entity not found..."
            type="info"
            (closeToast)="store.setShowEntityNotFoundToast(false)"
          />
        }

        <app-toast-container
          [toasts]="toastService.toasts()"
          (onRemove)="toastService.remove($event)"
        />
      </div>
    }`,
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
  protected store = inject(DevUIStore)
  protected toastService = inject(ToastService)

  agents = computed(() => this.store.agents)
  workflows = computed(() => this.store.workflows)
  entities = computed(() => this.store.entities)
  selectedAgent = computed(() => this.store.selectedAgent)
  azureDeploymentEnabled = computed(() => this.store.azureDeploymentEnabled)
  isLoadingEntities = computed(() => this.store.isLoadingEntities)
  entityError = computed(() => this.store.entityError)

  oaiMode = computed(() => this.store.oaiMode)
  uiMode = computed(() => this.store.uiMode)
  showDebugPanel = computed(() => this.store.showDebugPanel)
  debugPanelMinimized = computed(() => this.store.debugPanelMinimized)
  debugPanelWidth = computed(() => this.store.debugPanelWidth)
  debugEvents = computed(() => this.store.debugEvents)
  isResizing = computed(() => this.store.isResizing)
  showAboutModal = computed(() => this.store.showAboutModal)
  showGallery = computed(() => this.store.showGallery)
  showDeployModal = computed(() => this.store.showDeployModal)
  showEntityNotFoundToast = computed(() => this.store.showEntityNotFoundToast)

  currentBackendUrl = computed(() => this.apiClient.getBaseUrl())
  isAuthError = computed(() => this.entityError() === 'UNAUTHORIZED' || this.authRequired())
  backendPort = computed(() => {
    let backendPort = '8080'
    try {
      const currentBackendUrl = this.currentBackendUrl()
      if (currentBackendUrl) {
        const url = new URL(currentBackendUrl)
        backendPort = url.port || (url.protocol === 'https:' ? '443' : '80')
      }
    } catch {}

    return backendPort
  })

  handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !this.isTestingToken()) {
      this.handleAuthTokenSubmit()
    }
  }

  handleInputChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    this.authToken.set(target.value || '')
  }

  windowReload = () => {
    window.location.reload()
  }

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

  handleEntitySelect = async (item: AgentInfo | WorkflowInfo) => {
    this.store.selectEntity(item) // This clears conversation state, debug events, and updates URL!

    // If entity is sparse (not fully loaded), load full details
    if (item.metadata?.['lazy_loaded'] === false) {
      try {
        if (item.type === 'agent') {
          const fullAgent = await this.apiClient.getAgentInfo(item.id)
          this.store.updateAgent(fullAgent)
        } else {
          const fullWorkflow = await this.apiClient.getWorkflowInfo(item.id)
          this.store.updateWorkflow(fullWorkflow)
        }
      } catch (error) {
        console.error(`Failed to load full info for ${item.id}:`, error)
        // Show toast for entity load errors (don't use setEntityError - that kills the whole UI)
        const errorMessage = error instanceof Error ? error.message : String(error)
        this.store.addToast({
          type: 'error',
          message: `Failed to load "${item.id}": ${errorMessage}`,
        })
      }
    }
  }

  handleDebugEvent = (event: ExtendedResponseStreamEvent | 'clear') => {
    if (event === 'clear') {
      this.store.clearDebugEvents()
    } else {
      this.store.addDebugEvent(event)
    }
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
