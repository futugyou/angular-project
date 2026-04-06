import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { Alert, AlertTitle, AlertDescription } from './alert.component'

const meta: Meta<Alert> = {
  title: 'Components/Alert',
  component: Alert,
  decorators: [
    moduleMetadata({
      imports: [Alert, AlertTitle, AlertDescription],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <app-alert [class]="class">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <app-alert-title>Alert Title</app-alert-title>
        <app-alert-description>
        This is an alert description, supporting multi-line text wrapping.
        </app-alert-description>
      </app-alert>
    `,
  }),
}

export default meta
type Story = StoryObj<Alert>

export const Default: Story = {
  args: {
    class: '',
  } as any,
}

export const Destructive: Story = {
  args: {
    class: 'border-red-500 text-red-500 bg-red-50',
  } as any,
}
