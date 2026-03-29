import { Component, computed, effect, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgTemplateOutlet } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'

import {
  SchemaFormRendererComponent,
  filterEmptyOptionalFields,
  detectChatMessagePattern,
} from './schema-form-renderer.component'
import { ButtonComponent } from '../../ui/button.component'
import { TextareaComponent } from '../../ui/textarea.component'
import { LabelComponent } from '../../ui/label.component'
import { CardTitleComponent } from '../../ui/card.component'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
  DialogFooterComponent,
} from '../../ui/dialog.component'
import type { JSONSchemaProperty } from '../../../types'

@Component({
  selector: 'app-workflow-input-form',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    FormsModule,
    NgIconComponent,
    ButtonComponent,
    TextareaComponent,
    LabelComponent,
    CardTitleComponent,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
    DialogFooterComponent,
    SchemaFormRendererComponent,
  ],
  template: `
    @if (!isEmbedded()) {
      <div [class]="'flex flex-col ' + className()">
        <div class="border-b border-border px-4 py-3 bg-muted">
          <div ui-card-title class="text-sm mb-3">Run Workflow</div>
          <button
            [appButton]
            (click)="isModalOpen.set(true)"
            [disabled]="isSubmitting()"
            class="w-full"
            size="default"
          >
            <ng-icon name="lucideSendHorizontal" class="h-4 w-4 mr-2" />
            {{ isSubmitting() ? 'Running...' : 'Run Workflow' }}
          </button>
        </div>

        <div class="px-4 py-3">
          <div class="text-sm text-muted-foreground">
            <strong>Input Type:</strong>
            <code class="bg-muted px-1 py-0.5 rounded ml-1">{{ inputTypeName() }}</code>
            @if (inputSchema().type === 'object' && inputSchema().properties) {
              <span class="ml-2">
                ({{ fieldNames().length }} field{{ fieldNames().length !== 1 ? 's' : '' }})
              </span>
            }
          </div>
          <p class="text-xs text-muted-foreground mt-2">
            Click "Run Workflow" to configure inputs and execute
          </p>
        </div>
      </div>
    } @else {
      <form (submit)="$event.preventDefault(); handleSubmit()" [class]="className()">
        <ng-container [ngTemplateOutlet]="formFields" />
        <div class="flex gap-2 mt-4 justify-end">
          <button [appButton] type="submit" [disabled]="loading() || !canSubmit()" size="default">
            <ng-icon name="lucideSendHorizontal" class="h-4 w-4" />
            {{ loading() ? 'Running...' : 'Run Workflow' }}
          </button>
        </div>
      </form>
    }

    <app-dialog [open]="isModalOpen()" (openChange)="isModalOpen.set($event)">
      <app-dialog-header>
        <app-dialog-title>Run Workflow</app-dialog-title>
        <app-dialog-close (click)="isModalOpen.set(false)" />
      </app-dialog-header>

      <app-dialog-content
        class="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[90vh] flex flex-col"
      >
        <div class="px-8 py-4 border-b shrink-0">
          <div class="text-sm text-muted-foreground">
            <div class="flex items-center gap-3">
              <span class="font-medium">Input Type:</span>
              <code class="bg-muted px-3 py-1 text-xs font-mono">{{ inputTypeName() }}</code>
              @if (inputSchema().type === 'object') {
                <span class="text-xs text-muted-foreground">
                  {{ fieldNames().length }} field{{ fieldNames().length !== 1 ? 's' : '' }}
                </span>
              }
            </div>
          </div>
        </div>

        <div class="px-8 py-6 overflow-y-auto flex-1 min-h-0">
          <form id="workflow-modal-form" (submit)="$event.preventDefault(); handleSubmit()">
            <ng-container [ngTemplateOutlet]="formFields" />
          </form>
        </div>
      </app-dialog-content>

      <app-dialog-footer class="px-8 py-4 border-t shrink-0">
        <button
          [appButton]
          variant="outline"
          (click)="isModalOpen.set(false)"
          [disabled]="loading()"
        >
          Cancel
        </button>
        <button
          [appButton]
          type="submit"
          form="workflow-modal-form"
          [disabled]="loading() || !canSubmit()"
        >
          <ng-icon name="lucideSendHorizontal" class="h-4 w-4 mr-2" />
          {{ loading() ? 'Running...' : 'Run Workflow' }}
        </button>
      </app-dialog-footer>
    </app-dialog>

    <ng-template #formFields>
      @if (isSimpleInput()) {
        <div class="space-y-2">
          <app-label for="simple-input">Input</app-label>
          <app-textarea
            id="simple-input"
            [ngModel]="formData()['value']"
            (ngModelChange)="updateFormData('value', $event)"
            name="simple-input"
            [placeholder]="simplePlaceholder()"
            [rows]="4"
            class="min-w-75 w-full"
          />
          @if (inputSchema().description) {
            <p class="text-sm text-muted-foreground">{{ inputSchema().description }}</p>
          }
        </div>
      } @else {
        <app-schema-form-renderer
          [schema]="inputSchema()"
          [(ngModel)]="formData"
          [disabled]="loading()"
          [hideFields]="isChatMessageLike() ? ['role'] : []"
          layout="grid"
          name="schema-form"
        />
      }
    </ng-template>
  `,
})
export class WorkflowInputFormComponent {
  // --- Inputs & Outputs ---
  inputSchema = input.required<JSONSchemaProperty>()
  inputTypeName = input.required<string>()
  isSubmitting = input<boolean>(false)
  className = input<string>('')
  onSubmit = output<unknown>()

