import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular'
import { AttachmentGalleryComponent } from './attachment-gallery.component'
import { NgIconsModule } from '@ng-icons/core'
import { lucideFileText, lucideImage, lucideMusic, lucideTrash2 } from '@ng-icons/lucide'
import { importProvidersFrom } from '@angular/core'

const meta: Meta<AttachmentGalleryComponent> = {
  title: 'Components/AttachmentGallery',
  component: AttachmentGalleryComponent,
  tags: ['autodocs'],
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(
          NgIconsModule.withIcons({
            lucideImage,
            lucideFileText,
            lucideMusic,
            lucideTrash2,
          }),
        ),
      ],
    }),
    moduleMetadata({
      imports: [],
    }),
  ],
}

export default meta
type Story = StoryObj<AttachmentGalleryComponent>

export const Default: Story = {
  args: {
    attachments: [
      {
        id: '1',
        type: 'image',
        file: { name: 'vacation.jpg' } as File,
        preview: 'https://picsum.photos/200',
      },
      { id: '2', type: 'pdf', file: { name: 'resume.pdf' } as File },
      { id: '3', type: 'audio', file: { name: 'podcast.mp3' } as File },
      { id: '4', type: 'other', file: { name: 'data.zip' } as File },
    ],
  },
}

export const Empty: Story = {
  args: { attachments: [] },
}
