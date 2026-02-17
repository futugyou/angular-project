import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
  ElementRef,
} from '@angular/core'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import {
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
} from '../../ui/dialog.component'
import { ScrollAreaComponent } from '../../ui/scroll-area.component'
import { BadgeComponent } from '../../ui/badge.component'
import { ApiClient } from '../../../services/api.service'
import { cn } from '../../../lib/utils'
import { DatePipe, JsonPipe } from '@angular/common'
import type {
  CheckpointItem,
  WorkflowSession,
  FullCheckpoint,
  PendingRequestInfoEvent,
} from '../../../types'

@Component({
  selector: 'app-checkpoint-info-modal',
  standalone: true,
  imports: [
    NgIconComponent,
    DatePipe,
    JsonPipe,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogCloseComponent,
    ScrollAreaComponent,
    BadgeComponent,
  ],
  template: `
    <app-dialog [open]="open()" (openChange)="onOpenChange.emit($event)">
      <app-dialog-content class="w-[90vw] max-w-6xl min-w-[800px] h-[85vh] flex flex-col p-0">
        <app-dialog-header class="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex-1">
              <app-dialog-title>{{ session()?.metadata?.name }}</app-dialog-title>
              <div class="text-sm text-muted-foreground mt-1">
                {{ checkpoints().length }} checkpoint{{ checkpoints().length !== 1 ? 's' : '' }}
              </div>
              <div class="text-xs text-muted-foreground mt-2 max-w-2xl">
                This is a read only view of the current checkpoint ids in the checkpoint storage for
                this workflow run.
              </div>
            </div>
            <app-dialog-close />
          </div>
        </app-dialog-header>

        <div class="flex-1 flex overflow-hidden min-h-0">
          <div class="w-80 border-r flex flex-col">
            <app-scroll-area class="flex-1">
              <div class="p-4 space-y-2">
                @if (checkpoints().length === 0) {
                  <div class="text-center text-sm text-muted-foreground py-8">
                    No checkpoints yet
                  </div>
                } @else {
                  @for (
                    checkpoint of checkpoints();
                    track checkpoint.checkpoint_id;
                    let index = $index
                  ) {
                    <div class="relative">
                      <button
                        (click)="selectedCheckpointId.set(checkpoint.checkpoint_id)"
                        [class]="
                          cn(
                            'relative w-full text-left p-3 rounded-lg border transition-colors',
                            selectedCheckpointId() === checkpoint.checkpoint_id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50 border-transparent'
                          )
                        "
                      >
                        <div class="flex items-start gap-3">
                          <div class="flex flex-col items-center pt-1">
                            <div
                              [class]="
                                cn(
                                  'w-2 h-2 rounded-full z-10',
                                  checkpoint.metadata.has_pending_hil
                                    ? 'bg-blue-500 ring-2 ring-blue-500/20'
                                    : 'bg-muted-foreground/30'
                                )
                              "
                            ></div>
                          </div>

                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2">
                              <span class="text-sm font-medium">
                                {{
                                  checkpoint.metadata.iteration_count === 0
                                    ? 'Initial State'
                                    : 'Step ' + checkpoint.metadata.iteration_count
                                }}
                              </span>
                              <span
                                class="text-[10px] font-mono text-muted-foreground/70"
                                [title]="checkpoint.checkpoint_id"
                              >
                                {{ checkpoint.checkpoint_id.slice(0, 8) }}
                              </span>
                              @if (index === 0) {
                                <app-badge variant="secondary" class="text-[10px] h-4 px-1">
                                  Latest
                                </app-badge>
                              }
                              @if (checkpoint.metadata.has_pending_hil) {
                                <app-badge variant="secondary" class="text-[10px] h-4 px-1.5">
                                  {{ checkpoint.metadata.pending_hil_count }} HIL
                                </app-badge>
                              }
                            </div>
                            <div class="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span>{{ checkpoint.timestamp | date: 'HH:mm:ss' }}</span>
                              @if (checkpoint.metadata.size_bytes) {
                                <span>•</span>
                                <span>{{ formatSize(checkpoint.metadata.size_bytes) }}</span>
                              }
                            </div>
                          </div>
                        </div>
                      </button>

                      @if (index < checkpoints().length - 1) {
                        <div
                          class="absolute left-[18px] top-[30px] w-px h-[calc(100%+8px)] bg-border"
                        ></div>
                      }
                    </div>
                  }
                }
              </div>
            </app-scroll-area>
          </div>

          <div class="flex-1 flex flex-col overflow-hidden">
            @if (!fullCheckpoint() && !loading()) {
              <div class="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                Select a checkpoint to view details
              </div>
            } @else {
              <app-scroll-area class="flex-1">
                <div class="p-6 space-y-6 relative">
                  @if (loading()) {
                    <div
                      class="absolute inset-0 bg-background/50 flex items-center justify-center z-10"
                    >
                      <ng-icon
                        name="lucLoader2"
                        class="h-6 w-6 animate-spin text-muted-foreground"
                      />
                    </div>
                  }

                  <div class="flex items-start justify-between pb-4 border-b">
                    <div>
                      <div class="flex items-center gap-2 mb-1">
                        <ng-icon name="lucClock" class="h-4 w-4 text-muted-foreground" />
                        <span class="font-medium">
                          {{
                            selectedCheckpoint()?.metadata?.iteration_count === 0
                              ? 'Initial State'
                              : 'Step ' + selectedCheckpoint()?.metadata?.iteration_count
                          }}
                        </span>
                        @if (selectedCheckpoint()?.metadata?.size_bytes) {
                          <span class="text-xs text-muted-foreground">
                            • {{ formatSize(selectedCheckpoint()?.metadata?.size_bytes) }}
                          </span>
                        }
                      </div>
                      <div class="text-sm text-muted-foreground">
                        {{ selectedCheckpoint()?.timestamp | date: 'yyyy/MM/dd HH:mm:ss' }}
                      </div>
                      @if (selectedCheckpoint()) {
                        <div class="text-xs font-mono text-muted-foreground/70 mt-1">
                          ID: {{ selectedCheckpoint()?.checkpoint_id }}
                        </div>
                      }
                    </div>
                    @if (selectedCheckpoint()?.metadata?.has_pending_hil) {
                      <app-badge variant="secondary">
                        {{ selectedCheckpoint()?.metadata?.pending_hil_count }} HIL Pending
                      </app-badge>
                    }
                  </div>

                  @if (executorIds().length > 0) {
                    <div>
                      <div class="text-sm font-medium mb-3 flex items-center gap-2">
                        <ng-icon name="lucPackage" class="h-4 w-4" />
                        Active Executors ({{ executorIds().length }})
                      </div>
                      <div class="flex flex-wrap gap-2">
                        @for (execId of executorIds(); track execId) {
                          <app-badge variant="outline" class="font-mono text-xs">
                            {{ execId }}
                          </app-badge>
                        }
                      </div>
                    </div>
                  }

                  @if (messageExecutors().length > 0) {
                    <div>
                      <div class="text-sm font-medium mb-3 flex items-center gap-2">
                        <ng-icon name="lucMessageSquare" class="h-4 w-4" />
                        Messages
                      </div>
                      <div class="grid grid-cols-2 gap-3">
                        @for (execId of messageExecutors(); track execId) {
                          <div class="bg-muted/50 p-3 rounded-lg">
                            <div class="text-xs font-mono text-muted-foreground mb-1">
                              {{ execId }}
                            </div>
                            <div class="font-medium">
                              {{ getMessageCount(execId) }} message{{
                                getMessageCount(execId) !== 1 ? 's' : ''
                              }}
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (pendingHilEvents().length > 0) {
                    <div>
                      <div class="text-sm font-medium mb-3 flex items-center gap-2">
                        <ng-icon name="lucAlertCircle" class="h-4 w-4" />
                        Pending HIL Requests ({{ pendingHilEvents().length }})
                      </div>
                      <div class="space-y-2">
                        @for (item of pendingHilEvents(); track item.key) {
                          <div class="bg-muted/50 border border-border p-3 rounded-lg">
                            <div class="flex items-center justify-between mb-2">
                              <code class="text-xs bg-background px-2 py-1 rounded">
                                {{ item.key.slice(0, 24) }}...
                              </code>
                              <app-badge variant="outline" class="text-xs">
                                {{ item.value.source_executor_id }}
                              </app-badge>
                            </div>
                            <div class="text-xs space-y-1">
                              <div>
                                <span class="text-muted-foreground">Request:</span>
                                <code class="bg-background px-1 py-0.5 rounded ml-1">
                                  {{
                                    item.value.request_type?.split('.')?.pop() ||
                                      item.value.request_type
                                  }}
                                </code>
                              </div>
                              <div>
                                <span class="text-muted-foreground">Response:</span>
                                <code class="bg-background px-1 py-0.5 rounded ml-1">
                                  {{
                                    item.value.response_type?.split('.')?.pop() ||
                                      item.value.response_type
                                  }}
                                </code>
                              </div>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  <div>
                    <div class="text-sm font-medium mb-3">Workflow State</div>
                    @if (stateKeys().length > 0) {
                      <div class="flex flex-wrap gap-2">
                        @for (key of stateKeys(); track key) {
                          <app-badge variant="secondary" class="font-mono text-xs">
                            {{ key }}
                          </app-badge>
                        }
                      </div>
                    } @else {
                      <div class="text-sm text-muted-foreground">No custom state</div>
                    }
                  </div>

                  <div class="border-t pt-6">
                    <button
                      (click)="jsonExpanded.set(!jsonExpanded())"
                      class="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
                    >
                      <ng-icon
                        [name]="jsonExpanded() ? 'lucChevronDown' : 'lucChevronRight'"
                        class="h-4 w-4"
                      />
                      Raw JSON
                    </button>
                    @if (jsonExpanded()) {
                      <pre
                        class="mt-3 text-[10px] font-mono bg-muted p-4 rounded overflow-x-auto"
                        >{{ fullCheckpoint() | json }}</pre
                      >
                    }
                  </div>
                </div>
              </app-scroll-area>
            }
          </div>
        </div>
      </app-dialog-content>
    </app-dialog>
  `,
})
export class CheckpointInfoModal {
  // Inputs
  session = input<WorkflowSession | null>(null)
  checkpoints = input<CheckpointItem[]>([])
  open = input<boolean>(false)

