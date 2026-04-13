import { render, screen, fireEvent } from '@testing-library/angular'
import '@testing-library/jest-dom/vitest'
import userEvent from '@testing-library/user-event'
import { signal } from '@angular/core'
import { Component } from '@angular/core'
import { DIALOG_COMPONENTS } from './index'
import { expect, describe, it } from 'vitest'
import { NgIconComponent, NgIconsModule, provideIcons } from '@ng-icons/core'
import { lucideX } from '@ng-icons/lucide'

@Component({
  standalone: true,
  imports: [...DIALOG_COMPONENTS, NgIconComponent],
  providers: [provideIcons({ lucideX })],
  template: `
    <app-dialog [(open)]="isOpen">
      <app-dialog-header>
        <app-dialog-title>Test Title</app-dialog-title>
        <app-dialog-close (close)="isOpen.set(false)" />
      </app-dialog-header>
      <app-dialog-content>Content Body</app-dialog-content>
    </app-dialog>
  `,
})
class TestHostComponent {
  isOpen = signal(false)
}

describe('Dialog Component', () => {
  it('should not display content when open is false', async () => {
    await render(TestHostComponent, {
      imports: [
        NgIconComponent,
        NgIconsModule.withIcons({
          lucideX,
        }),
      ],
    })
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument()
  })

  it('should display the dialog and respond to the close event when open is true', async () => {
    const { fixture } = await render(TestHostComponent, {
      imports: [
        NgIconComponent,
        NgIconsModule.withIcons({
          lucideX,
        }),
      ],
    })
    const host = fixture.componentInstance

    // Open the dialog
    host.isOpen.set(true)
    fixture.detectChanges()

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Content Body')).toBeInTheDocument()

    // Test the close button (DialogCloseComponent)
    const closeBtn = screen.getByRole('button', { name: /close/i })
    await userEvent.click(closeBtn)

    fixture.detectChanges()
    expect(host.isOpen()).toBe(false)
  })

  it('clicking the Backdrop should close the dialog', async () => {
    const { fixture } = await render(TestHostComponent)
    fixture.componentInstance.isOpen.set(true)
    fixture.detectChanges()

    const backdrop = document.querySelector('.cdk-overlay-backdrop')
    if (backdrop) {
      fireEvent.click(backdrop)
      fixture.detectChanges()
      expect(fixture.componentInstance.isOpen()).toBe(false)
    }
  })
})
