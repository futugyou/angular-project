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
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../stores/devuiStore'
import type { AgentInfo, WorkflowInfo } from '../../types'

import { ButtonDirective } from '../../directives/button.directive'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
} from '../ui/dialog.component'
import { ButtonComponent } from '../ui/button.component'
import { ScrollAreaComponent } from '../ui/scroll-area.component'
import { ApiClient } from '../../services/api.service'

type Tab = 'docker' | 'azure'

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    NgIconComponent,
    ButtonDirective,
    ButtonComponent,
    ScrollAreaComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
  ],
  template: `<ng-content></ng-content>`,
  host: {
    class: 'block',
  },
})
export class AeploymentModalComponent {
  open = input<boolean>(false)
  agentName = input<string>('Agent')
  entity = input<AgentInfo | WorkflowInfo>()
  canClose = input<boolean>(true)
  onClose = output<void>()

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
    effect(
      () => {
        const entity = this.entity()
        if (!entity) return
        const newDefaultName = this.generateDefaultAppName(entity.id)
        this.appName.set(newDefaultName)
        const error = this.validateAppName(newDefaultName)
        this.appNameError.set(error)
      },
      { allowSignalWrites: true },
    )
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
}
