import { Component, computed, signal, effect, ElementRef, viewChild } from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { input, output } from '@angular/core'
import { CdkMenuModule } from '@angular/cdk/menu'

import type { JSONSchemaProperty, CheckpointItem, ResponseInputContent } from '../../../types'

import { ButtonComponent } from '@shared/ui/button.component'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@shared/ui/dropdown.component'
import { BadgeComponent } from '@src/app/shared/ui/badge'
import { ChatMessageInputComponent } from '@src/app/features/devui/components/ui/chat-message-input.component'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
} from '@shared/ui/dialog.component'
import { WorkflowInputFormComponent } from './workflow-input-form.component'
import { isChatMessageSchema } from '../../../utils/tool'

@Component({
  selector: 'app-run-workflow-button',
  standalone: true,
  imports: [
    CdkMenuModule,
    NgIconComponent,
    ButtonComponent,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    BadgeComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
    WorkflowInputFormComponent,
    ChatMessageInputComponent,
  ],
  template: `@let analysis = inputAnalysis();
    @let state = workflowState();
    @let content = buttonContent();
    @let schema = inputSchema();

    <div class="flex w-full">
      @if (!showDropdown()) {
        <button
          [appButton]
          (click)="handleDirectRun(analysis, schema)"
          [disabled]="isDisabled()"
          [variant]="buttonVariant()"
          class="gap-2 w-full"
          [title]="state === 'running' && canCancel() ? 'Stop workflow execution' : ''"
        >
          <ng-icon
            [name]="content.icon"
            class="w-4 h-4"
            [class.animate-spin]="isSpinning()"
          ></ng-icon>
          {{ content.text }}
        </button>
      } @else {
        <button
          [appButton]
          (click)="handleDirectRun(analysis, schema)"
          [disabled]="isDisabled()"
          [variant]="buttonVariant()"
          class="gap-2 rounded-r-none flex-1"
        >
          <ng-icon
            [name]="content.icon"
            class="w-4 h-4"
            [class.animate-spin]="isSpinning()"
          ></ng-icon>
          {{ content.text }}
        </button>

        <button
          [appButton]
          [disabled]="isDisabled()"
          [variant]="buttonVariant()"
          class="rounded-l-none border-l-0 px-2"
          [appDropdownMenu]="workflowMenu"
        >
          <ng-icon name="lucideChevronDown" class="w-4 h-4"></ng-icon>
        </button>
      }
    </div>

    <ng-template #workflowMenu>
      <app-dropdown-menu-content class="w-80 max-h-100 overflow-y-auto">
        @if (hasCheckpoints()) {
          <button appDropdownMenuItem (click)="handleDirectRun(analysis, schema)">
            <ng-icon name="lucidePlay" class="w-4 h-4 mr-2"></ng-icon>
            Run Fresh
          </button>
        }

        @if (analysis.needsInput) {
          <button appDropdownMenuItem (click)="showModal.set(true)">
            <ng-icon name="lucideSettings" class="w-4 h-4 mr-2"></ng-icon>
            Configure Inputs
          </button>
        }

        @if (hasCheckpoints()) {
          <app-dropdown-menu-separator />
          <div class="px-2 py-1.5 text-xs text-muted-foreground">Resume from checkpoint</div>

          @for (checkpoint of checkpoints(); track checkpoint.checkpoint_id; let index = $index) {
            <button
              appDropdownMenuItem
              (click)="handleRunFromCheckpoint(analysis, schema, checkpoint.checkpoint_id)"
              class="flex flex-col items-start py-2 w-full"
            >
              <div class="flex items-center gap-2 w-full">
                <ng-icon name="lucideRefreshCw" class="w-4 h-4 shrink-0"></ng-icon>
                <span class="font-medium">
                  {{
                    checkpoint.metadata.iteration_count === 0
                      ? 'Initial State'
                      : 'Step ' + checkpoint.metadata.iteration_count
                  }}
                </span>
                @if (index === 0) {
                  <app-badge variant="secondary" class="text-[10px] h-4 px-1 ml-auto"
                    >Latest</app-badge
                  >
                }
              </div>
              <div class="flex items-center gap-2 text-xs text-muted-foreground ml-6 mt-0.5">
                <ng-icon name="lucideClock" class="w-3 h-3"></ng-icon>
                <span>{{ formatTimestamp(checkpoint.timestamp) }}</span>
                @if (checkpoint.metadata.size_bytes) {
                  <span>•</span>
                  <span>{{ formatSize(checkpoint.metadata.size_bytes) }}</span>
                }
              </div>
            </button>
          }
        }
      </app-dropdown-menu-content>
    </ng-template>

    @if (schema) {
      <app-dialog [open]="showModal()" (openChange)="showModal.set($event)">
        <app-dialog-header class="px-8 pt-6">
          <app-dialog-title>Configure Workflow Inputs</app-dialog-title>
          <app-dialog-close (close)="showModal.set(false)" />
        </app-dialog-header>

        <app-dialog-content
          class="w-full min-w-100 max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] flex flex-col"
        >
          <div class="px-8 py-4 border-b shrink-0">
            <div class="text-sm text-muted-foreground">
              <div class="flex items-center gap-3">
                <span class="font-medium">Input Type:</span>
                <app-badge variant="secondary">
                  {{
                    analysis.isChatMessage
                      ? 'Chat Message'
                      : schema.type === 'string'
                        ? 'Simple Text'
                        : 'Structured Data'
                  }}
                </app-badge>
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto py-4 px-8">
            @if (analysis.isChatMessage) {
              <app-chat-message-input
                (onSubmit)="handleChatSubmit($event)"
                [isSubmitting]="isSubmitting()"
                placeholder="Enter your message..."
                entityName="workflow"
                [showFileUpload]="true"
              />
            } @else {
              <app-workflow-input-form
                [inputSchema]="schema"
                inputTypeName="Input"
                (onSubmit)="handleFormSubmit($event)"
                [isSubmitting]="isSubmitting()"
                className="embedded"
              />
            }
          </div>
        </app-dialog-content>
      </app-dialog>
    } `,
})
export class RunWorkflowButtonComponent {
  inputSchema = input<JSONSchemaProperty>()
  isSubmitting = input.required<boolean>()
  isCancelling = input<boolean>(false)
  workflowState = input.required<'ready' | 'running' | 'completed' | 'error' | 'cancelled'>()
  checkpoints = input<CheckpointItem[]>([])
  showCheckpoints = input<boolean>(true)

