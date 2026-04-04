import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
  effect,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgClass } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../stores/devuiStore'
import type { AgentInfo, WorkflowInfo } from '../../types'

import { ButtonDirective } from '@shared/directives/button.directive'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
  DialogDescriptionComponent,
} from '@shared/ui/dialog.component'
import { ButtonComponent } from '@shared/ui/button.component'
import { ScrollAreaComponent } from '@shared/ui/scroll-area.component'
import { ApiClient } from '../../services/api.service'

type Tab = 'docker' | 'azure'

@Component({
  selector: 'app-deployment-modal',
  standalone: true,
  imports: [
    FormsModule,
    NgIconComponent,
    NgClass,
    ButtonDirective,
    ButtonComponent,
    ScrollAreaComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
    DialogDescriptionComponent,
  ],
  template: ` <app-dialog [open]="open()" (openChange)="onOpenChange.emit($event)">
    <app-dialog-header class="p-6 pb-2">
      <app-dialog-title class="flex items-center gap-2">
        <ng-icon name="lucideRocket" class="h-3 w-3" />
        Deploy {{ agentName() }}
      </app-dialog-title>
      <app-dialog-description class="pt-1">
        Get started with containerizing your agent for deployment.
      </app-dialog-description>

      <app-dialog-close (close)="onOpenChange.emit(false)"></app-dialog-close>
    </app-dialog-header>

    <app-dialog-content>
      <div class="flex border-b px-6">
        <button
          (click)="activeTab.set('docker')"
          class="px-4 py-2 text-sm font-medium transition-colors relative"
          [ngClass]="
            activeTab() === 'docker'
              ? 'text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          "
        >
          <ng-icon name="lucideContainer" class="h-4 w-4 mr-2 inline" />
          Docker
          @if (activeTab() === 'docker') {
            <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
          }
        </button>

        @if (deploymentSupported) {
          <button
            (click)="activeTab.set('azure')"
            class="px-4 py-2 text-sm font-medium transition-colors relative"
            [ngClass]="
              activeTab() === 'azure'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            "
          >
            <ng-icon name="lucideCloud" class="h-4 w-4 mr-2 inline" />
            Azure
            @if (activeTab() === 'azure') {
              <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
            }
          </button>
        }
      </div>

      <app-scroll-area class="px-6 pb-6 h-125">
        <div class="pr-4">
          @if (activeTab() === 'docker') {
            <div class="space-y-4 pt-4">
              <div>
                <h3 class="font-semibold mb-2">Containerize with Docker</h3>
                <p class="text-sm text-muted-foreground">
                  Package your agent as a Docker container for consistent deployment anywhere.
                </p>
              </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">Dockerfile</span>
                  <button
                    [appButton]
                    size="sm"
                    variant="ghost"
                    (click)="handleCopy(dockerfileTemplate, 'dockerfile')"
                  >
                    @if (copiedTemplate() === 'dockerfile') {
                      <ng-icon name="lucideCheckCircle2" class="h-4 w-4 mr-1 text-green-500" />
                      Copied!
                    } @else {
                      <ng-icon name="lucideCopy" class="h-4 w-4 mr-1" />
                      Copy
                    }
                  </button>
                </div>
                <pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto border">{{
                  dockerfileTemplate
                }}</pre>
              </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <span class="text-sm font-medium">docker-compose.yml</span>
                  <button
                    [appButton]
                    size="sm"
                    variant="ghost"
                    (click)="handleCopy(dockerComposeTemplate, 'compose')"
                  >
                    @if (copiedTemplate() === 'compose') {
                      <ng-icon name="lucideCheckCircle2" class="h-4 w-4 mr-1 text-green-500" />
                      Copied!
                    } @else {
                      <ng-icon name="lucideCopy" class="h-4 w-4 mr-1" />
                      Copy
                    }
                  </button>
                </div>
                <pre class="bg-muted p-3 rounded-md text-xs overflow-x-auto border">{{
                  dockerComposeTemplate
                }}</pre>
              </div>
              <div
                class="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md p-3"
              >
                <h4 class="text-sm font-semibold mb-2">Quick Start</h4>
                <ol class="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Save the files above to your project directory</li>
                  <li>
                    Build:
                    <code class="bg-muted px-1 rounded"
                      >docker build -t {{ agentName().toLowerCase() }}-agent .</code
                    >
                  </li>
                  <li>Run: <code class="bg-muted px-1 rounded">docker-compose up</code></li>
                  <li>Your agent is now running in a container!</li>
                </ol>
              </div>
              <div
                class="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md p-3"
              >
                <h4 class="text-sm font-semibold mb-2 text-amber-900 dark:text-amber-100">
                  ⚠️ Production Considerations
                </h4>
                <ul
                  class="text-xs space-y-1 list-disc list-inside text-amber-800 dark:text-amber-200"
                >
                  <li><strong>In-memory state:</strong> Conversations lost on restart</li>
                  <li><strong>No authentication:</strong> Add reverse proxy (nginx)</li>
                  <li><strong>Security:</strong> Use Azure Key Vault for secrets</li>
                  <li><strong>Scaling:</strong> Single instance only (in-memory store)</li>
                </ul>
              </div>
            </div>
          }

          @if (activeTab() === 'azure') {
            <div class="space-y-4 pt-4">
              <div>
                <h3 class="font-semibold mb-2">Deploy to Azure Container Apps</h3>
                <p class="text-sm text-muted-foreground">
                  {{
                    deploymentSupported
                      ? 'One-click deployment to Azure with automatic containerization.'
                      : 'Azure Container Apps provides serverless containers.'
                  }}
                </p>
              </div>
              <div
                class="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-md p-3"
              >
                <h4 class="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
                  Prerequisites
                </h4>
                <ul
                  class="text-xs space-y-1 list-disc list-inside text-blue-800 dark:text-blue-200"
                >
                  <li>
                    Azure CLI installed (<code class="bg-blue-100 dark:bg-blue-900 px-1 rounded"
                      >az login</code
                    >)
                  </li>
                  <li>Docker installed and running</li>
                </ul>
              </div>
              @if (deploymentSupported && entity() && !lastDeployment) {
                <div class="border rounded-lg p-4 space-y-4">
                  @if (!isDeploying()) {
                    <div class="space-y-3">
                      <div>
                        <label class="text-sm font-medium">Resource Group</label>
                        <input
                          type="text"
                          [(ngModel)]="resourceGroup"
                          class="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          placeholder="my-test-rg"
                        />
                      </div>
                      <div>
                        <label class="text-sm font-medium">App Name</label>
                        <input
                          type="text"
                          [(ngModel)]="appName"
                          class="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          [ngClass]="{ 'border-red-500': appNameError }"
                          placeholder="my-agent-app"
                        />
                        @if (appNameError()) {
                          <p class="mt-1 text-xs text-red-600">
                            {{ appNameError() }}
                          </p>
                        }
                      </div>
                      <div>
                        <label class="text-sm font-medium">Region</label>
                        <select
                          [(ngModel)]="region"
                          class="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                        >
                          <option value="eastus">East US</option>
                          <option value="westus">West US</option>
                        </select>
                      </div>
                    </div>
                    <button
                      [appButton]
                      (click)="handleDeploy()"
                      [disabled]="!resourceGroup || !appName || !!appNameError"
                      class="w-full"
                    >
                      <ng-icon name="lucideRocket" class="h-4 w-4 mr-2" />
                      Deploy to Azure
                    </button>
                  } @else {
                    <div class="space-y-2">
                      <div class="flex items-center gap-2 text-sm font-medium">
                        <ng-icon name="lucideLoader2" class="h-4 w-4 animate-spin" />
                        Deploying...
                      </div>
                      <div
                        #logsContainer
                        class="bg-muted p-3 rounded-md text-xs font-mono max-h-60 overflow-y-auto space-y-1"
                      >
                        @for (log of deploymentLogs(); track log) {
                          <div
                            [ngClass]="{
                              'text-red-600': log.includes('failed') || log.includes('Error'),
                            }"
                          >
                            {{ log }}
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
              @let lastDep = lastDeployment();
              @if (lastDep) {
                <div
                  class="border-2 border-green-200 bg-green-50 dark:bg-green-950/50 rounded-lg p-4 space-y-3"
                >
                  <div class="flex items-center gap-2">
                    <ng-icon name="lucideCheckCircle2" class="h-5 w-5 text-green-600"></ng-icon>
                    <h4 class="font-semibold text-green-900 dark:text-green-100">
                      Deployment Successful!
                    </h4>
                  </div>
                  <div class="space-y-2">
                    <div>
                      <label class="text-xs font-medium text-green-800 dark:text-green-200"
                        >Deployment URL</label
                      >
                      <div class="flex gap-2 mt-1">
                        <code
                          class="flex-1 bg-white dark:bg-gray-900 px-3 py-2 rounded border text-sm"
                          >{{ lastDep!.url }}</code
                        >
                        <button
                          [appButton]
                          size="sm"
                          variant="outline"
                          (click)="openUrl(lastDep.url)"
                        >
                          <ng-icon name="lucideExternalLink" class="h-4 w-4"></ng-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    [appButton]
                    (click)="clearDeploymentState()"
                    variant="outline"
                    class="w-full"
                  >
                    Deploy Another
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </app-scroll-area>
    </app-dialog-content>
  </app-dialog>`,
  host: {
    class: 'block',
  },
})
export class DeploymentModalComponent {
  open = input<boolean>(false)
  agentName = input<string>('Agent')
  entity = input<AgentInfo | WorkflowInfo>()
  canClose = input<boolean>(true)
  onOpenChange = output<boolean>()

