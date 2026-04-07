import type { Meta, StoryObj } from '@storybook/angular'
import { BadgeComponent } from './badge.component'

const meta: Meta<BadgeComponent> = {
  title: 'Components/Badge',
  component: BadgeComponent,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      options: ['default', 'secondary', 'destructive', 'outline'],
      control: { type: 'select' },
    },
  },
  render: (args) => {
    const content = (args as any).content || 'Badge'
    return {
      props: args,
      template: `<app-badge [variant]="variant">${content}</app-badge>`,
    }
  },
}

export default meta
type Story = StoryObj<BadgeComponent>

export const Default: Story = {
  args: { variant: 'default', content: 'Default Badge' } as any,
}

export const Secondary: Story = {
  args: { variant: 'secondary', content: 'Secondary' } as any,
}

export const Destructive: Story = {
  args: { variant: 'destructive', content: 'Destructive' } as any,
}

export const Outline: Story = {
  args: { variant: 'outline', content: 'Outline' } as any,
}