  run = output<{ data: Record<string, unknown>; checkpointId?: string }>()
  canCancel = input<boolean>(false)
  cancel = output<void>()

  showModal = signal(false)

  inputAnalysis = computed(() => {
    const schema = this.inputSchema()
    if (!schema)
      return {
        needsInput: false,
        hasDefaults: false,
        fieldCount: 0,
        canRunDirectly: true,
        isChatMessage: false,
      }

    const isChatMessage = isChatMessageSchema(schema)
    if (schema.type === 'string') {
      return {
        needsInput: !schema.default,
        hasDefaults: !!schema.default,
        fieldCount: 1,
        canRunDirectly: !!schema.default,
        isChatMessage: false,
      }
    }

    if (schema.type === 'object' && schema.properties) {
      const fields = Object.entries(schema.properties)
      const fieldsWithDefaults = fields.filter(
        ([, s]) => s.default !== undefined || (s.enum && s.enum.length > 0),
      )
      return {
        needsInput: fields.length > 0,
        hasDefaults: fieldsWithDefaults.length > 0,
        fieldCount: fields.length,
        canRunDirectly: fields.length === 0 || fieldsWithDefaults.length === fields.length,
        isChatMessage,
      }
    }

    return {
      needsInput: false,
      hasDefaults: false,
      fieldCount: 0,
      canRunDirectly: true,
      isChatMessage: false,
    }
  })

