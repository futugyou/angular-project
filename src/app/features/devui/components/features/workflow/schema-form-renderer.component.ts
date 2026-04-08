import { Component, computed, effect, forwardRef, input, model, signal, Type } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms'
import { NgIconComponent } from '@ng-icons/core'
import type { JSONSchemaProperty } from '../../../types'

import { ButtonComponent } from '@shared/ui/button'
import { LabelComponent } from '@shared/ui/label.component'
import { CheckboxComponent } from '@shared/ui/checkbox.component'
import { TextareaComponent } from '@shared/ui/textarea.component'
import { InputComponent } from '@shared/ui/input.component'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@shared/ui/select.component'

// ============================================================================
// Field Type Detection Helpers
// ============================================================================

export function isShortField(fieldName: string): boolean {
  const shortFieldNames = [
    'name',
    'title',
    'id',
    'key',
    'label',
    'type',
    'status',
    'tag',
    'category',
    'code',
    'username',
    'password',
    'email',
  ]
  return shortFieldNames.includes(fieldName.toLowerCase())
}

export function resolveSchemaType(schema: JSONSchemaProperty): JSONSchemaProperty {
  if (schema.type) return schema
  const union = schema.anyOf || schema.oneOf
  if (union && union.length > 0) {
    const nonNullTypes = union.filter((s) => s.type !== 'null' && s.type !== undefined)
    if (nonNullTypes.length > 0) {
      return {
        ...nonNullTypes[0],
        default: schema.default ?? nonNullTypes[0].default,
        description: schema.description ?? nonNullTypes[0].description,
        title: schema.title ?? nonNullTypes[0].title,
      }
    }
  }
  return schema
}

export function shouldFieldBeTextarea(fieldName: string, schema: JSONSchemaProperty): boolean {
  return (
    schema.format === 'textarea' ||
    (!!schema.description && schema.description.length > 100) ||
    (schema.type === 'string' && !schema.enum && !isShortField(fieldName))
  )
}

export function getFieldColumnSpan(fieldName: string, schema: JSONSchemaProperty): string {
  const isTextarea = shouldFieldBeTextarea(fieldName, schema)
  const hasLongDescription = !!schema.description && schema.description.length > 150
  if (isTextarea || hasLongDescription) return 'md:col-span-2 lg:col-span-3 xl:col-span-4'
  if (schema.type === 'array' || (!!schema.description && schema.description.length > 80))
    return 'xl:col-span-2'
  return ''
}

export function detectChatMessagePattern(
  schema: JSONSchemaProperty,
  requiredFields: string[],
): boolean {
  if (schema.type !== 'object' || !schema.properties) return false
  const properties = schema.properties
  const optionalFields = Object.keys(properties).filter((name) => !requiredFields.includes(name))
  return (
    requiredFields.includes('role') &&
    optionalFields.some((f) => ['text', 'message', 'content'].includes(f)) &&
    properties['role']?.type === 'string'
  )
}

export function validateSchemaForm(
  schema: JSONSchemaProperty,
  values: Record<string, unknown>,
): boolean {
  const requiredFields = schema.required || []

  return requiredFields.every((fieldName) => {
    const value = values[fieldName]
    return value !== undefined && value !== '' && value !== null
  })
}

export function filterEmptyOptionalFields(
  schema: JSONSchemaProperty,
  values: Record<string, unknown>,
): Record<string, unknown> {
  const requiredFields = schema.required || []
  const filtered: Record<string, unknown> = {}

  Object.keys(values).forEach((key) => {
    const value = values[key]
    // Include if: 1) required field, OR 2) has non-empty value
    if (requiredFields.includes(key) || (value !== undefined && value !== '' && value !== null)) {
      filtered[key] = value
    }
  })

  return filtered
}
// ============================================================================
// Internal Form Field Component
// ============================================================================

