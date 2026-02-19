import {
  Component,
  inject,
  signal,
  computed,
  effect,
  input,
  output,
  viewChild,
  ElementRef,
} from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { DevUIStore } from '../../../stores'
import { ApiClient } from '../../../services/api.service'
import type { WorkflowSession } from '../../../types'

@Component({
  selector: 'app-workflow-session-manager',
  standalone: true,
  imports: [NgIconComponent],
  providers: [],
  template: `
    <div class="workflow-session-manager space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Conversations</h3>
        <button
          (click)="handleCreateSession()"
          [disabled]="creatingSession()"
          class="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Create new conversation"
        >
          @if (creatingSession()) {
            <ng-icon name="lucideLoader2" class="h-4 w-4 animate-spin" />
          } @else {
            <ng-icon name="lucidePlus" class="h-4 w-4" />
          }
          New Conversation
        </button>
      </div>

      @if (loadingSessions()) {
        <div class="flex items-center justify-center py-4">
          <ng-icon name="lucideLoader2" class="h-5 w-5 text-blue-500 animate-spin" />
          <span class="ml-2 text-sm text-gray-600">Loading sessions...</span>
        </div>
      } @else if (availableSessions().length === 0) {
        <div class="text-center py-6 text-sm text-gray-500 dark:text-gray-400">
          No conversations found.
        </div>
      } @else {
        <div class="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
          @for (session of availableSessions(); track session.conversation_id) {
            <div (click)="handleSelectSession(session)" [class]="getSessionClasses(session)">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <ng-icon name="lucideClock" class="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ session.metadata.name || 'Unnamed Conversation' }}
                  </span>
                </div>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {{ formatTimestamp(session.created_at) }}
                </div>
              </div>

              <button
                (click)="handleDeleteSession(session.conversation_id, $event)"
                [disabled]="deletingSessionId() === session.conversation_id"
                class="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                title="Delete conversation"
              >
                @if (deletingSessionId() === session.conversation_id) {
                  <ng-icon name="lucideLoader2" class="h-4 w-4 animate-spin text-red-500" />
                } @else {
                  <ng-icon name="lucideTrash2" class="h-4 w-4" />
                }
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .custom-scrollbar {
        scrollbar-width: thin;
      }
    `,
  ],
})
export class WorkflowSessionManager {
  // Inputs & Outputs using Signal API
  workflowId = input.required<string>()
  sessionChange = output<WorkflowSession | undefined>()

  // Store Injection (Assuming a similar store pattern to your React version)
  private store = inject(DevUIStore)
  private apiClient = inject(ApiClient)

  // Local UI State Signals
  creatingSession = signal(false)
  deletingSessionId = signal<string | null>(null)

  // Computed Selectors from Store
  currentSession = computed(() => this.store.currentSession)
  availableSessions = computed(() => this.store.availableSessions)
  loadingSessions = computed(() => this.store.loadingSessions)
  runtime = computed(() => this.store.runtime)

  constructor() {
    /**
     * Effect to reload sessions when workflowId changes
     * Similar to useEffect([workflowId], loadSessions)
     */
    effect(() => {
      const id = this.workflowId()
      if (id) {
        this.loadSessions(id)
      }
    })
  }

  async loadSessions(id: string) {
    this.store.setLoadingSessions(true)
    try {
      const response = await this.apiClient.listWorkflowSessions(id)

      if (response.data.length === 0) {
        const newSession = await this.apiClient.createWorkflowSession(id, {
          name: `Checkpoint Storage ${new Date().toLocaleString()}`,
        })
        this.store.setAvailableSessions([newSession])
        this.store.setCurrentSession(newSession)
        this.sessionChange.emit(newSession)
        this.store.addToast({
          message: 'Default checkpoint storage created',
          type: 'success',
        })
      } else {
        this.store.setAvailableSessions(response.data)

        // Auto-select first conversation if no current selection
        if (!this.currentSession()) {
          const firstSession = response.data[0]
          this.store.setCurrentSession(firstSession)
          this.sessionChange.emit(firstSession)
        }
      }
    } catch (error) {
      console.error('Failed to load workflow conversations:', error)
      if (this.runtime() !== 'dotnet') {
        this.store.addToast({
          message: 'Failed to load workflow conversations',
          type: 'error',
        })
      }
    } finally {
      this.store.setLoadingSessions(false)
    }
  }

  async handleCreateSession() {
    this.creatingSession.set(true)
    try {
      const newSession = await this.apiClient.createWorkflowSession(this.workflowId(), {
        name: `Checkpoint Storage ${new Date().toLocaleString()}`,
      })
      this.store.addSession(newSession)
      this.store.setCurrentSession(newSession)
      this.sessionChange.emit(newSession)
      this.store.addToast({
        message: 'New checkpoint storage created',
        type: 'success',
      })
    } catch (error) {
      console.error('Failed to create checkpoint storage:', error)
      this.store.addToast({
        message: 'Failed to create checkpoint storage',
        type: 'error',
      })
    } finally {
      this.creatingSession.set(false)
    }
  }

  handleSelectSession(session: WorkflowSession) {
    this.store.setCurrentSession(session)
    this.sessionChange.emit(session)
  }

  async handleDeleteSession(sessionId: string, event: MouseEvent) {
    event.stopPropagation()

    if (!confirm('Delete this conversation? All checkpoints will be lost.')) {
      return
    }

    this.deletingSessionId.set(sessionId)
    try {
      await this.apiClient.deleteWorkflowSession(this.workflowId(), sessionId)
      this.store.removeSession(sessionId)
      this.store.addToast({
        message: 'Conversation deleted',
        type: 'success',
      })
    } catch (error) {
      console.error('Failed to delete conversation:', error)
      this.store.addToast({
        message: 'Failed to delete conversation',
        type: 'error',
      })
    } finally {
      this.deletingSessionId.set(null)
    }
  }

  formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString()
  }

  getSessionClasses(session: WorkflowSession): string {
    const isActive = this.currentSession()?.conversation_id === session.conversation_id
    const baseClasses =
      'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all'
    const activeClasses = 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
    const inactiveClasses =
      'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'

    return `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`
  }
}