  hasCheckpoints = computed(() => this.showCheckpoints() && this.checkpoints().length > 0)
  showDropdown = computed(() => this.hasCheckpoints() || this.inputAnalysis().needsInput)
  isDisabled = computed(
    () => (this.workflowState() === 'running' && !this.canCancel()) || this.isCancelling(),
  )
  buttonVariant = computed(() => (this.workflowState() === 'error' ? 'destructive' : 'default'))

  buttonContent = computed(() => {
    const state = this.workflowState()
    const analysis = this.inputAnalysis()
    if (this.isCancelling()) return { icon: 'lucideLoader2' as const, text: 'Stopping...' }
    if (state === 'running' && this.canCancel())
      return { icon: 'lucideSquare' as const, text: 'Stop' }
    if (state === 'running') return { icon: 'lucideLoader2' as const, text: 'Running...' }
    if (state === 'error') return { icon: 'lucideRotateCcw' as const, text: 'Retry' }
    if (state === 'completed') return { icon: 'lucidePlay' as const, text: 'Run Again' }
    if (analysis.needsInput && !analysis.canRunDirectly)
      return { icon: 'lucideSettings' as const, text: 'Configure & Run' }
    return { icon: 'lucidePlay' as const, text: 'Run Workflow' }
  })

  isSpinning = computed(
    () => this.isCancelling() || (this.workflowState() === 'running' && !this.canCancel()),
  )

  constructor() {
    effect((onCleanup) => {
      if (this.showModal()) {
        const handler = (e: KeyboardEvent) => {
          if (e.key === 'Escape') this.showModal.set(false)
        }
        window.addEventListener('keydown', handler)
        onCleanup(() => window.removeEventListener('keydown', handler))
      }
    })
  }

  private getDefaultData(schema: JSONSchemaProperty | undefined): Record<string, unknown> {
    const data: Record<string, unknown> = {}
    if (schema?.type === 'string' && schema.default) {
      data['input'] = schema.default
    } else if (schema?.type === 'object' && schema.properties) {
      Object.entries(schema.properties).forEach(([key, s]) => {
        if (s.default !== undefined) data[key] = s.default
        else if (s.enum?.length) data[key] = s.enum[0]
      })
    }
    return data
  }

  handleDirectRun(
    analysis: ReturnType<typeof this.inputAnalysis>,
    schema: JSONSchemaProperty | undefined,
  ) {
    if (this.workflowState() === 'running' && this.canCancel()) {
      this.cancel.emit()
    } else if (analysis.canRunDirectly) {
      this.run.emit({ data: this.getDefaultData(schema) })
    } else {
      this.showModal.set(true)
    }
  }

  handleRunFromCheckpoint(
    analysis: ReturnType<typeof this.inputAnalysis>,
    schema: JSONSchemaProperty | undefined,
    checkpointId: string,
  ) {
    if (analysis.canRunDirectly) {
      this.run.emit({ data: this.getDefaultData(schema), checkpointId })
    } else {
      this.showModal.set(true)
    }
  }

  handleChatSubmit(content: ResponseInputContent[]) {
    this.run.emit({ data: [{ type: 'message', role: 'user', content }] as any })
    this.showModal.set(false)
  }

  handleFormSubmit(values: unknown) {
    this.run.emit({ data: values as Record<string, unknown> })
    this.showModal.set(false)
  }

  formatSize(bytes?: number): string {
    if (!bytes) return ''
    const kb = bytes / 1024
    return kb < 1
      ? `${bytes} B`
      : kb < 1024
        ? `${kb.toFixed(1)} KB`
        : `${(kb / 1024).toFixed(1)} MB`
  }

  formatTimestamp(ts: string | number | Date): string {
    return new Date(ts).toLocaleTimeString()
  }
}