@Component({
  selector: 'app-schema-form-field',
  standalone: true,
  imports: [
    FormsModule,
    LabelComponent,
    CheckboxComponent,
    TextareaComponent,
    InputComponent,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  ],
  template: `
    <div [class]="columnSpan()">
      @if (isReadOnly()) {
        <div class="space-y-2">
          <app-label [attr.for]="name()" class="text-muted-foreground">{{ name() }}</app-label>
          <div class="text-sm p-2 bg-muted rounded border">
            {{ displayValue() }}
          </div>
          @if (resolvedSchema().description) {
            <p class="text-xs text-muted-foreground">{{ resolvedSchema().description }}</p>
          }
        </div>
      } @else {
        <div class="space-y-2">
          <app-label [attr.for]="name()">
            {{ name() }}
            @if (isRequired()) {
              <span class="text-destructive ml-1">*</span>
            }
          </app-label>

          @switch (resolvedSchema().type) {
            @case ('string') {
              @if (resolvedSchema().enum) {
                <app-select
                  [ngModel]="selectValue()"
                  (ngModelChange)="value.set($event)"
                  [disabled]="isReadOnly()"
                >
                  <app-select-trigger>
                    <app-select-value [placeholder]="'Select ' + name()" />
                  </app-select-trigger>

                  <app-select-content>
                    <app-select-group>
                      @for (option of resolvedSchema().enum; track option) {
                        <app-select-item [value]="option">
                          {{ option }}
                        </app-select-item>
                      }
                    </app-select-group>
                  </app-select-content>
                </app-select>
              } @else if (isTextarea()) {
                <app-textarea
                  [id]="name()"
                  [ngModel]="value()"
                  (ngModelChange)="value.set($event)"
                  [placeholder]="placeholder()"
                  [rows]="4"
                />
              } @else {
                <app-input
                  [id]="name()"
                  [ngModel]="value()"
                  (ngModelChange)="value.set($event)"
                  [placeholder]="placeholder()"
                />
              }
            }
            @case ('integer') {
              <app-input
                type="number"
                step="1"
                [ngModel]="value()"
                (ngModelChange)="onNumberChange($event, true)"
                [placeholder]="placeholder()"
              />
            }
            @case ('number') {
              <app-input
                type="number"
                step="any"
                [ngModel]="value()"
                (ngModelChange)="onNumberChange($event, false)"
                [placeholder]="placeholder()"
              />
            }
            @case ('boolean') {
              <div class="flex items-center space-x-2">
                <app-checkbox
                  [id]="name()"
                  [checked]="!!value()"
                  (checkedChange)="value.set($event)"
                />
                <app-label [attr.for]="name()">{{ name() }}</app-label>
              </div>
            }
            @case ('array') {
              <app-textarea
                [ngModel]="arrayString()"
                (ngModelChange)="onArrayChange($event)"
                placeholder="Enter items separated by commas"
                [rows]="2"
              />
            }
            @default {
              <app-textarea
                class="font-mono text-xs"
                [ngModel]="objectString()"
                (ngModelChange)="onObjectChange($event)"
                placeholder='{"key": "value"}'
                [rows]="3"
              />
            }
          }

          @if (resolvedSchema().description) {
            <p class="text-sm text-muted-foreground">{{ resolvedSchema().description }}</p>
          }
        </div>
      }
    </div>
  `,
})
export class FormFieldComponent {
  name = input.required<string>()
  schema = input.required<JSONSchemaProperty>()
  value = model<any>()
  isRequired = input(false)
  isReadOnly = input(false)

  resolvedSchema = computed(() => resolveSchemaType(this.schema()))
  isTextarea = computed(() => shouldFieldBeTextarea(this.name(), this.resolvedSchema()))
  columnSpan = computed(() => getFieldColumnSpan(this.name(), this.resolvedSchema()))

  // Select 回显逻辑
  selectValue = computed(() => {
    const val = this.value()
    const defaultValue = this.resolvedSchema().default
    const enumValues = this.resolvedSchema().enum || []

    if (typeof val === 'string' && val) return val
    if (typeof defaultValue === 'string') return defaultValue
    return enumValues[0] || ''
  })

  placeholder = computed(() => {
    const s = this.resolvedSchema()
    return typeof s.default === 'string' ? s.default : `Enter ${this.name()}`
  })

  displayValue = computed(() => {
    const val = this.value()
    return typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val ?? '')
  })

  arrayString = computed(() => (Array.isArray(this.value()) ? this.value().join(', ') : ''))
  objectString = computed(() =>
    this.value() && typeof this.value() === 'object' ? JSON.stringify(this.value(), null, 2) : '',
  )

  onNumberChange(val: any, isInt: boolean) {
    const num = isInt ? parseInt(val) : parseFloat(val)
    this.value.set(isNaN(num) ? '' : num)
  }

  onArrayChange(val: string) {
    const arr = val
      .split(',')
      .map((i) => i.trim())
      .filter((i) => i.length > 0)
    this.value.set(arr)
  }

  onObjectChange(val: string) {
    try {
      this.value.set(JSON.parse(val))
    } catch {
      this.value.set(val)
    }
  }
}

// ============================================================================
// Main Schema Form Renderer Component
// ============================================================================

