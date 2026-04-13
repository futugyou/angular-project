import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { SELECT_COMPONENTS } from './select.component'
import { NgIconsModule } from '@ng-icons/core'
import { lucideChevronDown, lucideChevronUp, lucideCheck } from '@ng-icons/lucide'

const meta: Meta = {
  title: 'Components/Select',
  decorators: [
    moduleMetadata({
      imports: [
        ...SELECT_COMPONENTS,
        NgIconsModule.withIcons({ lucideChevronDown, lucideChevronUp, lucideCheck }),
      ],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <app-select [className]="className" [disabled]="disabled">
        <app-select-trigger>
          <app-select-value placeholder="Select Framework" />
        </app-select-trigger>
        <app-select-content>
          <app-select-label>Frontend</app-select-label>
          <app-select-item value="angular">Angular</app-select-item>
          <app-select-item value="vue">Vue</app-select-item>
          <app-select-separator />
          <app-select-item value="react" [disabled]="true">React (Disabled)</app-select-item>
        </app-select-content>
      </app-select>
    `,
  }),
}

export default meta
type Story = StoryObj

export const Default: Story = {
  args: {
    disabled: false,
    className: 'w-[200px]',
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    className: 'w-[200px]',
  },
}
