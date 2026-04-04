import { Component, input, output, computed } from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
} from '@shared/ui/dialog.component'
import type { WorkflowInfo } from '../../../types'

@Component({
  selector: 'app-detail-card',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div [class]="'border rounded-lg p-4 bg-card ' + className()">
      <div class="flex items-center gap-2 mb-3">
        <ng-icon [name]="iconName()" class="h-4 w-4 text-muted-foreground"></ng-icon>
        <h3 class="text-sm font-semibold text-foreground">{{ title() }}</h3>
      </div>
      <div class="text-sm text-muted-foreground">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class DetailCardComponent {
  title = input.required<string>()
  iconName = input.required<string>()
  className = input<string>('')
}

/**
 * WorkflowDetailsModal Component
 */
@Component({
  selector: 'app-workflow-details-modal',
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
      <app-dialog-header class="px-6 pt-6 shrink-0">
        <app-dialog-title>Workflow Details</app-dialog-title>
        <app-dialog-close (click)="onOpenChange.emit(false)" />
      </app-dialog-header>

      <app-dialog-content class="max-w-4xl max-h-[90vh] flex flex-col">
        <div class="px-6 pb-6 overflow-y-auto flex-1">
          <div class="mb-6">
            <div class="flex items-center gap-3 mb-2">
              <ng-icon name="lucideWorkflow" class="h-6 w-6 text-primary"></ng-icon>
              <h2 class="text-xl font-semibold text-foreground">
                {{ workflow().name || workflow().id }}
              </h2>
            </div>
            @if (workflow().description) {
              <p class="text-muted-foreground">{{ workflow().description }}</p>
            }
          </div>

          <div class="h-px bg-border mb-6"></div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <app-detail-card title="Start Executor" iconName="lucidePlayCircle">
              <div class="font-mono text-foreground">
                {{ workflow().start_executor_id }}
              </div>
            </app-detail-card>

            <app-detail-card [title]="'Source'" [iconName]="sourceIcon()">
              <div class="space-y-1">
                <div class="text-foreground">{{ sourceLabel() }}</div>
                @if (workflow().module_path) {
                  <div class="font-mono text-xs break-all">
                    {{ workflow().module_path }}
                  </div>
                }
              </div>
            </app-detail-card>

            <app-detail-card
              title="Environment"
              [iconName]="workflow().has_env ? 'lucideXCircle' : 'lucideCheckCircle'"
              className="md:col-span-2"
            >
              <div
                [class]="
                  workflow().has_env
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-green-600 dark:text-green-400'
                "
              >
                {{
                  workflow().has_env
                    ? 'Requires environment variables'
                    : 'No environment variables required'
                }}
              </div>
            </app-detail-card>
          </div>

          <app-detail-card
            [title]="'Executors (' + workflow().executors.length + ')'"
            iconName="lucidePackage"
          >
            @if (workflow().executors.length > 0) {
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                @for (executor of workflow().executors; track $index) {
                  <div
                    class="font-mono text-xs text-foreground bg-muted px-2 py-1 rounded truncate"
                    [title]="executor"
                  >
                    {{ executor }}
                  </div>
                }
              </div>
            } @else {
              <div class="text-muted-foreground">No executors configured</div>
            }
          </app-detail-card>
        </div>
      </app-dialog-content>
    </app-dialog>
  `,
})
export class WorkflowDetailsModalComponent {
  // Input Signals
  workflow = input.required<WorkflowInfo>()
  open = input.required<boolean>()

  // Output Signal
  onOpenChange = output<boolean>()

  // Computed state for source icon and label
  sourceIcon = computed(() => {
    const source = this.workflow().source
    if (source === 'directory') return 'lucideFolderOpen'
    if (source === 'in_memory') return 'lucideDatabase'
    return 'lucideGlobe'
  })

  sourceLabel = computed(() => {
    const source = this.workflow().source
    if (source === 'directory') return 'Local'
    if (source === 'in_memory') return 'In-Memory'
    return 'Gallery'
  })
}
