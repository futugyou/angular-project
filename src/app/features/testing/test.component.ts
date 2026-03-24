import { Component, EventEmitter, OnInit, output, inject, signal } from '@angular/core'
import { CdkMenuModule } from '@angular/cdk/menu'
import { NgIconsModule, provideIcons } from '@ng-icons/core'
import { lucideLogOut } from '@ng-icons/lucide'
import { ButtonDirective } from '../../devui/directives/button.directive'
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
} from '../../devui/components/ui/dropdown.component'

@Component({
  selector: 'app-testing-main',
  standalone: true,
  templateUrl: './testing.html',
  providers: [provideIcons({ lucideLogOut })],
  imports: [
    CdkMenuModule,
    ButtonDirective,
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
}
