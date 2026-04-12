import { type Meta, type StoryObj, applicationConfig } from '@storybook/angular'
import { importProvidersFrom, Component } from '@angular/core'
import { CdkMenuModule } from '@angular/cdk/menu'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { lucideUser, lucideCheck, lucideChevronRight, lucideLogOut } from '@ng-icons/lucide'

import * as Dropdown from './dropdown.component'

@Component({
  standalone: true,
  selector: 'dropdown-storybook-host',
  imports: [
    CdkMenuModule,
    NgIconComponent,
    Dropdown.DropdownMenuContent,
    Dropdown.DropdownMenuItem,
    Dropdown.DropdownMenuLabel,
    Dropdown.DropdownMenuSeparator,
    Dropdown.DropdownMenuCheckboxItem,
  ],
  template: `
    <div cdkMenu class="w-64 border rounded-md bg-white p-1 shadow-lg">
      <app-dropdown-menu-label>My Account</app-dropdown-menu-label>
      <button appDropdownMenuItem>
        <ng-icon name="lucideUser" class="mr-2" /> <span>Profile</span>
      </button>
      <app-dropdown-menu-separator />
      <button appDropdownMenuCheckboxItem [checked]="true">Show Status</button>
    </div>
  `,
})
class StoryHost {}

const meta: Meta<StoryHost> = {
  title: 'Components/Dropdown',
  component: StoryHost,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(CdkMenuModule),
        provideIcons({ lucideUser, lucideCheck, lucideChevronRight, lucideLogOut }),
      ],
    }),
  ],
}

export default meta

type Story = StoryObj<StoryHost>

/**
 * Test 1: Rendering StoryHost
 */
export const Default: Story = {
  render: (args) => ({
    props: args,
  }),
}

/**
 * Test 2: Atomized display
 */
export const DestructiveItem: StoryObj = {
  render: () => ({
    moduleMetadata: {
      imports: [Dropdown.DropdownMenuItem, CdkMenuModule, NgIconComponent],
    },
    template: ` 
<div cdkMenu class="p-4 bg-gray-50"> 
<button appDropdownMenuItem variant="destructive"> 
<ng-icon name="lucideLogOut" class="mr-2" /> 
Delete Account 
</button> 
</div> 
`,
    props: {},
  }),
}
