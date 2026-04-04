import { Component, computed, ElementRef, inject, input, signal } from '@angular/core'
import { JsonPipe } from '@angular/common'
import { NgIconComponent } from '@ng-icons/core'
import { MessageContent } from '../../../../types'
import { MarkdownRendererComponent } from '@shared/ui/markdown-renderer.component'

// --- Utility: Base64 to Blob URL Hook Logic in Angular ---
function useBase64ToBlobUrl(dataSignal: () => string | undefined, mimeType: string) {
  const blobUrl = signal<string | null>(null)

  const cleanup = () => {
    const current = blobUrl()
    if (current) URL.revokeObjectURL(current)
  }

  // Effect handles lifecycle and reactivity
  const effectRef = inject(ElementRef) // Just to ensure context if needed, but we use effect()

  return computed(() => {
    cleanup()
    const data = dataSignal()
    if (!data) return null

    try {
      let base64Data = data.startsWith('data:') ? data.split(',')[1] : data
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: mimeType })
      const url = URL.createObjectURL(blob)
      blobUrl.set(url)
      return url
    } catch (e) {
      console.error('Failed to convert base64:', e)
      return null
    }
  })
}

// --- Text Content Component ---
@Component({
  selector: 'text-content-renderer',
  standalone: true,
  imports: [MarkdownRendererComponent],
  template: `
    @if (isValidType()) {
      <div [class]="'wrap-break-word ' + className()">
        <app-markdown-renderer [content]="content().text" />
        @if (isStreaming() && content().text.length > 0) {
          <span class="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current"></span>
        }
      </div>
    }
  `,
})
export class TextContentRenderer {
  content = input.required<any>()
  className = input<string>('')
  isStreaming = input<boolean>(false)

  isValidType = computed(() => ['text', 'input_text', 'output_text'].includes(this.content().type))
}

// --- Image Content Component ---
@Component({
  selector: 'image-content-renderer',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    @if (isValidType()) {
      <div [class]="'my-2 ' + className()">
        @if (imageError()) {
          <div class="p-3 border rounded-lg bg-muted">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <ng-icon name="lucideFileText" class="h-4 w-4" />
              <span>Image could not be loaded</span>
            </div>
          </div>
        } @else {
          <img
            [src]="content().image_url"
            alt="Uploaded image"
            [class]="
              'rounded-lg border max-w-full transition-all cursor-pointer ' +
              (isExpanded() ? 'max-h-none' : 'max-h-64')
            "
            (click)="isExpanded.set(!isExpanded())"
            (error)="imageError.set(true)"
          />
          @if (isExpanded()) {
            <div class="text-xs text-muted-foreground mt-1">Click to collapse</div>
          }
        }
      </div>
    }
  `,
})
export class ImageContentRenderer {
  content = input.required<any>()
  className = input<string>('')

  imageError = signal(false)
  isExpanded = signal(false)

  isValidType = computed(() => ['input_image', 'output_image'].includes(this.content().type))
}

// --- File Content Component ---
@Component({
  selector: 'file-content-renderer',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    @if (isFileContent()) {
      <div [class]="'my-2 ' + className()">
        @if (isPdf() && fileUrl()) {
          <div class="flex items-center gap-2 mb-2 px-1">
            <ng-icon name="lucideFileText" class="h-4 w-4 text-red-500" />
            <span class="text-sm font-medium truncate flex-1">{{ filename() }}</span>
            <button
              (click)="isExpanded.set(!isExpanded())"
              class="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ng-icon
                [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
                class="h-3 w-3"
              />
              {{ isExpanded() ? 'Collapse' : 'Expand' }}
            </button>
          </div>

          @if (isExpanded()) {
            <div
              class="border rounded-lg p-6 bg-muted/50 flex flex-col items-center justify-center gap-4"
            >
              <ng-icon name="lucideFileText" class="h-16 w-16 text-red-400" />
              <div class="text-center">
                <p class="text-sm font-medium mb-1">{{ filename() }}</p>
                <p class="text-xs text-muted-foreground">PDF Document</p>
              </div>
              <div class="flex gap-3">
                <button
                  (click)="openPdf()"
                  class="text-sm bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 px-4 py-2 rounded-md transition-colors"
                >
                  Open in new tab
                </button>
                <a
                  [href]="effectivePdfUrl() || fileUrl()"
                  [download]="filename()"
                  class="text-sm text-foreground hover:bg-accent flex items-center gap-2 px-4 py-2 border rounded-md transition-colors"
                >
                  <ng-icon name="lucideDownload" class="h-4 w-4" /> Download
                </a>
              </div>
            </div>
          }
        } @else if (isAudio() && fileUrl()) {
          <div class="p-3 border rounded-lg">
            <div class="flex items-center gap-2 mb-2">
              <ng-icon name="lucideMusic" class="h-4 w-4 text-muted-foreground" />
              <span class="text-sm font-medium">{{ filename() }}</span>
            </div>
            <audio controls class="w-full">
              <source [src]="fileUrl()" />
              Your browser does not support audio playback.
            </audio>
          </div>
        } @else {
          <div class="p-3 border rounded-lg bg-muted">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <ng-icon name="lucideFileText" class="h-4 w-4 text-muted-foreground" />
                <span class="text-sm">{{ filename() }}</span>
              </div>
              @if (fileUrl()) {
                <a
                  [href]="fileUrl()"
                  [download]="filename()"
                  class="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <ng-icon name="lucideDownload" class="h-3 w-3" /> Download
                </a>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class FileContentRenderer {
  content = input.required<any>()
  className = input<string>('')
  isExpanded = signal(true)

  isFileContent = computed(
    () => this.content().type === 'input_file' || this.content().type === 'output_file',
  )
  fileUrl = computed(() =>
    this.isFileContent() ? this.content().file_url || this.content().file_data : undefined,
  )
  filename = computed(() => (this.isFileContent() ? this.content().filename || 'file' : undefined))

  isPdf = computed(
    () =>
      this.filename()?.toLowerCase().endsWith('.pdf') ||
      this.fileUrl()?.includes('application/pdf'),
  )
  isAudio = computed(() =>
    this.filename()
      ?.toLowerCase()
      .match(/\.(mp3|wav|m4a|ogg|flac|aac)$/),
  )

  pdfData = computed(() =>
    this.isFileContent() && this.isPdf()
      ? this.content().file_data || this.content().file_url
      : undefined,
  )
  effectivePdfUrl = useBase64ToBlobUrl(() => this.pdfData(), 'application/pdf')

  openPdf() {
    const url = this.effectivePdfUrl() || this.fileUrl()
    if (url) window.open(url, '_blank')
  }
}

// --- Data Content Component ---
@Component({
  selector: 'data-content-renderer',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    @if (content().type === 'output_data') {
      <div [class]="'my-2 p-3 border rounded-lg bg-muted ' + className()">
        <div class="flex items-center gap-2 cursor-pointer" (click)="isExpanded.set(!isExpanded())">
          <ng-icon name="lucideFileText" class="h-4 w-4 text-muted-foreground" />
          <span class="text-sm font-medium">{{ content().description || 'Data Output' }}</span>
          <span class="text-xs text-muted-foreground ml-auto">{{ content().mime_type }}</span>
          <ng-icon
            [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
            class="h-4 w-4 text-muted-foreground"
          />
        </div>
        @if (isExpanded()) {
          <pre
            class="mt-2 text-xs overflow-auto max-h-64 bg-background p-2 rounded border font-mono"
            >{{ displayData() }}</pre
          >
        }
      </div>
    }
  `,
})
export class DataContentRenderer {
  content = input.required<any>()
  className = input<string>('')
  isExpanded = signal(false)

