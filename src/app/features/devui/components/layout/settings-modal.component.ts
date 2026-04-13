import { Component, inject, signal, computed, effect, output, model } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../stores/devuiStore'

import {
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
  DialogContentComponent,
  DialogComponent,
} from '@shared/ui/dialog'
import { ButtonDirective } from '@shared/directives/button.directive'
import { InputComponent } from '@shared/ui/input'
import { LabelComponent } from '@shared/ui/label.component'
import { SwitchComponent } from '@shared/ui/switch.component'

type Tab = 'general' | 'proxy' | 'about'

const PRESET_MODELS = ['gpt-4.1', 'gpt-4.1-mini', 'o1', 'o1-mini', 'o3-mini'] as const

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [
    FormsModule,
    NgIconComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
    DialogContentComponent,
    DialogComponent,
    ButtonDirective,
    InputComponent,
    LabelComponent,
    SwitchComponent,
  ],
  template: `
    <app-dialog [(open)]="showModal">
      <app-dialog-header class="p-6 pb-2 shrink-0">
        <app-dialog-title>Settings</app-dialog-title>
        <app-dialog-close (close)="showModal.set(false)" />
      </app-dialog-header>

      <app-dialog-content>
        <div class="flex border-b px-6 shrink-0">
          @for (tab of tabs; track tab.id) {
            @if (tab.id !== 'proxy' || store.serverCapabilities.openai_proxy) {
              <button
                (click)="activeTab.set(tab.id)"
                [class]="
                  'px-4 py-2 text-sm font-medium transition-colors relative ' +
                  (activeTab() === tab.id
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground')
                "
              >
                {{ tab.label }}
                @if (activeTab() === tab.id) {
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"></div>
                }
              </button>
            }
          }
        </div>

        <div class="px-6 pb-6 overflow-y-auto flex-1 min-h-100">
          @if (activeTab() === 'general') {
            <div class="space-y-6 pt-4">
              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <app-label htmlFor="backend-url" class="text-sm font-medium"
                    >Backend URL</app-label
                  >
                  @if (!isDefault()) {
                    <button
                      [appButton]
                      variant="ghost"
                      size="sm"
                      (click)="handleReset()"
                      class="h-7 text-xs"
                    >
                      <ng-icon name="lucideRotateCcw" class="h-3 w-3 mr-1" />
                      Reset
                    </button>
                  }
                </div>

                <app-input
                  id="backend-url"
                  type="url"
                  [(ngModel)]="tempUrl"
                  placeholder="http://localhost:8080"
                  class="font-mono text-sm"
                />

                <p class="text-xs text-muted-foreground">
                  Default: <span class="font-mono">{{ defaultUrl }}</span>
                </p>

                <div class="flex gap-2 pt-2 min-h-9">
                  @if (isModified()) {
                    <button [appButton] (click)="handleSave()" size="sm" class="flex-1">
                      Apply & Reload
                    </button>
                    <button
                      [appButton]
                      (click)="tempUrl.set(backendUrl())"
                      variant="outline"
                      size="sm"
                      class="flex-1"
                    >
                      Cancel
                    </button>
                  }
                </div>
              </div>

              @if (store.authRequired || authTokenStored()) {
                <div class="space-y-3 border-t pt-6">
                  <div class="flex items-center justify-between">
                    <app-label class="text-sm font-medium">Authentication Token</app-label>
                    @if (!store.authRequired && authTokenStored()) {
                      <span class="text-xs text-muted-foreground"
                        >(Not required by current backend)</span
                      >
                    }
                  </div>

                  @if (authTokenStored()) {
                    <div class="space-y-3">
                      <div class="flex items-center gap-2">
                        <app-input
                          type="password"
                          value="••••••••••••••••••••"
                          class="font-mono text-sm flex-1"
                        />
                        <button
                          [appButton]
                          variant="destructive"
                          size="sm"
                          (click)="handleClearAuthToken()"
                          class="shrink-0"
                        >
                          Clear
                        </button>
                      </div>
                      <p class="text-xs text-green-600 dark:text-green-400">
                        ✓ Token configured and stored locally
                      </p>
                    </div>
                  } @else {
                    <div class="space-y-3">
                      <app-input
                        type="password"
                        [(ngModel)]="newAuthToken"
                        (keydown.enter)="handleAuthTokenSave()"
                        placeholder="Enter bearer token"
                        class="font-mono text-sm"
                      />
                      <button
                        [appButton]
                        (click)="handleAuthTokenSave()"
                        size="sm"
                        [disabled]="!newAuthToken().trim()"
                        class="w-full"
                      >
                        Save & Reload
                      </button>
                    </div>
                  }
                </div>
              }

              @if (store.serverCapabilities.deployment) {
                <div class="space-y-3 border-t pt-6">
                  <div class="flex items-center justify-between">
                    <div class="space-y-0.5">
                      <app-label class="text-sm font-medium">Azure Deployment</app-label>
                      <p class="text-xs text-muted-foreground">
                        Enable one-click deployment to Azure Container Apps
                      </p>
                    </div>
                    <app-switch
                      [checked]="store.azureDeploymentEnabled"
                      (checkedChange)="store.setAzureDeploymentEnabled($event)"
                    />
                  </div>
                </div>
              }

              <div class="space-y-3 border-t pt-6">
                <div class="flex items-center justify-between">
                  <div class="space-y-0.5">
                    <app-label class="text-sm font-medium">Show Tool Calls</app-label>
                  </div>
                  <app-switch
                    [checked]="store.showToolCalls"
                    (checkedChange)="store.setShowToolCalls($event)"
                  />
                </div>

                <div class="flex items-center justify-between border-t pt-6">
                  <div class="space-y-0.5">
                    <app-label class="text-sm font-medium">Streaming Mode</app-label>
                  </div>
                  <app-switch
                    [checked]="store.streamingEnabled"
                    (checkedChange)="store.setStreamingEnabled($event)"
                  />
                </div>
              </div>
            </div>
          }

          @if (activeTab() === 'proxy' && store.serverCapabilities.openai_proxy) {
            <div class="space-y-6 pt-4">
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <app-label class="text-base font-medium">OpenAI Proxy Mode</app-label>
                </div>
                <app-switch
                  [checked]="store.oaiMode.enabled"
                  (checkedChange)="updateProxyConfig({ enabled: $event })"
                />
              </div>

              @if (store.oaiMode.enabled) {
                <div class="space-y-4 pl-4 border-l-2 border-muted">
                  <div class="space-y-2">
                    <app-label class="text-sm font-medium">Model</app-label>
                    <app-input
                      [(ngModel)]="proxyModel"
                      placeholder="gpt-4.1-mini"
                      class="font-mono text-sm"
                    />
                  </div>

                  <div class="flex flex-wrap gap-2">
                    @for (m of presetModels; track m) {
                      <button
                        [appButton]="store.oaiMode.model === m ? 'default' : 'outline'"
                        size="sm"
                        (click)="updateProxyConfig({ model: m })"
                        class="text-xs h-7"
                      >
                        {{ m }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }

          @if (activeTab() === 'about') {
            <div class="space-y-4 pt-4">
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-muted-foreground">Version:</span>
                  <span class="font-mono">{{ store.serverVersion || 'Unknown' }}</span>
                </div>
              </div>
              <div class="flex justify-center pt-2">
                <button [appButton] variant="outline" size="sm" (click)="goToRepo()">
                  <ng-icon name="lucideExternalLink" class="h-3 w-3 mr-1" />
                  Learn More
                </button>
              </div>
            </div>
          }
        </div>
      </app-dialog-content>
    </app-dialog>
  `,
})
export class SettingsModalComponent {
  // --- Input/Output Signals (Angular 18+) ---
  showModal = model.required<boolean>()
  onBackendUrlChange = output<string>()

