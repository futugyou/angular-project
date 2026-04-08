import { render, screen, fireEvent } from '@testing-library/angular'
import { CheckboxComponent } from './checkbox.component'
import { provideIcons } from '@ng-icons/core'
import { lucideCheck, lucideMinus } from '@ng-icons/lucide'
import '@testing-library/jest-dom'
import { vi } from 'vitest'

describe('CheckboxComponent', () => {
  const providers = [provideIcons({ lucideCheck, lucideMinus })]

  it('should toggle checked state and call onChange when clicked', async () => {
    const onChange = vi.fn()
    const { fixture } = await render(CheckboxComponent, {
      providers,
      componentProperties: {
        onChange: onChange,
      },
    })

    const checkbox = screen.getByRole('checkbox')

    // Initial state
    expect(checkbox).toHaveAttribute('aria-checked', 'false')

    // First click
    fireEvent.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    expect(onChange).toHaveBeenCalledWith(true)

    // Second click
    fireEvent.click(checkbox)
    expect(checkbox).toHaveAttribute('aria-checked', 'false')
    expect(onChange).toHaveBeenCalledWith(false)
  })

  it('should become checked when clicked while in the indeterminate state', async () => {
    const { fixture } = await render(CheckboxComponent, {
      providers,
      componentInputs: {
        indeterminate: true,
      },
    })

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-checked', 'mixed')

    fireEvent.click(checkbox)

    expect(checkbox).toHaveAttribute('aria-checked', 'true')
    // Internal signal should be updated
    expect(fixture.componentInstance.indeterminate()).toBe(false)
  })

  it('should not respond to click events when disabled', async () => {
    const onChange = vi.fn()
    await render(CheckboxComponent, {
      providers,
      componentInputs: { disabled: true },
      componentProperties: { onChange },
    })

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-disabled', 'true')

    fireEvent.click(checkbox)
    expect(onChange).not.toHaveBeenCalled()
  })
})
