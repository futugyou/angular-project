import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule, provideIcons } from '@ng-icons/core'

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
import { lucideCheckCheck, lucideLogOut } from '@ng-icons/lucide'

@Component({
  selector: 'app-dropdown-test',
  standalone: true,
  providers: [provideIcons({ lucideLogOut, lucideCheckCheck })],
  imports: [
    CommonModule,
    NgIconsModule,
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
  ],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Dropdown Component Test</h1>
    <button
      [appDropdownMenu]="mainMenu"
      class="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium bg-white hover:bg-gray-100"
    >
      Open settings
    </button>

    <ng-template #mainMenu>
      <app-dropdown-menu-content class="w-96">
        <app-dropdown-menu-label>My Account</app-dropdown-menu-label>

        <button appDropdownMenuItem (triggered)="onProfile()">
          <ng-icon name="lucideUser" class="mr-2" />
          <span>Personal information</span>
          <span appDropdownMenuShortcut>⇧⌘P</span>
        </button>

        <button appDropdownMenuItem>
          <ng-icon name="lucideSettings" class="mr-2" />
          <span>Settings</span>
          <span appDropdownMenuShortcut>⌘S</span>
        </button>

        <app-dropdown-menu-separator />

        <button
          appDropdownMenuCheckboxItem
          [checked]="showStatusBar"
          (triggered)="toggleStatusBar()"
        >
          Show status bar
        </button>

        <app-dropdown-menu-separator />

        <button [appDropdownMenuSubTrigger]="subThemeMenu">Theme Color</button>

        <ng-template #subThemeMenu>
          <app-dropdown-menu-sub-content>
            <app-dropdown-menu-radio-group>
              <button
                appDropdownMenuRadioItem
                [checked]="theme === 'light'"
                (triggered)="setTheme('light')"
              >
                bright mode
              </button>
              <button
                appDropdownMenuRadioItem
                [checked]="theme === 'dark'"
                (triggered)="setTheme('dark')"
              >
                dark mode
              </button>
            </app-dropdown-menu-radio-group>
          </app-dropdown-menu-sub-content>
        </ng-template>

        <app-dropdown-menu-separator />

        <button appDropdownMenuItem variant="destructive" (triggered)="onLogout()">
          <ng-icon name="lucideLogOut" class="mr-2" />
          <span>Log out</span>
          <span appDropdownMenuShortcut>⇧⌘Q</span>
        </button>
      </app-dropdown-menu-content>
    </ng-template>
  `,
})
export class DropdownTestComponent {
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
