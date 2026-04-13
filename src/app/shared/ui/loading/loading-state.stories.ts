import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { LoadingStateComponent } from './loading-state.component'
import { provideIcons } from '@ng-icons/core'
import { lucideLoader2 } from '@ng-icons/lucide'

const meta: Meta<LoadingStateComponent> = {
  title: 'Components/LoadingState',
  component: LoadingStateComponent,
  decorators: [
    moduleMetadata({
      imports: [LoadingStateComponent],
      providers: [provideIcons({ lucideLoader2 })],
    }),
  ],
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
  },
}

export default meta

type Story = StoryObj<LoadingStateComponent>

/**
 * Approach: Simply wrap the component in a `div` using the `render` function.
 */
export const Default: Story = {
  render: (args) => ({
    props: args,
    template: `
            <div style="border: 2px dashed #999; padding: 3rem; background: #fafafa; display: flex; justify-content: center;">
                <app-loading-state [message]="message" [description]="description" [size]="size" [fullPage]="false" />
            </div>
    `,
  }),
  args: {
    message: 'Loading partial content...',
    description: 'This is a demonstration within a partial container.',
    size: 'md',
  },
}

/**
 * Full-page Mode: Using the `fullPage` attribute.
 */
export const FullPage: Story = {
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    message: 'Initializing full-page interface...',
    description: 'The component should now fill the entire Storybook preview area.',
    fullPage: true,
    size: 'lg',
  },
}

/**
 * Complex Example: With projected content (actions).
 */
export const WithActions: Story = {
  render: (args) => ({
    props: args,
    template: `
            <app-loading-state [message]="message" [size]="size">
                <button style="margin-top: 1rem;padding: 0.5rem 1rem;background: #ef4444;color: white;border: none;border-radius: 0.375rem;cursor: pointer;">
                    Stop Operation
                </button>
            </app-loading-state>
            `,
  }),
  args: {
    message: 'Executing a high-risk operation...',
    size: 'md',
  },
}
