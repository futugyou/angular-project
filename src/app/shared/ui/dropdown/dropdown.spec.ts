import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { Component, signal, importProvidersFrom } from '@angular/core'
import { vi, expect, it, describe } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { provideIcons } from '@ng-icons/core'
import { lucideUser, lucideSettings, lucideCheck } from '@ng-icons/lucide'
import { NgIconsModule } from '@ng-icons/core'
import { CdkMenuModule } from '@angular/cdk/menu'

import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from './dropdown.component'

/**
 * Scenario 1: Basic menu test
 */
@Component({
  standalone: true,
  selector: 'test-basic-host',
  imports: [
    CdkMenuModule,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    NgIconsModule,
  ],
  template: `
    <div cdkMenu>
      <app-dropdown-menu-content>
        <app-dropdown-menu-label>Settings</app-dropdown-menu-label>
        <app-dropdown-menu-separator />
        <button appDropdownMenuItem (triggered)="onProfileClick()">Profile</button>
        <button appDropdownMenuItem variant="destructive">Delete</button>
      </app-dropdown-menu-content>
    </div>
  `,
})
class BasicMenuHost {
  onProfileClick = vi.fn()
}

/**
 * Scenario 2: Checkbox test
 */
@Component({
  standalone: true,
  selector: 'test-checkbox-host',
  imports: [CdkMenuModule, DropdownMenuCheckboxItem, NgIconsModule],
  template: `
    <div cdkMenu>
      <button appDropdownMenuCheckboxItem [checked]="checked()" (triggered)="toggle()">
        Status Bar
      </button>
    </div>
  `,
})
class CheckboxMenuHost {
  checked = signal(true)
  toggle() {
    this.checked.set(!this.checked())
  }
}

describe('Dropdown Components (Unit & Integration)', () => {
  const config = {
    providers: [
      provideIcons({ lucideUser, lucideSettings, lucideCheck }),
      importProvidersFrom(CdkMenuModule),
    ],
  }

  describe('Basic Interaction', () => {
    it('Label and content should be rendered correctly', async () => {
      await render(BasicMenuHost, config)
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
    })

    it('Clicking the MenuItem should trigger the triggered event', async () => {
      const { fixture } = await render(BasicMenuHost, config)
      const user = userEvent.setup()

      const profileItem = screen.getByText('Profile')
      // Trigger click
      await user.click(profileItem)

      expect(fixture.componentInstance.onProfileClick).toHaveBeenCalled()
    })

    it('The "destructive" variant should apply the correct data attribute', async () => {
      await render(BasicMenuHost, config)
      const deleteItem = screen.getByText('Delete')

      // Note: The attribute might be attached to the button element; querying by role is more accurate.
      expect(deleteItem).toHaveAttribute('data-variant', 'destructive')
      expect(deleteItem.className).toContain('text-destructive')
    })
  })

  describe('Checkbox Item', () => {
    it('Should render the Check icon when `checked` is true', async () => {
      const { fixture } = await render(CheckboxMenuHost, config)
      // Look for the icon element directly within the component's native element
      const icon = fixture.nativeElement.querySelector('ng-icon[name="lucideCheck"]')
      expect(icon).toBeInTheDocument()
    })

    it('Should trigger the state toggling logic when clicked', async () => {
      const { fixture } = await render(CheckboxMenuHost, config)
      const user = userEvent.setup()
      const checkbox = screen.getByText('Status Bar')

      await user.click(checkbox)

      expect(fixture.componentInstance.checked()).toBe(false)
      const icon = fixture.nativeElement.querySelector('ng-icon[name="lucideCheck"]')
      expect(icon).toBeNull()
    })
  })

  describe('Accessibility', () => {
    it('The Separator should be rendered in the DOM', async () => {
      const { fixture } = await render(BasicMenuHost, config)
      const separator = fixture.nativeElement.querySelector('[data-slot="dropdown-menu-separator"]')
      expect(separator).toBeInTheDocument()
    })
  })
})
