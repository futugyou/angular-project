import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { vi, expect, it, describe } from 'vitest'
import { FileUploadComponent } from './file-upload.component'
import { provideIcons } from '@ng-icons/core'
import { lucideUpload } from '@ng-icons/lucide'
describe('FileUploadComponent', () => {
  const setup = async (inputs = {}) => {
    return await render(FileUploadComponent, {
      componentInputs: inputs,
      providers: [provideIcons({ lucideUpload })],
    })
  }

  it('should trigger the click event of the hidden input when the button is clicked', async () => {
    const { fixture } = await setup()

    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement
    const clickSpy = vi.spyOn(input, 'click')

    // Locate the button containing the icon and click it
    const button = screen.getByRole('button')
    await userEvent.click(button)

    expect(clickSpy).toHaveBeenCalled()
  })

  it('should correctly emit the onFilesSelected event after selecting a valid file', async () => {
    const onFilesSelectedSpy = vi.fn()
    const { fixture } = await render(FileUploadComponent, {
      providers: [provideIcons({ lucideUpload })],
      componentProperties: {
        onFilesSelected: { emit: onFilesSelectedSpy } as any,
      },
    })

    const file = new File(['content'], 'test-file.pdf', { type: 'application/pdf' })
    const input = fixture.nativeElement.querySelector('input[type="file"]')

    // Simulate file selection
    await userEvent.upload(input, file)

    expect(onFilesSelectedSpy).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'test-file.pdf' }),
    ])
  })
})
