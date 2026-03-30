import {
  Component,
  EventEmitter,
  OnInit,
  output,
  inject,
  signal,
  effect,
  computed,
} from '@angular/core'
import { CdkMenuModule } from '@angular/cdk/menu'
import { NgIconsModule, provideIcons } from '@ng-icons/core'
import { lucideLogOut, lucideCheckCheck } from '@ng-icons/lucide'
import { Alert, AlertTitle, AlertDescription } from '../../devui/components/ui/alert.component'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuSubTrigger,
} from '../../devui/components/ui/dropdown.component'
import { AttachmentGalleryComponent } from '../../devui/components/ui/attachment-gallery.component'
import { AttachmentItem } from '../../devui/components/ui/types'
import { MOCK_ATTACHMENTS } from './mock-data'
import { BadgeComponent } from '../../devui/components/ui/badge.component'
import { ButtonComponent } from '../../devui/components/ui/button.component'
import { BadgeDirective } from '../../devui/directives/badge.directive'
import { ButtonDirective } from '../../devui/directives/button.directive'
import { SELECT_COMPONENTS } from '../../devui/components/ui/select.component'
import { CARD_COMPONENTS } from '../../devui/components/ui/card.component'
import { ChatMessageInputComponent } from '../../devui/components/ui/chat-message-input.component'
import { ResponseInputContent } from '../../devui/types'
import { JsonPipe } from '@angular/common'
import { CheckboxComponent } from '../../devui/components/ui/checkbox.component'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { CodeBlock } from '../../devui/components/ui/code-block.component'
import { DIALOG_COMPONENTS } from '../../devui/components/ui/dialog.component'
import { FileUploadComponent } from '../../devui/components/ui/file-upload.component'
import { LoadingStateComponent } from '../../devui/components/ui/loading-state.component'
import { LoadingSpinnerComponent } from '../../devui/components/ui/loading-spinner.component'
import { MarkdownRendererComponent } from '../../devui/components/ui/markdown-renderer.component'

@Component({
  selector: 'app-testing-main',
  standalone: true,
  templateUrl: './testing.html',
  providers: [provideIcons({ lucideLogOut, lucideCheckCheck })],
  imports: [
    CdkMenuModule,
    NgIconsModule,
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuSubContent,
    DropdownMenuRadioGroup,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioItem,
    DropdownMenuSubTrigger,
    Alert,
    AlertTitle,
    AlertDescription,
    AttachmentGalleryComponent,
    BadgeComponent,
    BadgeDirective,
    // ButtonComponent,
    ButtonDirective,
    ...SELECT_COMPONENTS,
    ...CARD_COMPONENTS,
    ChatMessageInputComponent,
    JsonPipe,
    CheckboxComponent,
    ReactiveFormsModule,
    FormsModule,
    CodeBlock,
    ...DIALOG_COMPONENTS,
    FileUploadComponent,
    LoadingStateComponent,
    LoadingSpinnerComponent,
    MarkdownRendererComponent,
  ],
})
export class TestingComponent implements OnInit {
  ngOnInit(): void {}

  showStatusBar = true
  theme = 'light'

  toggleStatusBar() {
    this.showStatusBar = !this.showStatusBar
  }

  setTheme(val: string) {
    this.theme = val
  }

  onProfile() {
    console.log('Profile clicked')
  }
  onLogout() {
    console.log('Logout clicked')
  }

  attachments = signal<AttachmentItem[]>([...MOCK_ATTACHMENTS])

  handleAttachmentRemove(id: string) {
    console.log('remove attachment ID:', id)
    this.attachments.update((items) => items.filter((item) => item.id !== id))
  }

  resetAttachment() {
    this.attachments.set([...MOCK_ATTACHMENTS])
  }

  currentTech = signal<string>('Angular')

  constructor() {
    effect(() => {
      console.log('🚀 [Select Change]:', this.currentTech())
    })
  }

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

  // checkbox
  testCheckboxForm = new FormGroup({
    acceptTerms: new FormControl(false),
  })

  standaloneCheckboxChecked = signal(false)
  parentCheckboxChecked = signal(false)
  isCheckboxIndeterminate = signal(true)

  // code
  htmlSnippet = `
<div class="container">
  <h1>Title</h1>
  <p>This is a test scenario for automatic line wrapping of long text, ensuring that even if the code is very long, it will not break the layout, but will gracefully wrap within the container.</p>
</div>`.trim()

  // dialog
  showDialogModal = signal(false)
  fileList = signal<File[]>([])
  fileCount = computed(() => this.fileList().length)
  totalSizeText = computed(() => {
    const totalBytes = this.fileList().reduce((acc, file) => acc + file.size, 0)
    if (totalBytes === 0) return '0 B'
    const mb = totalBytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  })

  onUpload(newFiles: File[]) {
    this.fileList.update((current) => [...current, ...newFiles])
  }

  removeFile(fileToRemove: File) {
    this.fileList.update((current) => current.filter((f) => f !== fileToRemove))
  }

  // markdown
  rawMarkdownText = signal<string>(EXAMPLES.basic)

  loadMarkdownExample(type: 'basic' | 'technical') {
    this.rawMarkdownText.set(EXAMPLES[type])
  }
}

const EXAMPLES = {
  basic: `
## System Architecture Design

The backend of this project is built using **Go (Gin)**, while the frontend utilizes **Angular**.

### Core Code Snippets
\`\`\`typescript
@Component({
selector: 'app-root',
template: '<h1>{{ title() }}</h1>'
})
export class AppComponent {
title = signal('Hello Angular 18');
}
\`\`\`

### To-Do List
1. Optimize GORM association query logic
2. Implement agent orchestration based on **ADK**
3. Migrate \`AppData\` cache from drive C to drive D to save space

### Important Notes
* This project is incompatible with the legacy **ViewEngine**.
* All styling is built using **Tailwind CSS**.
`,
  technical: `
# Welcome to the Markdown Renderer

This is a custom renderer built upon **Angular Signals**.

## Basic Feature Showcase
* **Bold** and *Italic* text
* Hyperlinks: [Visit Google](https://google.com)
* Inline code: \`const version = '17.0';\`

> This is a blockquote, often used to emphasize a specific passage.
> It can span across multiple lines.

---

### Image Showcase

This is a standard inline image:
![Angular Logo](https://angular.dev/assets/images/press-kit/angular_wordmark_gradient.png)

Even when an image appears within paragraph text ![Small Icon](https://avatars.githubusercontent.com/u/17871902?v=4&size=64), it displays correctly.

---

### Simple Table
| Property | Description | Status |
| :--- | :--- | :--- |
| Signal | Reactive Core | Live |
| SSR | Server-Side Rendering | Supported |
| Control Flow | @if / @for | Migrated |
`,
}
