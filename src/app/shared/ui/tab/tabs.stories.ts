import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import {
  TabsComponent,
  TabsListComponent,
  TabsTriggerComponent,
  TabsContentComponent,
} from './tab.component'

const meta: Meta = {
  title: 'Components/Tabs',
  decorators: [
    moduleMetadata({
      imports: [TabsComponent, TabsListComponent, TabsTriggerComponent, TabsContentComponent],
    }),
  ],

  render: (args) => ({
    props: args,
    template: `
      <app-tabs [value]="'tab1'">
        <app-tabs-list>
          <button tabsTrigger value="tab1">Overview</button>
          <button tabsTrigger value="tab2">Analytics</button>
        </app-tabs-list>
        <app-tabs-content value="tab1">Overview Content</app-tabs-content>
        <app-tabs-content value="tab2">Analytics Content</app-tabs-content>
      </app-tabs>
    `,
  }),
}

export default meta
export const Default: StoryObj = {}

export const Alignment: StoryObj = {
  argTypes: {
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
    },
  },
  args: {
    align: 'start',
  },
  render: (args) => ({
    props: args,
    template: `
      <app-tabs value="1">
        <app-tabs-list [align]="align">
          <button tabsTrigger value="1">Tab 1</button>
          <button tabsTrigger value="2">Tab 2</button>
        </app-tabs-list>
      </app-tabs>
    `,
  }),
}
