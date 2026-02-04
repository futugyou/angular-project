import { Component, Input, Output, EventEmitter } from '@angular/core'
import { CommonModule } from '@angular/common'
import { AttachmentItem } from './types'
import { AttachmentPreviewComponent } from './attachment-preview.component'

@Component({
  selector: 'app-attachment-gallery',
  standalone: true,
  imports: [CommonModule, AttachmentPreviewComponent],
  template: `
    <div
      *ngIf="attachments.length > 0"
      [class]="'flex flex-wrap gap-2 p-2 bg-muted rounded-lg ' + className"
    >
      <app-attachment-preview
        *ngFor="let item of attachments; trackBy: trackById"
        [attachment]="item"
        (remove)="removeAttachment.emit(item.id)"
      ></app-attachment-preview>
    </div>
  `,
})
export class AttachmentGalleryComponent {
  @Input() attachments: AttachmentItem[] = []
  @Input() className: string = ''
  @Output() removeAttachment = new EventEmitter<string>()

  trackById(index: number, item: AttachmentItem) {
    return item.id
  }
}
