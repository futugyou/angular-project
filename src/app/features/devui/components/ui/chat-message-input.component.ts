import {
  Component,
  ElementRef,
  input,
  output,
  viewChild,
  signal,
  computed,
  effect,
} from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgIconComponent } from '@ng-icons/core'
import {
  ResponseInputContent,
  ResponseInputTextParam,
  ResponseInputImageParam,
  ResponseInputFileParam,
} from '../../../devui/types'

import { AttachmentGalleryComponent, AttachmentItem } from '@shared/ui/attachment'
import { ButtonDirective } from '../../../../shared/directives/button.directive'
import { FileUploadComponent } from '@shared/ui/fileupload'
import { TextareaComponent } from '@shared/ui/textarea'
import { LoadingSpinnerComponent } from '@shared/ui/loading'

@Component({
  selector: 'app-chat-message-input',
  standalone: true,
  imports: [
    FormsModule,
    NgIconComponent,
    AttachmentGalleryComponent,
    FileUploadComponent,
    TextareaComponent,
    LoadingSpinnerComponent,
    ButtonDirective,
  ],
  template: `
    <div
      class="relative {{ className() }}"
      (dragover)="handleDragOver($event)"
      (dragleave)="handleDragLeave($event)"
      (drop)="handleDrop($event)"
    >
      @if (isDragOver()) {
        <div
          class="absolute inset-2 border-2 border-dashed border-blue-400 dark:border-blue-500 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ease-in-out z-10"
        >
          <div class="text-center">
            <div class="text-blue-600 dark:text-blue-400 text-sm font-medium mb-1">
              Drop files here
            </div>
            <div class="text-blue-500 dark:text-blue-500 text-xs">
              Images, PDFs, and other files
            </div>
          </div>
        </div>
      }

      @if (attachments().length > 0) {
        <div class="mb-3">
          <app-attachment-gallery
            [attachments]="attachments()"
            (removeAttachment)="handleRemoveAttachment($event)"
          />
        </div>
      }

      @if (pasteNotification()) {
        <div
          class="absolute bottom-24 left-1/2 -translate-x-1/2 z-20
               bg-blue-500 text-white px-4 py-2 rounded-full text-sm
               animate-in slide-in-from-bottom-2 fade-in duration-200
               flex items-center gap-2 shadow-lg"
        >
          <ng-icon
            [name]="
              pasteNotification()?.includes('screenshot') ? 'lucidePaperclip' : 'lucideFileText'
            "
            class="h-3 w-3"
          ></ng-icon>
          {{ pasteNotification() }}
        </div>
      }

      <form (submit)="handleSubmit($event)" class="flex gap-2 items-end">
        <app-textarea
          #textarea
          class="flex-1 min-h-10 max-h-50 resize-none flex rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          [placeholder]="
            placeholder() || 'Message ' + entityName() + '... (Shift+Enter for new line)'
          "
          [disabled]="disabled() || isSubmitting() || isStreaming()"
          [(ngModel)]="inputValue"
          name="chat-input"
          (paste)="handlePaste($event)"
          (keydown)="handleKeyDown($event)"
          [style.field-sizing]="'content'"
        ></app-textarea>

        @if (showFileUpload()) {
          <app-file-upload
            (onFilesSelected)="(handleFilesSelected)"
            [disabled]="disabled() || isSubmitting() || isStreaming()"
          />
        }
        @if (isStreaming() && canCancel()) {
          <button
            [appButton]
            type="button"
            size="icon"
            (click)="onCancel.emit()"
            [disabled]="isCancelling()"
            class="shrink-0 h-10 transition-all"
            title="Stop generating"
          >
            @if (isCancelling()) {
              <app-loading-spinner size="sm" />
            } @else {
              <ng-icon name="lucideSquare" class="h-4 w-4 fill-current"></ng-icon>
            }
          </button>
        } @else {
          <button
            [appButton]
            type="submit"
            size="icon"
            [disabled]="!canSendMessage()"
            class="shrink-0 h-10 transition-all"
            title="Send message"
          >
            @if (isSubmitting()) {
              <app-loading-spinner size="sm" />
            } @else {
              <ng-icon name="lucideSendHorizontal" class="h-4 w-4"></ng-icon>
            }
          </button>
        }
      </form>
    </div>
  `,
})
export class ChatMessageInputComponent {
  // --- Inputs ---
  isSubmitting = input<boolean>(false)
  isStreaming = input<boolean>(false)
  isCancelling = input<boolean>(false)
  placeholder = input<string>('')
  showFileUpload = input<boolean>(true)
  maxAttachments = input<number>(10)
  className = input<string>('')
  disabled = input<boolean>(false)
  entityName = input<string>('assistant')
  externalFiles = input<File[] | undefined>(undefined)
  canCancel = input<boolean>(false)

  // --- Outputs ---
  onSubmit = output<ResponseInputContent[]>()
  onCancel = output<void>()
  onExternalFilesProcessed = output<void>()

  // --- Signals & Refs ---
  textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea')
  inputValue = signal<string>('')
  attachments = signal<AttachmentItem[]>([])
  isDragOver = signal<boolean>(false)
  pasteNotification = signal<string | null>(null)

  private readonly TEXT_THRESHOLD = 10000

  constructor() {
    // Process external files when they change
    effect(() => {
      const files = this.externalFiles()
      if (files && files.length > 0) {
        this.handleFilesSelected(files)
        this.onExternalFilesProcessed.emit()
      }
    })
  }

