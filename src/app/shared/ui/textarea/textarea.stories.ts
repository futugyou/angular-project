import type { Meta, StoryObj } from '@storybook/angular'
import { argsToTemplate } from '@storybook/angular'
import { TextareaComponent } from './textarea.component'

const meta: Meta<TextareaComponent> = {
  title: 'Components/Textarea',
  component: TextareaComponent,
  tags: ['autodocs'],
  argTypes: {
    rows: { control: 'number' },
    placeholder: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<TextareaComponent>

export const Default: Story = {
  args: {
    placeholder: 'Type something here...',
    rows: 3,
  },
}

export const Disabled: Story = {
  args: {
    placeholder: 'Disabled textarea',
    disabled: true,
  },
}

export const CustomStyle: Story = {
  args: {
    className: 'border-blue-500 ring-2 ring-blue-200',
    placeholder: 'Custom border color',
  },
}
