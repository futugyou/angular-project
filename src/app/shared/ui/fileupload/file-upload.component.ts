import { Component, input, output, viewChild, ElementRef, computed } from '@angular/core'
import { NgIconsModule } from '@ng-icons/core'
import { ButtonDirective } from '../../directives/button.directive'

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [ButtonDirective, NgIconsModule],
  template: `
    <div [class]="className()">
      <input
        #fileInput
        type="file"
        [accept]="accept()"
        [multiple]="multiple()"
        [disabled]="disabled()"
        (change)="handleFileInputChange($event)"
        class="hidden"
      />

      <button
        appButton="outline"
        type="button"
        size="icon"
        [disabled]="disabled()"
        (click)="handleButtonClick()"
        (drop)="handleDrop($event)"
        (dragover)="handleDragOver($event)"
        class="shrink-0 transition-colors hover:bg-muted"
        title="Upload files (images, PDFs, audio)"
      >
        <ng-icon name="lucideUpload" class="h-4 w-4"></ng-icon>
      </button>
    </div>
  `,
  styles: [
    `
      .hidden {
        display: none;
      }
    `,
  ],
})
export class FileUploadComponent {
  onFilesSelected = output<File[]>()
  accept = input<string>('image/*,.pdf,audio/*,.wav,.mp3,.m4a,.ogg')
  multiple = input<boolean>(true)
  maxSize = input<number>(50 * 1024 * 1024)
  disabled = input<boolean>(false)
  className = input<string>('')

  private fileInputRef = viewChild<ElementRef<HTMLInputElement>>('fileInput')

  tooltipText = computed(() => {
    const sizeStr = this.formatFileSize(this.maxSize())
    return `Upload files (Max: ${sizeStr})`
  })

  handleButtonClick() {
    this.fileInputRef()?.nativeElement.click()
  }

  handleFileInputChange(e: Event) {
    const target = e.target as HTMLInputElement
    this.handleFileSelect(target.files)
    target.value = ''
  }

  handleDrop(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!this.disabled()) {
      this.handleFileSelect(e.dataTransfer?.files ?? null)
    }
  }

  handleDragOver(e: DragEvent) {
    e.preventDefault()
    e.stopPropagation()
  }

  private handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return

    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      if (file.size > this.maxSize()) {
        errors.push(`${file.name} too large`)
        return
      }
      if (this.accept() && !this.isFileAccepted(file, this.accept())) {
        errors.push(`${file.name} invalid type`)
        return
      }
      validFiles.push(file)
    })

    if (validFiles.length > 0) {
      this.onFilesSelected.emit(validFiles)
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    const val = bytes / Math.pow(k, i)

    return `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 1,
      minimumFractionDigits: 0,
    }).format(val)} ${sizes[i]}`
  }

  private isFileAccepted(file: File, accept: string): boolean {
    const patterns = accept.split(',').map((p) => p.trim().toLowerCase())
    return patterns.some((pattern) => {
      if (pattern.startsWith('.')) return file.name.toLowerCase().endsWith(pattern)
      if (pattern.endsWith('/*')) return file.type.startsWith(pattern.replace('*', ''))
      return file.type === pattern
    })
  }
}
