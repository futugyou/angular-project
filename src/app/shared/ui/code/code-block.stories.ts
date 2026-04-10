import {
  moduleMetadata,
  type Meta,
  type StoryObj,
  componentWrapperDecorator,
} from '@storybook/angular'
import { CodeBlockComponent } from './code-block.component'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { lucideCopy, lucideCheck } from '@ng-icons/lucide'

interface CodeBlockArgs {
  code: string
  language: string
}

const meta: Meta<CodeBlockComponent> = {
  title: 'Components/CodeBlock',
  component: CodeBlockComponent,
  decorators: [
    moduleMetadata({
      imports: [NgIconComponent],
      providers: [provideIcons({ lucideCopy, lucideCheck })],
    }),
  ],
}

export default meta

type Story = StoryObj<CodeBlockArgs>

export const Default: Story = {
  args: {
    code: "const version = '21.0.0';",
    language: 'typescript',
  },
}

export const LongCodeWrapping: Story = {
  args: {
    code: 'This is an extremely long string designed to test the white-space handling and ensuring that the layout remains intact even when the container width is restricted.',
    language: 'text',
  },
  decorators: [
    componentWrapperDecorator((story) => `<div style="max-width: 300px;">${story}</div>`),
  ],
}
