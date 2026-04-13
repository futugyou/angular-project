import { Meta, StoryObj, moduleMetadata } from '@storybook/angular'
import { CommonModule } from '@angular/common'
import { ScrollAreaComponent, ScrollBarComponent } from './scroll-area.component'

const meta: Meta<ScrollAreaComponent> = {
  title: 'Components/ScrollArea',
  component: ScrollAreaComponent,
  decorators: [
    moduleMetadata({
      imports: [CommonModule, ScrollAreaComponent, ScrollBarComponent],
    }),
  ],
  argTypes: {
    height: {
      control: 'text',
      description: 'Container height',
      defaultValue: '300px',
    },
  },
}

export default meta
type Story = StoryObj<ScrollAreaComponent>

// 1. Basic Usage: Long content triggers scrolling
export const Default: Story = {
  args: {
    height: '300px',
  },
  render: (args) => ({
    props: args,
    template: `
      <div style="background: #f4f4f5; padding: 2rem; border-radius: 8px;">
        <app-scroll-area [height]="height">
          <div style="padding: 1rem; background: white;">
            <h3 style="margin-top: 0;">Scrollable Content</h3>
            ${'<p>This is a long block of text used to test whether the scrollbar appears.</p>'.repeat(20)}
            <p style="color: red; font-weight: bold;">--- End of Content ---</p>
          </div>
        </app-scroll-area>
      </div>
    `,
  }),
}

// 2. Short Content: Scrollbar should not appear
export const ShortContent: Story = {
  args: {
    height: '300px',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-scroll-area [height]="height">
        <div style="padding: 1rem; background: #fffbeb;">
          <p>The content is very short; the scrollbar should remain hidden.</p>
        </div>
      </app-scroll-area>
    `,
  }),
}

// 3. Nested List
export const DataList: Story = {
  args: {
    height: '400px',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-scroll-area [height]="height" style="border: 1px solid #e4e4e7;">
        <div style="padding: 0 1rem;">
          ${Array.from({ length: 50 })
            .map(
              (_, i) => `
            <div style="padding: 1rem 0; border-bottom: 1px solid #f4f4f5; display: flex; align-items: center; gap: 12px;">
              <span style="width: 32px; height: 32px; background: #007bff; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px;">
                ${i + 1}
              </span>
              <div style="flex: 1;">
                <div style="height: 10px; width: 40%; background: #e4e4e7; border-radius: 4px; margin-bottom: 8px;"></div>
                <div style="height: 8px; width: 90%; background: #f4f4f5; border-radius: 4px;"></div>
              </div>
            </div>
          `,
            )
            .join('')}
        </div>
      </app-scroll-area>
    `,
  }),
}