@Component({
  selector: 'app-schema-form-renderer',
  standalone: true,
  imports: [FormFieldComponent, NgIconComponent, ButtonComponent],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SchemaFormRendererComponent),
      multi: true,
    },
  ],
  template: `
    <div [class]="containerClass()">
      @for (field of requiredFieldNames(); track field) {
        <app-schema-form-field
          [name]="field"
          [schema]="properties()[field]"
          [(value)]="fieldValues()[field]"
          [isRequired]="true"
          [isReadOnly]="disabled() || readOnlyFields().includes(field)"
          (valueChange)="onFieldChange()"
        />
      }

      @if (requiredFieldNames().length > 0 && optionalFieldNames().length > 0) {
        <div [class]="fullWidthClass()">
          <div class="border-t border-border my-2"></div>
        </div>
      }

      @for (field of visibleOptionalFields(); track field) {
        <app-schema-form-field
          [name]="field"
          [schema]="properties()[field]"
          [(value)]="fieldValues()[field]"
          [isRequired]="false"
          [isReadOnly]="disabled() || readOnlyFields().includes(field)"
          (valueChange)="onFieldChange()"
        />
      }

      @if (hasCollapsedFields()) {
        <div [class]="fullWidthClass()">
          <button
            [appButton]
            variant="ghost"
            size="sm"
            class="w-full justify-center gap-2"
            [disabled]="disabled()"
            (click)="showAdvancedFields.set(!showAdvancedFields())"
          >
            <ng-icon
              [name]="showAdvancedFields() ? 'lucideChevronUp' : 'lucideChevronDown'"
              class="h-4 w-4"
            />
            {{ showAdvancedFields() ? 'Hide' : 'Show' }}
            {{ collapsedOptionalFields().length }} optional field{{
              collapsedOptionalFields().length !== 1 ? 's' : ''
            }}
          </button>
        </div>
      }

      @if (showAdvancedFields()) {
        @for (field of collapsedOptionalFields(); track field) {
          <app-schema-form-field
            [name]="field"
            [schema]="properties()[field]"
            [(value)]="fieldValues()[field]"
            [isRequired]="false"
            [isReadOnly]="disabled() || readOnlyFields().includes(field)"
            (valueChange)="onFieldChange()"
          />
        }
      }
    </div>
  `,
})
export class SchemaFormRendererComponent implements ControlValueAccessor {
  schema = input.required<JSONSchemaProperty>()
  readOnlyFields = input<string[]>([])
  hideFields = input<string[]>([])
  showCollapsedByDefault = input(false)
  layout = input<'stack' | 'grid'>('stack')

  disabled = signal(false)
  showAdvancedFields = signal(false)
  fieldValues = signal<Record<string, any>>({})

  properties = computed(() => this.schema().properties || {})

  private allFieldNames = computed(() =>
    Object.keys(this.properties()).filter((name) => !this.hideFields().includes(name)),
  )

  private requiredFieldsInSchema = computed(() =>
    (this.schema().required || []).filter((name) => !this.hideFields().includes(name)),
  )

  private isChatMessageLike = computed(() =>
    detectChatMessagePattern(this.schema(), this.requiredFieldsInSchema()),
  )

  requiredFieldNames = computed(() =>
    this.allFieldNames().filter(
      (name) =>
        this.requiredFieldsInSchema().includes(name) &&
        !(this.isChatMessageLike() && name === 'role'),
    ),
  )

  optionalFieldNames = computed(() =>
    this.allFieldNames().filter((name) => !this.requiredFieldsInSchema().includes(name)),
  )

  private sortedOptionalFields = computed(() => {
    const opts = [...this.optionalFieldNames()]
    if (this.isChatMessageLike()) {
      return opts.sort((a, b) => {
        const priority = (n: string) => (['text', 'message', 'content'].includes(n) ? 1 : 0)
        return priority(b) - priority(a)
      })
    }
    return opts
  })

  visibleOptionalFields = computed(() => {
    const min = this.isChatMessageLike() ? 1 : 6
    const count = Math.max(0, min - this.requiredFieldNames().length)
    return this.sortedOptionalFields().slice(0, count)
  })

  collapsedOptionalFields = computed(() => {
    const min = this.isChatMessageLike() ? 1 : 6
    const count = Math.max(0, min - this.requiredFieldNames().length)
    return this.sortedOptionalFields().slice(count)
  })

  hasCollapsedFields = computed(() => this.collapsedOptionalFields().length > 0)

  containerClass = computed(() =>
    this.layout() === 'grid'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
      : 'space-y-3',
  )

  fullWidthClass = computed(() =>
    this.layout() === 'grid' ? 'md:col-span-2 lg:col-span-3 xl:col-span-4' : '',
  )

  constructor() {
    effect(() => {
      this.showAdvancedFields.set(this.showCollapsedByDefault())
    })
  }

  onChange: (val: any) => void = () => {}
  onTouched: () => void = () => {}

  writeValue(obj: any): void {
    this.fieldValues.set(obj || {})
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled)
  }

  onFieldChange() {
    this.onChange(this.fieldValues())
    this.onTouched()
  }
}
