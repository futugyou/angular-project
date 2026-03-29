import { Component, computed, input, output } from '@angular/core'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { AgentInfo } from '../../../types'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
} from '../../ui/dialog.component'

@Component({
  selector: 'app-detail-card',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div [class]="'border rounded-lg p-4 bg-card ' + className()">
      <div class="flex items-center gap-2 mb-3">
        <ng-icon [name]="iconName()" class="h-4 w-4 text-muted-foreground" />
        <h3 class="text-sm font-semibold text-foreground">{{ title() }}</h3>
      </div>
      <div class="text-sm text-muted-foreground">
        <ng-content />
      </div>
    </div>
  `,
})
export class DetailCardComponent {
  title = input.required<string>()
  iconName = input.required<string>()
  className = input<string>('')
}

@Component({
  selector: 'app-agent-details-modal',
  standalone: true,
  imports: [
    NgIconComponent,
    DetailCardComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
  ],
  template: `
    <app-dialog [open]="open()" (openChange)="onOpenChange.emit($event)">
      @let info = agent();

      <app-dialog-header class="px-6 pt-6 shrink-0">
        <app-dialog-title>Agent Details</app-dialog-title>
        <app-dialog-close (close)="onOpenChange.emit(false)" />
      </app-dialog-header>

      <app-dialog-content class="max-w-4xl max-h-[90vh] flex flex-col">
        <div class="px-6 pb-6 overflow-y-auto flex-1">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              <ng-icon name="lucideBot" class="h-6 w-6 text-primary" />
              <h2 class="text-xl font-semibold text-foreground">
                {{ info.name || info.id }}
              </h2>
            </div>
            @if (info.description) {
              <p class="text-muted-foreground">{{ info.description }}</p>
            }
          </div>

          <div class="h-px bg-border mb-6"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            @if (info.model_id || info.chat_client_type) {
              <app-detail-card title="Model & Client" iconName="lucideBot">
                <div class="space-y-1">
                  @if (info.model_id) {
                    <div class="font-mono text-foreground">{{ info.model_id }}</div>
                  }
                  @if (info.chat_client_type) {
                    <div class="text-xs">({{ info.chat_client_type }})</div>
                  }
                </div>
              </app-detail-card>
            }

            <app-detail-card title="Source" [iconName]="sourceIcon()">
              <div class="space-y-1">
                <div class="text-foreground">{{ sourceLabel() }}</div>
                @if (info.module_path) {
                  <div class="font-mono text-xs break-all">{{ info.module_path }}</div>
                }
              </div>
            </app-detail-card>

            <app-detail-card
              title="Environment"
              [iconName]="info.has_env ? 'lucideXCircle' : 'lucideCheckCircle'"
              className="md:col-span-2"
            >
              <div
                [class]="
                  info.has_env
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                "
              >
                {{
                  info.has_env
                    ? 'Requires environment variables'
                    : 'No environment variables required'
                }}
              </div>
            </app-detail-card>
          </div>

          @if (info.instructions; as inst) {
            <app-detail-card title="Instructions" iconName="lucideFileText" className="mb-4">
              <div class="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {{ inst }}
              </div>
            </app-detail-card>
          }

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            @if (info.tools; as tools) {
              <app-detail-card [title]="'Tools (' + tools.length + ')'" iconName="lucidePackage">
                <ul class="space-y-1">
                  @for (tool of tools; track $index) {
                    <li class="font-mono text-xs text-foreground">• {{ tool }}</li>
                  }
                </ul>
              </app-detail-card>
            }

            @if (info.middleware; as mws) {
              <app-detail-card
                [title]="'Middlewares (' + mws.length + ')'"
                iconName="lucidePackage"
              >
                <ul class="space-y-1">
                  @for (mw of mws; track $index) {
                    <li class="font-mono text-xs text-foreground">• {{ mw }}</li>
                  }
                </ul>
              </app-detail-card>
            }

            @if (info.context_provider; as provider) {
              <app-detail-card
                title="Context Provider"
                iconName="lucideDatabase"
                [className]="
                  !info.middleware || info.middleware.length === 0 ? 'md:col-start-2' : ''
                "
              >
                <div class="font-mono text-xs text-foreground">{{ provider }}</div>
              </app-detail-card>
            }
          </div>
        </div>
      </app-dialog-content>
    </app-dialog>
  `,
})
export class AgentDetailsModalComponent {
  // Signal Inputs
  agent = input.required<AgentInfo>()
  open = input.required<boolean>()

  // Signal Output
  onOpenChange = output<boolean>()

  sourceIcon = computed(() => {
    const s = this.agent().source
    if (s === 'directory') return 'lucideFolderOpen'
    if (s === 'in_memory') return 'lucideDatabase'
    return 'lucideGlobe'
  })

  sourceLabel = computed(() => {
    const s = this.agent().source
    if (s === 'directory') return 'Local'
    if (s === 'in_memory') return 'In-Memory'
    return 'Gallery'
  })
}