  // --- State Signals ---
  isModalOpen = signal(false)
  loading = signal(false)

  formData = signal<Record<string, any>>({})

  // --- Computed State ---
  isEmbedded = computed(() => this.className().includes('embedded'))
  fieldNames = computed(() => Object.keys(this.inputSchema().properties || {}))
  isSimpleInput = computed(() => this.inputSchema().type === 'string' && !this.inputSchema().enum)
  isChatMessageLike = computed(() =>
    detectChatMessagePattern(this.inputSchema(), this.inputSchema().required || []),
  )
  simplePlaceholder = computed(() => {
    const def = this.inputSchema().default
    return typeof def === 'string' ? def : 'Enter input'
  })

  canSubmit = computed(() => {
    const data = this.formData()
    const schema = this.inputSchema()
    const required = schema.required || []

    if (this.isSimpleInput()) {
      return data['value'] !== undefined && data['value'] !== ''
    }

    if (required.length > 0) {
      return required.every((field) => {
        if (this.isChatMessageLike() && field === 'role' && data['role'] === 'user') {
          return true
        }
        const val = data[field]
        return val !== undefined && val !== null && val !== ''
      })
    }

    return Object.keys(data).length > 0
  })

  constructor() {
    // 自动初始化逻辑
    effect(() => {
      const schema = this.inputSchema()
      const isChat = this.isChatMessageLike()

      if (schema.type === 'string') {
        this.formData.set({ value: schema.default || '' })
      } else if (schema.type === 'object' && schema.properties) {
        const initialData: Record<string, any> = {}
        Object.entries(schema.properties).forEach(([key, fieldSchema]) => {
          if (fieldSchema.default !== undefined) {
            initialData[key] = fieldSchema.default
          } else if (fieldSchema.enum && fieldSchema.enum.length > 0) {
            initialData[key] = fieldSchema.enum[0]
          }
        })

        if (isChat && !initialData['role']) {
          initialData['role'] = 'user'
        }
        this.formData.set(initialData)
      }
    })
  }

  // 手动更新简单输入框的值
  updateFormData(key: string, value: any) {
    this.formData.update((prev) => ({ ...prev, [key]: value }))
  }

  handleSubmit() {
    this.loading.set(true)
    const schema = this.inputSchema()
    const data = this.formData()

    let outputData: unknown

    if (schema.type === 'string') {
      outputData = { input: data['value'] || '' }
    } else if (schema.type === 'object') {
      const names = this.fieldNames()
      if (names.length === 1) {
        outputData = { [names[0]]: data[names[0]] || '' }
      } else {
        outputData = filterEmptyOptionalFields(schema, data)
      }
    } else {
      outputData = data
    }

    this.onSubmit.emit(outputData)

    if (!this.isEmbedded()) {
      this.isModalOpen.set(false)
    }
    this.loading.set(false)
  }
}
