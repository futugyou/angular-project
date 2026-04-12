import { type Meta, type StoryObj, applicationConfig } from '@storybook/angular'
import { FileUploadComponent } from './file-upload.component'
import { provideIcons } from '@ng-icons/core'
import { lucideUpload } from '@ng-icons/lucide'

const meta: Meta<FileUploadComponent> = {
  title: 'Components/FileUpload',
  component: FileUploadComponent,
  decorators: [
    applicationConfig({
      providers: [provideIcons({ lucideUpload })],
    }),
  ],
  argTypes: {
    onFilesSelected: { action: 'onFilesSelected' },
  },
}

export default meta
type Story = StoryObj<FileUploadComponent>

export const Default: Story = {
  args: {
    accept: 'image/*,.pdf',
    multiple: true,
    disabled: false,
  },
}

export const Disabled: Story = {
  args: {
    disabled: true,
  },
}
