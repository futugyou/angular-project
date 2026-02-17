import { Component, computed, input, output, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgIconComponent } from '@ng-icons/core'
import { SchemaFormRendererComponent, validateSchemaForm } from './schema-form-renderer.component'
import { BadgeComponent } from '../../ui/badge.component'
import { ButtonComponent } from '../../ui/button.component'
import type { JSONSchemaProperty } from '../../../types'
import { ButtonDirective } from '../../../directives/button.directive'

export interface HilRequest {
  request_id: string
  request_data: Record<string, unknown>
  request_schema: JSONSchemaProperty
}

@Component({
  selector: 'app-hil-timeline-item',
  standalone: true,
  imports: [
    BadgeComponent,
    ButtonComponent,
    NgIconComponent,
    SchemaFormRendererComponent,
    FormsModule,
    ButtonDirective,
  ],
  template: `
    <div class="relative group">
      <div>
        <div class="flex-1">
          <div
            class="border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 overflow-hidden rounded-lg"
          >
            <div
              class="px-4 py-3 bg-orange-100/50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 flex items-center justify-between cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-950/40 transition-colors"
              (click)="toggleExpanded()"
            >
              <div class="flex items-center gap-2">
                <span class="font-medium text-sm text-orange-900 dark:text-orange-100">
                  Workflow needs your input
                </span>

                <app-badge
                  variant="outline"
                  class="text-xs font-mono border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                >
                  {{ requestIdShort() }}
                </app-badge>

                @if (!isExpanded()) {
                  <span class="text-xs text-orange-600 dark:text-orange-400 animate-pulse">
                    Click to respond
                  </span>
                }
              </div>

              @if (isSubmitting()) {
                <app-badge variant="secondary" class="animate-pulse"> Submitting... </app-badge>
              }
            </div>

            @if (isExpanded()) {
              <div class="p-4 space-y-4">
                @if (contextEntries().length > 0) {
                  <div class="bg-white/60 dark:bg-gray-900/30 rounded-md p-3 space-y-2">
                    <p class="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Context
                    </p>
                    <div class="max-h-48 overflow-y-auto space-y-1 pr-2">
                      @for (item of contextEntries(); track item.key) {
                        <div class="text-sm">
                          <span class="font-medium text-muted-foreground"> {{ item.key }}: </span>
                          <span class="text-foreground break-all">
                            {{ item.displayValue }}
                          </span>
                        </div>
                      }
                    </div>
                  </div>
                }

                @if (request().request_schema.description) {
                  <div
                    class="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800"
                  >
                    <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">What's needed:</p>
                    <p class="text-blue-800 dark:text-blue-200">
                      {{ request().request_schema.description }}
                    </p>
                  </div>
                }

                <div class="space-y-3">
                  <app-schema-form-renderer
                    [schema]="request().request_schema"
                    [(ngModel)]="response"
                    [disabled]="isSubmitting()"
                  />
                </div>

                <div class="space-y-2 pt-2">
                  <button
                    [appButton]
                    size="default"
                    class="w-full gap-2"
                    [disabled]="!isValid() || isSubmitting()"
                    (click)="submit.emit()"
                  >
                    <ng-icon name="lucideSendHorizontal" class="h-4 w-4 text-muted-foreground" />
                    Submit Response
                  </button>

                  @if (!isValid()) {
                    <div class="text-xs text-muted-foreground text-center">
                      Please fill in all required fields
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
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
export class HilTimelineItemComponent {
  // --- Inputs (Signal-based) ---
  request = input.required<HilRequest>()
  response = input.required<Record<string, unknown>>()
  isSubmitting = input<boolean>(false)

  // --- Outputs (Signal-based) ---
  responseChange = output<Record<string, unknown>>()
  submit = output<void>()

  // --- Internal State ---
  isExpanded = signal(true)

  // --- Computed State ---
  requestIdShort = computed(() => this.request().request_id.slice(0, 8))

  isValid = computed(() => {
    const schema = this.request().request_schema
    const data = this.response()
    return validateSchemaForm(schema, data)
  })

  contextEntries = computed(() => {
    const data = this.request().request_data
    const skipKeys = ['request_id', 'source_executor_id']

    return Object.entries(data)
      .filter(([key]) => !skipKeys.includes(key))
      .map(([key, value]) => ({
        key,
        displayValue: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value),
      }))
  })

  // --- Methods ---
  toggleExpanded() {
    this.isExpanded.update((v) => !v)
  }

  handleResponseChange(values: Record<string, unknown>) {
    this.responseChange.emit(values)
  }
}
