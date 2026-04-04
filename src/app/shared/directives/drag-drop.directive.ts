import { Directive, input, output, signal } from '@angular/core'
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
  exportAs: 'dragDrop',
  host: {
    '[class.drag-over]': 'isDragOver()',
    '(dragover)': 'onDragOver($event)',
    '(dragenter)': 'onDragEnter($event)',
    '(dragleave)': 'onDragLeave($event)',
    '(drop)': 'onDrop($event)',
  },
})
export class DragDropDirective {
  disabled = input(false, { alias: 'appDragDropDisabled' })
  filesDropped = output<File[]>()

  public isDragOver = signal(false)
  private dragCounter = 0

  protected onDragOver(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  protected onDragEnter(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (this.disabled()) return

    this.dragCounter++
    if (event.dataTransfer?.items && event.dataTransfer.items.length > 0) {
      this.isDragOver.set(true)
    }
  }

  protected onDragLeave(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    if (this.disabled()) return

    this.dragCounter--
    if (this.dragCounter === 0) {
      this.isDragOver.set(false)
    }
  }

  protected onDrop(event: DragEvent) {
    event.preventDefault()
    event.stopPropagation()

    this.isDragOver.set(false)
    this.dragCounter = 0

    if (this.disabled()) return

    const files = event.dataTransfer?.files
    if (files && files.length > 0) {
      this.filesDropped.emit(Array.from(files))
    }
  }
}
