import { Component, EventEmitter, OnInit, output, inject, signal } from '@angular/core'
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

@Component({
  selector: 'app-testing-main',
  standalone: true,
  templateUrl: './testing.html',
  providers: [provideIcons({ lucideLogOut, lucideCheckCheck })],
  imports: [
    CdkMenuModule,
    // ButtonDirective,
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
    ButtonComponent,
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

  handleCopy() {
    console.log('copy')
  }
}
