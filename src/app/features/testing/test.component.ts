import {
  Component,
  EventEmitter,
  OnInit,
  output,
  inject,
  signal,
  effect,
  computed,
  AfterViewInit,
  Injector,
  ElementRef,
  ViewChild,
} from '@angular/core'
import { CdkMenuModule } from '@angular/cdk/menu'
import { NgIconsModule, provideIcons } from '@ng-icons/core'
import { lucideLogOut, lucideCheckCheck } from '@ng-icons/lucide'
import { Alert, AlertTitle, AlertDescription } from '@shared/ui/alert.component'
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
} from '@shared/ui/dropdown.component'
import { AttachmentGalleryComponent } from '@shared/ui/attachment-gallery.component'
import { AttachmentItem } from '@shared/ui/types'
import { MOCK_ATTACHMENTS } from './mock-data'
import { BadgeComponent } from '@shared/ui/badge.component'
import { ButtonComponent } from '@shared/ui/button.component'
import { BadgeDirective } from '@shared/directives/badge.directive'
import { ButtonDirective } from '@shared/directives/button.directive'
import { SELECT_COMPONENTS } from '@shared/ui/select.component'
import { CARD_COMPONENTS } from '@shared/ui/card.component'
import { ChatMessageInputComponent } from '../devui/components/ui/chat-message-input.component'
import { JsonPipe } from '@angular/common'
import { CheckboxComponent } from '@shared/ui/checkbox.component'
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms'
import { CodeBlock } from '@shared/ui/code-block.component'
import { DIALOG_COMPONENTS } from '@shared/ui/dialog.component'
import { FileUploadComponent } from '@shared/ui/file-upload.component'
import { LoadingStateComponent } from '@shared/ui/loading-state.component'
import { LoadingSpinnerComponent } from '@shared/ui/loading-spinner.component'
import { MarkdownRendererComponent } from '@shared/ui/markdown-renderer.component'
import { ScrollAreaComponent } from '@shared/ui/scroll-area.component'
import { SwitchComponent } from '@shared/ui/switch.component'
import { TAB_COMPONENTS } from '@shared/ui/tab.component'
import { TooltipContent, TooltipDirective } from '@shared/ui/tooltip.component'
import { ToastContainer, ToastService } from '@shared/ui/toast.component'
import { register } from '@antv/x6-angular-shape'
import { Graph, Node } from '@antv/x6'
import {
  ExecutorNodeComponent,
  ExecutorState,
} from '../devui/components/features/workflow/executor-v6node.component'
import { ResponseInputContent } from '../devui/types/agent-framework'
import { selfLoopConnector } from '../devui/components/features/workflow/self-loop-connector'

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
    ScrollAreaComponent,
    SwitchComponent,
    ...TAB_COMPONENTS,
    TooltipDirective,
    TooltipContent,
    ToastContainer,
  ],
})
export class TestingComponent implements OnInit, AfterViewInit {
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

  constructor(private injector: Injector) {
    effect(() => {
      console.log('🚀 [Select Change]:', this.currentTech())
    })
  }

  // workflow node
  private graph: Graph | undefined
  private testNode?: Node

  @ViewChild('container') container: ElementRef | undefined
  ngAfterViewInit(): void {
    this.graph = new Graph({
      container: this.container!.nativeElement,
      width: 1000,
      height: 600,
      grid: true,
      mousewheel: true,
      background: {
        color: '#F2F7FA',
      },
    })

    Graph.registerConnector('self-loop-connector', selfLoopConnector, true)
    Graph.registerEdge('self-loop-edge', {
      inherit: 'edge',
      connector: { name: 'self-loop-connector' },
      attrs: {
        line: {
          stroke: '#b1b1b7',
          strokeWidth: 2,
          targetMarker: {
            name: 'block',
            width: 10,
            height: 8,
          },
        },
      },
    })

    register({
      shape: 'custom-angular-template-node',
      content: ExecutorNodeComponent,
      injector: this.injector,
      width: 256,
      height: 68,
    })

    this.testNode = this.graph.addNode({
      id: 'node-a',
      shape: 'custom-angular-template-node',
      x: 100,
      y: 100,
      data: {
        ngArguments: {
          value: {
            executorId: 'exec-88294-v5',
            executorType: 'llm-inference-node',
            name: 'GPT-4 Summary Generator',
            state: 'running',
            inputData: {
              text: 'The quick brown fox jumps over the lazy dog.',
              maxLength: 100,
              temperature: 0.7,
            },
            outputData: null,
            error: null,
            isSelected: true,
            isStartNode: false,
            isEndNode: false,
            layoutDirection: 'LR',
            isStreaming: true,
          },
        },
      },
    })

    const nodeB = this.graph.addNode({
      id: 'node-b',
      shape: 'custom-angular-template-node',
      x: 500,
      y: 100,
      data: {
        ngArguments: {
          value: {
            executorId: 'exec-002',
            executorType: 'llm-inference-node',
            name: 'LLM Node B',
            state: 'running',
            layoutDirection: 'TB',
          },
        },
      },
    })
    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-a',
      target: 'node-a',
    })

    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-b',
      target: 'node-b',
    })

    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-a',
      target: 'node-b',
    })

    this.graph.on('node:change:data', ({ node, current }) => {
      console.log('🌐 Graph Level Event:', node.id, current)
    })
  }

  updateWorkflowState(state: ExecutorState) {
    if (!this.testNode || !this.graph) return

    const currentData = this.testNode.getData()
    this.testNode.setData({
      ngArguments: {
        value: {
          ...currentData.ngArguments.value,
          state: state,
        },
      },
    })
  }

  toggleWorkflowOutput() {
    if (!this.testNode) return

    const currentData = this.testNode.getData()
    const isFailed = Math.random() > 0.5

    this.testNode.setData({
      ngArguments: {
        value: {
          ...currentData.ngArguments.value,
          state: isFailed ? 'failed' : 'completed',
          outputData: isFailed ? null : { result: 'Success!', tokens: 1024, model: 'gpt-4' },
          error: isFailed ? 'Error: Connection timeout to inference server at 10.0.4.1' : null,
        },
      },
    })
    this.testNode.resize(260, 220)
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

  // scroll area
  itemsScrollArea = Array.from({ length: 100 }, (_, i) => i + 1)

  // switch
  isSwitchChecked = signal(false)
  testSwitchForm = new FormGroup({
    notifications: new FormControl(true),
    privacy: new FormControl({ value: false, disabled: true }),
  })

  // tabs
  currentTab = 'account'

  // toast
  readonly toast = inject(ToastService)
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
