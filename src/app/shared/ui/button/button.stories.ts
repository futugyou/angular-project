import type { Meta, StoryObj } from '@storybook/angular'
import { ButtonComponent } from './button.component'

const meta: Meta<ButtonComponent> = {
  title: 'Components/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  render: (args) => ({
    props: args,
    template: `<button appButton [variant]="variant" [size]="size" [class]="userClass">Button Label</button>`,
  }),
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
}

export default meta
type Story = StoryObj<ButtonComponent>

export const Default: Story = {
  args: { variant: 'default', size: 'default' },
}

export const Destructive: Story = {
  args: { variant: 'destructive' },
}

export const Outline: Story = {
  args: { variant: 'outline' },
}

export const IconButton: Story = {
  args: { size: 'icon' },
  render: (args) => ({
    props: args,
    template: `
      <button appButton size="icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
      </button>`,
  }),
}
