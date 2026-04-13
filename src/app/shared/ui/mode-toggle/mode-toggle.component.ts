import { Component, ChangeDetectionStrategy, inject } from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from '../dropdown'
import { ThemeService } from '../../services/theme.service'
import { ButtonDirective } from '../../directives/button.directive'

@Component({
  selector: 'app-mode-toggle',
  standalone: true,
  imports: [NgIconComponent, ButtonDirective, DropdownMenu, DropdownMenuContent, DropdownMenuItem],
  template: `
    <div [appDropdownMenu]="menu">
      <button [appButton] variant="ghost" size="sm" class="relative">
        <ng-icon
          name="lucideSun"
          class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
        />
        <ng-icon
          name="lucideMoon"
          class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
        />
        <span class="sr-only">Toggle theme</span>
      </button>
    </div>

    <ng-template #menu>
      <app-dropdown-menu-content class="min-w-32">
        <button appDropdownMenuItem (triggered)="setTheme('light')">Light</button>
        <button appDropdownMenuItem (triggered)="setTheme('dark')">Dark</button>
        <button appDropdownMenuItem (triggered)="setTheme('system')">System</button>
      </app-dropdown-menu-content>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModeToggleComponent {
  private themeService = inject(ThemeService)

  setTheme(theme: 'light' | 'dark' | 'system') {
    this.themeService.setTheme(theme)
  }
}
