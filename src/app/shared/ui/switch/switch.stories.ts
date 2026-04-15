import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { provideIcons } from '@ng-icons/core'
import { lucideCheck, lucideX } from '@ng-icons/lucide'
import { SwitchComponent } from './switch.component'

const meta: Meta<SwitchComponent> = {
  title: 'Components/Switch',
  component: SwitchComponent,
  decorators: [
    moduleMetadata({
      providers: [provideIcons({ lucideCheck, lucideX })],
    }),
  ],
  argTypes: {
    checked: { control: 'boolean' },
    showIcons: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj

export const Default: Story = {
  args: {
    checked: false,
  },
}

export const WithIcons: Story = {
  args: {
    checked: true,
    showIcons: true,
  },
}

export const DisabledByAlias: Story = {
  render: (args) => ({
    props: args,
    template: `
      <app-switch 
        [disabled]="disabled" 
        [checked]="checked" 
        [showIcons]="showIcons" 
      />
    `,
  }),
  args: {
    disabled: true,
    checked: true,
    showIcons: true,
  },
}

export const CustomClass: Story = {
  args: {
    className: 'scale-150 border-blue-500',
    disabledInput: 'true',
  },
}
