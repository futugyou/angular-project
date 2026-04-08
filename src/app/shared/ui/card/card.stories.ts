import { Meta, StoryObj, moduleMetadata } from '@storybook/angular'
import { CARD_COMPONENTS } from './index'

const meta: Meta = {
  title: 'Components/Card',
  decorators: [
    moduleMetadata({
      imports: [...CARD_COMPONENTS],
    }),
  ],
  render: (args) => ({
    props: args,
    template: `
      <div ui-card [class]="className">
        <div ui-card-header>
          <div ui-card-title>Card Title</div>
          <div ui-card-description>This is a standard card description.</div>
          <div ui-card-action><button>Click</button></div>
        </div>
        <div ui-card-content>This is the main content area.</div>
        <div ui-card-footer>Footer information here.</div>
      </div>
    `,
  }),
}

export default meta
type Story = StoryObj

export const Default: Story = {
  args: {
    className: 'w-[400px]',
  },
}

export const CustomStyle: Story = {
  args: {
    className: 'w-[400px] border-primary bg-primary/5',
  },
}
