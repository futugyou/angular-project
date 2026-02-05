import { Directive, Output, Input, EventEmitter, HostBinding, HostListener } from '@angular/core'
//
// <div
//   class="drop-zone"
//   appDragDrop
//   (filesDropped)="handleFiles($event)"
//   [appDragDropDisabled]="isLoading">
//   <p *ngIf="!isUploading">Drag and drop files here</p>
//   <p *ngIf="isUploading">Uploading...</p>
// </div>
@Directive({
  selector: '[appDragDrop]',
  standalone: true,
})
export class DragDropDirective {
  @Input() appDragDropDisabled = false

  @Output() filesDropped = new EventEmitter<File[]>()

  @HostBinding('class.drag-over') isDragOver = false

  private dragCounter = 0

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  @HostListener('dragenter', ['$event'])
  onDragEnter(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (this.appDragDropDisabled) return

    this.dragCounter++
    if (event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
      this.isDragOver = true
    }
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (this.appDragDropDisabled) return

    this.dragCounter--
    if (this.dragCounter === 0) {
      this.isDragOver = false
    }
  }

  @HostListener('drop', ['$event'])
  onDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    this.isDragOver = false
    this.dragCounter = 0

    if (this.appDragDropDisabled) return

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      const fileArray = Array.from(files)
      this.filesDropped.emit(fileArray)
    }
  }
}
