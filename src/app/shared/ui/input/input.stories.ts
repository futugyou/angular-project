import type { Meta, StoryObj } from '@storybook/angular'
import { InputComponent } from './input.component'
import { moduleMetadata } from '@storybook/angular'
import { ReactiveFormsModule, FormControl } from '@angular/forms'

const meta: Meta<InputComponent> = {
  title: 'Components/Input',
  component: InputComponent,
}
export default meta

// 独立使用模式
export const Standalone: StoryObj<InputComponent> = {
  args: { value: 'Hello World', placeholder: 'Standalone' },
}

// CVA 模式展示
export const ReactiveForm: StoryObj<InputComponent> = {
  decorators: [moduleMetadata({ imports: [ReactiveFormsModule] })],
  render: () => ({
    props: { control: new FormControl('Initial Form Value') },
    template: `<app-input [formControl]="control" />`,
  }),
}
