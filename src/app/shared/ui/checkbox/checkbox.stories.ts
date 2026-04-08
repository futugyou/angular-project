import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular'
import { CheckboxComponent } from './checkbox.component'
import { NgIconsModule } from '@ng-icons/core'
import { lucideCheck, lucideMinus } from '@ng-icons/lucide'
import { importProvidersFrom } from '@angular/core'

const meta: Meta<CheckboxComponent> = {
  title: 'Components/Checkbox',
  component: CheckboxComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(
          NgIconsModule.withIcons({
            lucideMinus,
            lucideCheck,
          }),
        ),
      ],
    }),
    moduleMetadata({
      imports: [],
    }),
  ],
  argTypes: {
    checked: { control: 'boolean' },
    indeterminate: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<CheckboxComponent>

export const Default: Story = {
  args: {
    checked: false,
  },
}

export const Checked: Story = {
  args: {
    checked: true,
  },
}

export const Indeterminate: Story = {
  args: {
    indeterminate: true,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
    checked: true,
  },
}
