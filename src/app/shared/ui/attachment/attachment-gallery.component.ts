import { Component, input, output } from '@angular/core'
import { AttachmentItem } from '../types'
import { AttachmentPreviewComponent } from './attachment-preview.component'

@Component({
  selector: 'app-attachment-gallery',
  standalone: true,
  imports: [AttachmentPreviewComponent],
  template: `
    @if (attachments().length > 0) {
      <div class="flex flex-wrap gap-2 p-2 bg-muted rounded-lg" [class]="className()">
        @for (item of attachments(); track item.id) {
          <app-attachment-preview [attachment]="item" (remove)="removeAttachment.emit(item.id)">
          </app-attachment-preview>
        }
      </div>
    }
  `,
})
export class AttachmentGalleryComponent {
  attachments = input<AttachmentItem[]>([])
  className = input<string>('')
  removeAttachment = output<string>()
}
