import { render, screen, fireEvent, waitFor } from '@testing-library/angular'
import { ToastComponent, ToastContainerComponent, ToastService } from './toast.component'
import { provideIcons } from '@ng-icons/core'
import { lucideX } from '@ng-icons/lucide'
import { vi, expect, describe, it } from 'vitest'
import '@testing-library/jest-dom'
import { TestBed } from '@angular/core/testing'
import { Component, inject } from '@angular/core'

describe('Toast Component & Service', () => {
  beforeEach(() => {
    // Critical Fix: Mock the browser's animation API
    Element.prototype.animate = vi.fn().mockReturnValue({
      finished: Promise.resolve(),
      cancel: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
    })
  })

  it('should render message and emit close event when close button is clicked', async () => {
    const closeSpy = vi.fn()

    await render(ToastComponent, {
      inputs: {
        message: 'Test Message',
        type: 'success',
      },
      on: {
        closeToast: closeSpy,
      },
      providers: [provideIcons({ lucideX })],
    })

    // Verify initial rendering
    expect(screen.getByText('Test Message')).toBeInTheDocument()

    // Simulate clicking the close button
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)

    // Verify that the close logic was triggered
    // Since we mocked the animation, the Promise resolves immediately
    await waitFor(() => {
      expect(closeSpy).toHaveBeenCalled()
    })

    // We can also verify that `animate` was called twice (once for "in", once for "out")
    expect(Element.prototype.animate).toHaveBeenCalledTimes(2)
  })

  it('should update the signal when service methods are called', () => {
    // Use TestBed to configure the Service environment directly, avoiding component rendering which would trigger Input.required checks
    TestBed.configureTestingModule({
      providers: [ToastService],
    })

    const service = TestBed.inject(ToastService)

    // Execute business logic
    service.success('Success Note')

    // Verify the Signal state
    const currentToasts = service.toasts()
    expect(currentToasts.length).toBe(1)
    expect(currentToasts[0].type).toBe('success')
    expect(currentToasts[0].message).toBe('Success Note')

    // Verify removal
    service.remove(currentToasts[0].id)
    expect(service.toasts().length).toBe(0)
  })
})

@Component({
  standalone: true,
  imports: [ToastContainerComponent],
  template: `<app-toast-container [toasts]="ts.toasts()" (onRemove)="ts.remove($event)" />`,
})
class TestHostComponent {
  ts = inject(ToastService)
}

describe('Toast System Integration', () => {
  beforeEach(() => {
    // We need to mock the animation; otherwise, the DOM element won't be removed until the animation completes.
    Element.prototype.animate = vi.fn().mockReturnValue({
      finished: Promise.resolve(),
    })
  })

  it('should show and then remove a toast after user interaction', async () => {
    const { fixture } = await render(TestHostComponent, {
      providers: [ToastService, provideIcons({ lucideX })],
    })
    const service = fixture.debugElement.injector.get(ToastService)

    // 1. Send a message
    service.success('New Message')
    fixture.detectChanges()
    expect(screen.getByText('New Message')).toBeInTheDocument()

    // 2. Click the close icon
    const closeBtn = screen.getByRole('button')
    fireEvent.click(closeBtn)

    // 3. Verify removal from the DOM
    // The `waitFor` function here is crucial, as it waits for the animation Promise to resolve and for Angular's change detection to run.
    await waitFor(() => {
      expect(screen.queryByText('New Message')).not.toBeInTheDocument()
    })
  })
})