  // --- Store ---
  protected store = inject(DevUIStore)

  // --- Local State Signals ---
  protected activeTab = signal<Tab>('general')
  protected presetModels = PRESET_MODELS
  protected tabs: { id: Tab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'proxy', label: 'OpenAI Proxy' },
    { id: 'about', label: 'About' },
  ]

  // URL Logic
  protected defaultUrl = (import.meta as any).env.VITE_API_BASE_URL ?? ''
  protected backendUrl = signal(localStorage.getItem('devui_backend_url') || this.defaultUrl)
  protected tempUrl = signal(this.backendUrl())
  protected isModified = computed(() => this.tempUrl() !== this.backendUrl())
  protected isDefault = computed(() => !localStorage.getItem('devui_backend_url'))

  // Auth Logic
  protected authTokenStored = signal(!!localStorage.getItem('devui_auth_token'))
  protected newAuthToken = signal('')

  // Proxy Helper (实现双向绑定到 store)
  get proxyModel() {
    return this.store.oaiMode.model
  }
  set proxyModel(val: string) {
    this.updateProxyConfig({ model: val })
  }

  handleSave() {
    try {
      new URL(this.tempUrl())
      localStorage.setItem('devui_backend_url', this.tempUrl())
      this.onBackendUrlChange.emit(this.tempUrl())
      this.showModal.set(false)
      window.location.reload()
    } catch {
      alert('Please enter a valid URL')
    }
  }

  handleReset() {
    localStorage.removeItem('devui_backend_url')
    window.location.reload()
  }

  handleAuthTokenSave() {
    if (!this.newAuthToken().trim()) return
    localStorage.setItem('devui_auth_token', this.newAuthToken().trim())
    window.location.reload()
  }

  handleClearAuthToken() {
    localStorage.removeItem('devui_auth_token')
    window.location.reload()
  }

  updateProxyConfig(patch: any) {
    this.store.setOAIMode({ ...this.store.oaiMode, ...patch })
  }

  goToRepo() {
    window.open('https://github.com/microsoft/agent-framework', '_blank')
  }
}