  // Store Injection
  protected readonly store = inject(DevUIStore)
  private apiClient = inject(ApiClient)

  azureDeploymentEnabled = computed(() => this.store.azureDeploymentEnabled)

  // Check if deployment is truly supported (both feature flag and backend support)
  deploymentSupported =
    this.azureDeploymentEnabled() && (this.entity()?.deployment_supported ?? false)

  // Deployment state from Zustand
  isDeploying = computed(() => this.store.isDeploying)
  deploymentLogs = computed(() => this.store.deploymentLogs)
  lastDeployment = computed(() => this.store.lastDeployment)
  startDeployment = computed(() => this.store.startDeployment)
  clearDeploymentState = computed(() => this.store.clearDeploymentState)

  // Context-aware tab ordering: Azure first if deployable, Docker first otherwise
  activeTab = signal<Tab>(this.deploymentSupported ? 'azure' : 'docker')
  copiedTemplate = signal<string | null>(null)
  readonly logsContainer = viewChild<ElementRef<HTMLDivElement>>('logsContainer')

  constructor() {
    effect(() => {
      const logs = this.deploymentLogs()
      const container = this.logsContainer()?.nativeElement

      if (container && logs.length > 0) {
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight
        })
      }
    })
    effect(() => {
      const entity = this.entity()
      if (!entity) return

      const newDefaultName = this.generateDefaultAppName(entity.id)
      this.appName.set(newDefaultName)

      const error = this.validateAppName(newDefaultName)
      this.appNameError.set(error)
    })
  }

  generateDefaultAppName = (entityName: string) => {
    // Convert to lowercase, replace spaces and underscores with hyphens
    // Remove any non-alphanumeric characters except hyphens
    // Ensure it starts with a letter and is under 32 chars
    const cleaned = entityName
      .toLowerCase()
      .replace(/[_\s]+/g, '-') // Replace underscores and spaces with hyphens
      .replace(/[^a-z0-9-]/g, '') // Remove any other special characters
      .replace(/--+/g, '-') // Replace multiple hyphens with single
      .replace(/^[^a-z]+/, '') // Remove non-letter prefix
      .replace(/-$/, '') // Remove trailing hyphen

    // Ensure it starts with a letter, add 'app-' prefix if needed
    const withPrefix = cleaned.match(/^[a-z]/) ? cleaned : `app-${cleaned}`

    // Truncate to 31 chars max (32 limit)
    return withPrefix.substring(0, 31)
  }

  defaultAppName = this.entity() ? this.generateDefaultAppName(this.entity()!.id) : ''
  resourceGroup = signal<string>('my-test-rg')
  appName = signal<string>(this.defaultAppName)
  region = signal<string>('eastus')
  appNameError = signal<string | null>(null)

  validateAppName = (name: string): string | null => {
    if (!name) return null // Don't show error for empty field

    // Check length
    if (name.length >= 32) {
      return 'App name must be less than 32 characters'
    }

    // Check for valid characters (lowercase alphanumeric and hyphens only)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return 'App name must contain only lowercase letters, numbers, and hyphens (no underscores or uppercase)'
    }

    // Must start with a letter
    if (!/^[a-z]/.test(name)) {
      return 'App name must start with a lowercase letter'
    }

    // Must end with alphanumeric
    if (!/[a-z0-9]$/.test(name)) {
      return 'App name must end with a letter or number'
    }

    // Cannot have double hyphens
    if (name.includes('--')) {
      return 'App name cannot contain consecutive hyphens (--)'
    }

    return null
  }

  handleDeploy = async () => {
    const entity = this.entity()
    const resourceGroup = this.resourceGroup()
    const appName = this.appName()
    if (!entity?.id || !resourceGroup || !appName) return

    // Trim whitespace from inputs
    const trimmedResourceGroup = resourceGroup.trim()
    const trimmedAppName = appName.trim()

    // Validate trimmed app name before deployment
    const nameError = this.validateAppName(trimmedAppName)
    if (nameError) {
      this.appNameError.set(nameError)
      return
    }

    try {
      this.startDeployment()

      for await (const event of this.apiClient.streamDeployment({
        entity_id: entity.id,
        agent_id: entity.id,
        resource_group: trimmedResourceGroup,
        app_name: trimmedAppName,
        region: this.region(),
        ui_mode: 'user',
      })) {
        this.store.addDeploymentLog(event.message)

        if (event.type === 'deploy.completed' && event.url && event.auth_token) {
          this.store.setDeploymentResult({
            url: event.url,
            authToken: event.auth_token,
          })
        } else if (event.type === 'deploy.failed') {
          // Stop deploying but keep logs visible
          this.store.stopDeployment()
        }
      }
    } catch (error) {
      this.store.addDeploymentLog(
        `Error: ${error instanceof Error ? error.message : 'Deployment failed'}`,
      )
      this.store.stopDeployment()
    }
  }

  private timeoutId = signal<any>(null)

  startTimer() {
    this.stopTimer()
    const id = setTimeout(() => {
      console.log('Action!')
    }, 3000)

    this.timeoutId.set(id)
  }

  stopTimer() {
    const id = this.timeoutId()
    if (id) {
      clearTimeout(id)
      this.timeoutId.set(null)
    }
  }

  handleCopy = async (template: string, templateName: string) => {
    try {
      await navigator.clipboard.writeText(template)
      this.copiedTemplate.set(templateName)
      const timeoutId = this.timeoutId()
      if (timeoutId) {
        clearTimeout(timeoutId)
        this.timeoutId.set(null)
      }
      const id = setTimeout(() => {
        this.copiedTemplate.set(null)
      }, 3000)

      this.timeoutId.set(id)
    } catch {
      this.copiedTemplate.set(null)
    }
  }

  dockerfileTemplate = `# Dockerfile for ${this.agentName()}
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent/workflow directories
COPY . .

# Expose DevUI default port
EXPOSE 8080

# Run DevUI server
CMD ["devui", ".", "--port", "8080", "--host", "0.0.0.0"]
`

  dockerComposeTemplate = `# docker-compose.yml
version: '3.8'

services:
  ${this.agentName().toLowerCase().replace(/\s+/g, '-')}:
    build: .
    environment:
      # OpenAI
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - OPENAI_CHAT_MODEL_ID=\${OPENAI_CHAT_MODEL_ID:-gpt-4o-mini}
      # Or Azure OpenAI
      - AZURE_OPENAI_API_KEY=\${AZURE_OPENAI_API_KEY}
      - AZURE_OPENAI_ENDPOINT=\${AZURE_OPENAI_ENDPOINT}
      - AZURE_OPENAI_CHAT_DEPLOYMENT_NAME=\${AZURE_OPENAI_CHAT_DEPLOYMENT_NAME}
      # Optional: Enable instrumentation
      - ENABLE_INSTRUMENTATION=\${ENABLE_INSTRUMENTATION:-false}
    ports:
      - "8080:8080"
    restart: unless-stopped
`

  requirementsTemplate = `# requirements.txt
agent-framework-devui>=0.1.0
agent-framework>=0.1.0
# Chat clients (install what you need)
openai>=1.0.0
# azure-openai
# anthropic
`

  openUrl(url: string) {
    window.open(url, '_blank')
  }
}