  displayData = computed(() => {
    const data = this.content().data
    try {
      return JSON.stringify(JSON.parse(data), null, 2)
    } catch {
      return data
    }
  })
}

// --- Function Approval Request Component ---
@Component({
  selector: 'function-approval-renderer',
  standalone: true,
  imports: [NgIconComponent, JsonPipe],
  template: `
    @if (content().type === 'function_approval_request') {
      <div [class]="className()">
        <button
          (click)="isExpanded.set(!isExpanded())"
          class="flex items-center gap-2 px-2 py-1 text-xs rounded hover:bg-muted/50 transition-colors w-fit"
        >
          <ng-icon [name]="statusConfig().icon" [class]="'h-3 w-3 ' + statusConfig().class" />
          <span class="text-muted-foreground font-mono">{{ content().function_call.name }}</span>
          <span [class]="'text-xs ' + statusConfig().class">{{ statusConfig().label }}</span>
          <span class="text-xs text-muted-foreground">{{ isExpanded() ? '▼' : '▶' }}</span>
        </button>
        @if (isExpanded()) {
          <div
            class="ml-5 mt-1 text-xs font-mono text-muted-foreground border-l-2 border-muted pl-3"
          >
            <pre class="whitespace-pre-wrap break-all">{{ parsedArgs() | json }}</pre>
          </div>
        }
      </div>
    }
  `,
})
export class FunctionApprovalRenderer {
  content = input.required<any>()
  className = input<string>('')
  isExpanded = signal(false)

  statusConfig = computed(() => {
    const status = this.content().status
    if (status === 'approved')
      return { icon: 'lucideCheck', label: 'Approved', class: 'text-green-600 dark:text-green-400' }
    if (status === 'rejected')
      return { icon: 'lucideX', label: 'Rejected', class: 'text-red-600 dark:text-red-400' }
    return {
      icon: 'lucideClock',
      label: 'Awaiting approval',
      class: 'text-amber-600 dark:text-amber-400',
    }
  })

