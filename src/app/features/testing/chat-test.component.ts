import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { ChatMessageInputComponent } from '../devui/components/ui/chat-message-input.component'
import { ResponseInputContent } from '../devui/types'

@Component({
  selector: 'app-chat-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, ChatMessageInputComponent],
  template: `
    <h1 class="text-2xl font-bold mb-4">Chat Input Test Bench</h1>

    <div class="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg flex flex-wrap gap-4">
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          [checked]="isCardSubmitting()"
          (change)="isCardSubmitting.set(!isCardSubmitting())"
        />
        Submitting
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          [checked]="isCardStreaming()"
          (change)="isCardStreaming.set(!isCardStreaming())"
        />
        Streaming
      </label>
      <label class="flex items-center gap-2">
        <input
          type="checkbox"
          [checked]="isCardCancelling()"
          (change)="isCardCancelling.set(!isCardCancelling())"
        />
        Cancelling
      </label>
      <button
        (click)="simulateCardExternalDrop()"
        class="px-3 py-1 bg-blue-600 text-white rounded text-sm"
      >
        Simulate External File Drop
      </button>
    </div>

    <div class="border rounded-lg p-4 min-h-50 bg-white dark:bg-black overflow-y-auto">
      <h3 class="text-sm font-semibold text-gray-500 mb-2">Output Log:</h3>
      @for (log of messageCardLogs(); track $index) {
        <div class="mb-4 p-2 border-b border-gray-100 dark:border-gray-900 last:border-0">
          <pre class="text-xs overflow-x-auto">{{ log | json }}</pre>
        </div>
      } @empty {
        <p class="text-gray-400 italic">No messages sent yet...</p>
      }
    </div>

    <div class="border-t pt-6">
      <app-chat-message-input
        [isSubmitting]="isCardSubmitting()"
        [isStreaming]="isCardStreaming()"
        [isCancelling]="isCardCancelling()"
        [placeholder]="'Message ' + (selectedCardAgent().name || selectedCardAgent().id) + '...'"
        [showFileUpload]="true"
        [entityName]="selectedCardAgent().name || selectedCardAgent().id"
        [disabled]="!selectedCardAgent() || isCardSubmitting()"
        [externalFiles]="droppedCardFiles()"
        [canCancel]="true"
        (onSubmit)="handleChatInputSubmit($event)"
        (onCancel)="handleCardCancel()"
        (onExternalFilesProcessed)="clearCardDroppedFiles()"
      />
    </div>
  `,
})
export class ChatTestComponent {
  // card
  isCardSubmitting = signal(false)
  isCardStreaming = signal(false)
  isCardCancelling = signal(false)
  selectedCardAgent = signal({ id: 'agent-123', name: 'Gemini-Assistant' })
  droppedCardFiles = signal<File[] | undefined>(undefined)
  messageCardLogs = signal<ResponseInputContent[][]>([])

  handleChatInputSubmit(content: ResponseInputContent[]) {
    console.log('Submitted Content:', content)
    this.messageCardLogs.update((prev) => [content, ...prev])
    this.isCardSubmitting.set(true)
    setTimeout(() => {
      this.isCardSubmitting.set(false)
      this.isCardStreaming.set(true)
      setTimeout(() => this.isCardStreaming.set(false), 5000)
    }, 1000)
  }

  handleCardCancel() {
    console.log('Cancel requested')
    this.isCardCancelling.set(true)
    setTimeout(() => {
      this.isCardCancelling.set(false)
      this.isCardStreaming.set(false)
    }, 800)
  }

  simulateCardExternalDrop() {
    const mockFile = new File(['hello world'], 'external-test.txt', { type: 'text/plain' })
    this.droppedCardFiles.set([mockFile])
  }

  clearCardDroppedFiles() {
    console.log('External files processed, clearing state.')
    this.droppedCardFiles.set(undefined)
  }
}
