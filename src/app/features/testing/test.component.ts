import { Component, EventEmitter, OnInit, output, inject, signal, effect } from '@angular/core'
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
}