  parsedArgs = computed(() => {
    const args = this.content().function_call.arguments
    try {
      return typeof args === 'string' ? JSON.parse(args) : args
    } catch {
      return args
    }
  })
}

// --- Main OpenAI Content Renderer ---
@Component({
  selector: 'openai-content-renderer',
  standalone: true,
  imports: [
    TextContentRenderer,
    ImageContentRenderer,
    FileContentRenderer,
    DataContentRenderer,
    FunctionApprovalRenderer,
  ],
  template: `
    @switch (content().type) {
      @case ('text') {
        <text-content-renderer
          [content]="content()"
          [className]="className()"
          [isStreaming]="isStreaming()"
        />
      }
      @case ('input_text') {
        <text-content-renderer
          [content]="content()"
          [className]="className()"
          [isStreaming]="isStreaming()"
        />
      }
      @case ('output_text') {
        <text-content-renderer
          [content]="content()"
          [className]="className()"
          [isStreaming]="isStreaming()"
        />
      }
      @case ('input_image') {
        <image-content-renderer [content]="content()" [className]="className()" />
      }
      @case ('output_image') {
        <image-content-renderer [content]="content()" [className]="className()" />
      }
      @case ('input_file') {
        <file-content-renderer [content]="content()" [className]="className()" />
      }
      @case ('output_file') {
        <file-content-renderer [content]="content()" [className]="className()" />
      }
      @case ('output_data') {
        <data-content-renderer [content]="content()" [className]="className()" />
      }
      @case ('function_approval_request') {
        <function-approval-renderer [content]="content()" [className]="className()" />
      }
    }
  `,
})
export class OpenAIContentRendererComponent {
  content = input.required<MessageContent>()
  className = input<string>('')
  isStreaming = input<boolean>(false)
}

// --- Function Call Renderer (Standalone Utility Component) ---
@Component({
  selector: 'function-call-renderer',
  standalone: true,
  imports: [NgIconComponent, JsonPipe],
  template: `
    <div [class]="'my-2 p-3 border rounded bg-blue-50 dark:bg-blue-950/20 ' + className()">
      <div class="flex items-center gap-2 cursor-pointer" (click)="isExpanded.set(!isExpanded())">
        <ng-icon name="lucideCode" class="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <span class="text-sm font-medium text-blue-800 dark:text-blue-300"
          >Function Call: {{ name() }}</span
        >
        <ng-icon
          [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
          class="h-4 w-4 text-blue-600 dark:text-blue-400 ml-auto"
        />
      </div>
      @if (isExpanded()) {
        <div class="mt-2 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border">
          <div class="text-blue-600 dark:text-blue-400 mb-1">Arguments:</div>
          <pre class="whitespace-pre-wrap">{{ parsedArgs() | json }}</pre>
        </div>
      }
    </div>
  `,
})
export class FunctionCallRendererComponent {
  name = input.required<string>()
  arguments = input.required<string>()
  className = input<string>('')
  isExpanded = signal(false)

  parsedArgs = computed(() => {
    try {
      return typeof this.arguments() === 'string' ? JSON.parse(this.arguments()) : this.arguments()
    } catch {
      return this.arguments()
    }
  })
}

// --- Function Result Renderer (Standalone Utility Component) ---
@Component({
  selector: 'function-result-renderer',
  standalone: true,
  imports: [NgIconComponent, JsonPipe],
  template: `
    <div [class]="'my-2 p-3 border rounded bg-green-50 dark:bg-green-950/20 ' + className()">
      <div class="flex items-center gap-2 cursor-pointer" (click)="isExpanded.set(!isExpanded())">
        <ng-icon name="lucideCode" class="h-4 w-4 text-green-600 dark:text-green-400" />
        <span class="text-sm font-medium text-green-800 dark:text-green-300">Function Result</span>
        <ng-icon
          [name]="isExpanded() ? 'lucideChevronDown' : 'lucideChevronRight'"
          class="h-4 w-4 text-green-600 dark:text-green-400 ml-auto"
        />
      </div>
      @if (isExpanded()) {
        <div class="mt-2 text-xs font-mono bg-white dark:bg-gray-900 p-2 rounded border">
          <div class="text-green-600 dark:text-green-400 mb-1">Output:</div>
          <pre class="whitespace-pre-wrap">{{ parsedOutput() | json }}</pre>
          <div class="text-gray-500 text-[10px] mt-2">Call ID: {{ callId() }}</div>
        </div>
      }
    </div>
  `,
})
export class FunctionResultRendererComponent {
  output = input.required<string>()
  callId = input.required<string>()
  className = input<string>('')
  isExpanded = signal(false)

  parsedOutput = computed(() => {
    try {
      return typeof this.output() === 'string' ? JSON.parse(this.output()) : this.output()
    } catch {
      return this.output()
    }
  })
}