  // Outputs
  onOpenChange = output<boolean>()

  // Internal Signals
  selectedCheckpointId = signal<string | null>(null)
  fullCheckpoint = signal<FullCheckpoint | null>(null)
  loading = signal(false)
  jsonExpanded = signal(true)

  // Computed
  selectedCheckpoint = computed(() =>
    this.checkpoints().find((cp) => cp.checkpoint_id === this.selectedCheckpointId()),
  )

  executorIds = computed(() => {
    const state = this.fullCheckpoint()?.state
    return state?.['_executor_state'] ? Object.keys(state['_executor_state']) : []
  })

  messageExecutors = computed(() => {
    const messages = this.fullCheckpoint()?.messages
    return messages ? Object.keys(messages) : []
  })

  stateKeys = computed(() => {
    const state = this.fullCheckpoint()?.state
    if (!state) return []
    return Object.keys(state).filter((k) => k !== '_executor_state')
  })

  pendingHilEvents = computed(() => {
    const events = this.fullCheckpoint()?.pending_request_info_events
    if (!events) return []
    return Object.entries(events).map(([key, value]) => ({
      key,
      value: value as PendingRequestInfoEvent,
    }))
  })

  private apiClient = inject(ApiClient)
  constructor() {
    effect(() => {
      const isOpen = this.open()
      const list = this.checkpoints()
      if (isOpen && list.length > 0) {
        const currentId = this.selectedCheckpointId()
        const isValid = list.some((cp) => cp.checkpoint_id === currentId)
        if (!isValid) {
          this.selectedCheckpointId.set(list[0].checkpoint_id)
        }
      }
    })

    effect(
      async () => {
        const id = this.selectedCheckpointId()
        const sess = this.session()
        if (!id || !sess) return

        this.loading.set(true)
        try {
          const item = await this.apiClient.getConversationItem(
            sess.conversation_id,
            `checkpoint_${id}`,
          )
          this.fullCheckpoint.set((item as CheckpointItem).metadata?.full_checkpoint ?? null)
        } catch (error) {
          console.error('Failed to load checkpoint:', error)
          this.fullCheckpoint.set(null)
        } finally {
          this.loading.set(false)
        }
      },
      { allowSignalWrites: true },
    )
  }

  // Utils
  getMessageCount(execId: string): number {
    const messages = this.fullCheckpoint()?.messages
    return (messages?.[execId] as unknown[])?.length ?? 0
  }

  formatSize(bytes?: number): string {
    if (!bytes) return ''
    const kb = bytes / 1024
    if (kb < 1) return `${bytes} B`
    if (kb < 1024) return `${kb.toFixed(1)} KB`
    return `${(kb / 1024).toFixed(1)} MB`
  }

  cn = cn
}
