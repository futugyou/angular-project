import { Component, input, output, forwardRef, signal, computed, model } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { NgTemplateOutlet } from '@angular/common'
import { CdkMenuModule } from '@angular/cdk/menu'
import { ButtonDirective } from '../../directives/button.directive'
import { LoadingSpinnerComponent } from '../ui/loading-spinner.component'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/dropdown.component'
import { NgIconComponent } from '@ng-icons/core'
import type { AgentInfo, WorkflowInfo } from '../../types'

@Component({
  selector: 'app-entity-selector',
  standalone: true,
  imports: [
    CdkMenuModule,
    NgIconComponent,
    ButtonDirective,
    NgTemplateOutlet,
    LoadingSpinnerComponent,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => EntitySelector),
      multi: true,
    },
  ],
  template: `
    <button
      [appButton]
      variant="outline"
      class="w-64 justify-between font-mono text-sm"
      [disabled]="isLoading()"
      [cdkMenuTriggerFor]="menu"
      (cdkMenuOpened)="isOpen.set(true)"
      (cdkMenuClosed)="isOpen.set(false)"
    >
      @if (isLoading()) {
        <div class="flex items-center gap-2">
          <app-loading-spinner size="sm" />
          <span class="text-muted-foreground">Loading...</span>
        </div>
      } @else {
        <div class="flex items-center gap-2 min-w-0">
          <ng-icon [name]="selectedIcon()" class="h-4 w-4 shrink-0" />
          <span class="truncate">{{ displayName() }}</span>

          @if (selectedValue(); as item) {
            @if (item.metadata?.['lazy_loaded'] === false) {
              <ng-icon
                name="lucideLoader2"
                class="h-3 w-3 text-muted-foreground animate-spin ml-auto shrink-0"
              />
            }
          }
        </div>
        <ng-icon name="lucideChevronDown" class="h-4 w-4 opacity-50" />
      }
    </button>

    <ng-template #menu>
      <app-dropdown-menu-content
        class="w-80 font-mono shadow-md border bg-popover text-popover-foreground rounded-md p-1"
      >
        @if (allItems().length > 0) {
          @if (firstItemType() === 'workflow') {
            <ng-container *ngTemplateOutlet="workflowSection" />
            <ng-container *ngTemplateOutlet="agentSection" />
          } @else {
            <ng-container *ngTemplateOutlet="agentSection" />
            <ng-container *ngTemplateOutlet="workflowSection" />
          }
        } @else {
          <button
            [appDropdownMenuItem]
            [disabled]="true"
            class="w-full text-center text-muted-foreground py-2 cursor-default"
          >
            {{ isLoading() ? 'Loading agents and workflows...' : 'No agents or workflows found' }}
          </button>
        }

        <app-dropdown-menu-separator></app-dropdown-menu-separator>
        <button
          [appDropdownMenuItem]
          class="cursor-pointer text-primary w-full flex items-center"
          (click)="onBrowseGallery.emit()"
        >
          <ng-icon name="lucidePlus" class="h-4 w-4 mr-2" />
          Browse Gallery
        </button>
      </app-dropdown-menu-content>
    </ng-template>

    <ng-template #workflowSection>
      @if (workflowItems().length > 0) {
        @if (agentItems().length > 0 && firstItemType() === 'agent') {
          <app-dropdown-menu-separator></app-dropdown-menu-separator>
        }
        <app-dropdown-menu-label class="flex items-center gap-2">
          <ng-icon name="lucideWorkflow" class="h-4 w-4" />
          Workflows ({{ workflowItems().length }})
        </app-dropdown-menu-label>
        @for (item of workflowItems(); track item.id) {
          <button
            [appDropdownMenuItem]
            class="cursor-pointer group w-full text-left"
            (click)="handleSelect(item)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <ng-icon name="lucideWorkflow" class="h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <span class="truncate font-medium block">{{ item.name || item.id }}</span>
                @if (item.metadata?.['lazy_loaded'] !== false && item.description) {
                  <div class="text-xs text-muted-foreground line-clamp-2">
                    {{ item.description }}
                  </div>
                }
              </div>
            </div>
          </button>
        }
      }
    </ng-template>

    <ng-template #agentSection>
      @if (agentItems().length > 0) {
        @if (workflowItems().length > 0 && firstItemType() === 'workflow') {
          <app-dropdown-menu-separator></app-dropdown-menu-separator>
        }
        <app-dropdown-menu-label class="flex items-center gap-2">
          <ng-icon name="lucideBot" class="h-4 w-4" />
          Agents ({{ agentItems().length }})
        </app-dropdown-menu-label>
        @for (item of agentItems(); track item.id) {
          <button
            [appDropdownMenuItem]
            class="cursor-pointer group w-full text-left"
            (click)="handleSelect(item)"
          >
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <ng-icon name="lucideBot" class="h-4 w-4 shrink-0" />
              <div class="min-w-0 flex-1">
                <span class="truncate font-medium block">{{ item.name || item.id }}</span>
                @if (item.metadata?.['lazy_loaded'] !== false && item.description) {
                  <div class="text-xs text-muted-foreground line-clamp-2">
                    {{ item.description }}
                  </div>
                }
              </div>
            </div>
          </button>
        }
      }
    </ng-template>
  `,
  host: {
    class: 'inline-block',
  },
})
export class EntitySelector implements ControlValueAccessor {
  // Inputs (Signal API)
  agents = input<AgentInfo[]>([])
  workflows = input<WorkflowInfo[]>([])
  entities = input<(AgentInfo | WorkflowInfo)[] | undefined>(undefined)
  isLoading = input<boolean>(false)

  // Outputs (Signal API)
  onSelect = output<AgentInfo | WorkflowInfo>()
  onBrowseGallery = output<void>()

  // Internal State
  isOpen = signal(false)
  selectedValue = model<AgentInfo | WorkflowInfo | undefined>(undefined)

  // Computed Values
  allItems = computed(() => this.entities() || [...this.agents(), ...this.workflows()])

  firstItemType = computed(() => this.allItems()[0]?.type)

  agentItems = computed(() => this.allItems().filter((i) => i.type === 'agent'))

  workflowItems = computed(() => this.allItems().filter((i) => i.type === 'workflow'))

  displayName = computed(() => {
    const val = this.selectedValue()
    return val ? val.name || val.id : 'Select Agent or Workflow'
  })

  selectedIcon = computed(() => {
    const val = this.selectedValue()
    if (!val) return 'lucideBot'
    return val.type === 'workflow' ? 'lucideWorkflow' : 'lucideBot'
  })

  // ControlValueAccessor Implementation
  private onChange: (val: any) => void = () => {}
  private onTouched: () => void = () => {}

  writeValue(value: AgentInfo | WorkflowInfo): void {
    this.selectedValue.set(value)
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  // Handlers
  handleSelect(item: AgentInfo | WorkflowInfo) {
    this.selectedValue.set(item)
    this.onSelect.emit(item)
    this.onChange(item)
    this.onTouched()
  }
}
