import { render, screen, fireEvent } from '@testing-library/angular'
import { AttachmentGalleryComponent } from './attachment-gallery.component'
import { NgIconsModule } from '@ng-icons/core'
import { lucideImage, lucideFileText, lucideMusic, lucideTrash2 } from '@ng-icons/lucide'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

const mockAttachments = [
  {
    id: '1',
    type: 'image' as const,
    file: { name: 'test.png' } as File,
    preview: 'img-url',
  },
  {
    id: '2',
    type: 'pdf' as const,
    file: { name: 'doc.pdf' } as File,
  },
]

describe('AttachmentGalleryComponent Integration', () => {
  const renderComponent = async (attachments = mockAttachments, removeSpy = vi.fn()) => {
    return await render(AttachmentGalleryComponent, {
      imports: [
        NgIconsModule.withIcons({
          lucideImage,
          lucideFileText,
          lucideMusic,
          lucideTrash2,
        }),
      ],
      componentInputs: {
        attachments,
        className: 'custom-class',
      },
      on: {
        removeAttachment: removeSpy,
      },
    })
  }

  it('should render all attachments and handle removal', async () => {
    const removeSpy = vi.fn()
    await renderComponent(mockAttachments, removeSpy)

    expect(screen.getByText('PDF')).toBeInTheDocument()

    const firstPreview = screen.getByTitle('test.png')

    const deleteOverlay = firstPreview.querySelector('.absolute.inset-0')
    if (deleteOverlay) {
      fireEvent.click(deleteOverlay)
      expect(removeSpy).toHaveBeenCalledWith('1')
    }
  })

  it('should not render anything when list is empty', async () => {
    const { container } = await render(AttachmentGalleryComponent, {
      imports: [NgIconsModule.withIcons({ lucideFileText })],
      componentInputs: { attachments: [] },
    })

    const galleryDiv = container.querySelector('.flex-wrap')
    expect(galleryDiv).not.toBeInTheDocument()
  })
})
