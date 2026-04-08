import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { AttachmentGalleryComponent } from '@shared/ui/attachment'
import { AttachmentItem } from '@shared/ui/types'
import { MOCK_ATTACHMENTS } from './mock-data'

@Component({
  selector: 'app-attachment-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, AttachmentGalleryComponent],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Attachment Preview Component Test</h1>

    <div class="mb-4">
      <p class="text-sm text-gray-500 mb-2">
        Current Attachment Count:
        <span class="font-mono font-bold">{{ attachments().length }}</span>
      </p>

      <app-attachment-gallery
        [attachments]="attachments()"
        className="border-2 border-dashed border-gray-300 min-h-25"
        (removeAttachment)="handleAttachmentRemove($event)"
      >
      </app-attachment-gallery>
    </div>

    <button
      (click)="resetAttachment()"
      class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
    >
      Reset Data
    </button>
  `,
})
export class AttachmentTestComponent {
  attachments = signal<AttachmentItem[]>([...MOCK_ATTACHMENTS])

  handleAttachmentRemove(id: string) {
    console.log('remove attachment ID:', id)
    this.attachments.update((items) => items.filter((item) => item.id !== id))
  }

  resetAttachment() {
    this.attachments.set([...MOCK_ATTACHMENTS])
  }
}