  // --- Computed ---
  canSendMessage = computed(() => {
    const hasText = this.inputValue().trim().length > 0
    const hasFiles = this.attachments().length > 0
    return !this.disabled() && !this.isSubmitting() && !this.isStreaming() && (hasText || hasFiles)
  })

  // --- File Logic ---
  private getFileType(file: File): AttachmentItem['type'] {
    if (file.type.startsWith('image/')) return 'image'
    if (file.type === 'application/pdf') return 'pdf'
    if (file.type.startsWith('audio/')) return 'audio'
    return 'other'
  }

  private readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  private detectFileExtension(text: string): string {
    const trimmed = text.trim()
    const lines = trimmed.split('\n')

    if (/^{[sS]*}$|^[[sS]*]$/.test(trimmed)) return '.json'
    if (/^<\?xml|^<html|^<!DOCTYPE/i.test(trimmed)) return '.html'
    if (/^```/.test(trimmed)) return '.md'
    if (/\t/.test(text) && lines.length > 1) return '.tsv'

    if (lines.length > 2) {
      const commaCount = lines.filter((l) => l.includes(',')).length
      if (commaCount > lines.length * 0.5) return '.csv'
    }
    return '.txt'
  }

  async handleFilesSelected(files: File[]) {
    if (this.attachments().length + files.length > this.maxAttachments()) {
      console.warn(`Cannot add more than ${this.maxAttachments()} attachments`)
      return
    }

    const newAttachments: AttachmentItem[] = []
    for (const file of files) {
      const attachment: AttachmentItem = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        type: this.getFileType(file),
      }

      if (attachment.type === 'image') {
        try {
          attachment.preview = await this.readFileAsDataURL(file)
        } catch (e) {
          console.error('Preview failed', e)
        }
      }
      newAttachments.push(attachment)
    }
    this.attachments.update((prev) => [...prev, ...newAttachments])
  }

  handleRemoveAttachment(id: string) {
    this.attachments.update((prev) => prev.filter((a) => a.id !== id))
  }

  // --- Drag & Drop ---
  handleDragOver(e: DragEvent) {
    e.preventDefault()
    this.isDragOver.set(true)
  }

  handleDragLeave(e: DragEvent) {
    e.preventDefault()
    this.isDragOver.set(false)
  }

  async handleDrop(e: DragEvent) {
    e.preventDefault()
    this.isDragOver.set(false)
    const files = Array.from(e.dataTransfer?.files || [])
    if (files.length > 0) {
      await this.handleFilesSelected(files)
    }
  }

  // --- Events ---
  async handlePaste(e: ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items || [])
    const filesToAttach: File[] = []
    let textHandled = false

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (blob) {
          filesToAttach.push(new File([blob], `screenshot-${Date.now()}.png`, { type: blob.type }))
        }
      } else if (item.type === 'text/plain' && !textHandled) {
        textHandled = true
        const text = e.clipboardData?.getData('text/plain') || ''
        const lineCount = (text.match(/\n/g) || []).length
        const shouldConvert =
          text.length > this.TEXT_THRESHOLD ||
          lineCount > 50 ||
          /^\s*[{[][\s\S]*[}\]]\s*$/.test(text) ||
          /^<\?xml|^<html|^<!DOCTYPE/i.test(text)

        if (shouldConvert) {
          e.preventDefault()
          const ext = this.detectFileExtension(text)
          const blob = new Blob([text], { type: 'text/plain' })
          filesToAttach.push(
            new File([blob], `pasted-text-${Date.now()}${ext}`, {
              type: 'text/plain',
            }),
          )
        }
      }
    }

    if (filesToAttach.length > 0) {
      await this.handleFilesSelected(filesToAttach)
      const msg =
        filesToAttach.length === 1
          ? filesToAttach[0].name.includes('screenshot')
            ? 'Screenshot added'
            : 'Large text converted to file'
          : `${filesToAttach.length} files added`
      this.pasteNotification.set(msg)
      setTimeout(() => this.pasteNotification.set(null), 3000)
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      this.handleSubmit(e)
    }
  }

  async handleSubmit(e: Event) {
    e.preventDefault()
    if (!this.canSendMessage()) return

    const messageText = this.inputValue().trim()
    const content: ResponseInputContent[] = []

    if (messageText) {
      content.push({
        text: messageText,
        type: 'input_text',
      } as ResponseInputTextParam)
    }

    const currentAttachments = this.attachments()
    for (const attachment of currentAttachments) {
      const dataUri = await this.readFileAsDataURL(attachment.file)

      if (attachment.type === 'image') {
        content.push({
          detail: 'auto',
          type: 'input_image',
          image_url: dataUri,
        } as ResponseInputImageParam)
      } else if (
        attachment.file.type === 'text/plain' &&
        /(\.txt|\.csv|\.json|\.html|\.md|\.tsv)$|^pasted-text-/.test(attachment.file.name)
      ) {
        const text = await attachment.file.text()
        content.push({
          text: text,
          type: 'input_text',
        } as ResponseInputTextParam)
      } else {
        content.push({
          type: 'input_file',
          file_data: dataUri.split(',')[1],
          file_url: dataUri,
          filename: attachment.file.name,
        } as ResponseInputFileParam)
      }
    }

    this.onSubmit.emit(content)
    this.inputValue.set('')
    this.attachments.set([])
  }
}
