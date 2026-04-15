import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { provideIcons } from '@ng-icons/core'
import { lucideCheck, lucideX } from '@ng-icons/lucide'
import { SwitchComponent } from './switch.component'
import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom'

describe('SwitchComponent', () => {
  const setup = async (props: Partial<SwitchComponent> = {}) => {
    return await render(SwitchComponent, {
      componentInputs: props,
      providers: [provideIcons({ lucideCheck, lucideX })],
    })
  }
  it('should toggle state correctly and update aria-checked', async () => {
    const { rerender } = await render(SwitchComponent, {
      componentInputs: { checked: false },
      providers: [provideIcons({ lucideCheck, lucideX })],
    })
    const button = screen.getByRole('switch')

    expect(button).toHaveAttribute('aria-checked', 'false')

    await userEvent.click(button)
    // Note: Since 'checked' is a model input, the state updates immediately.
    expect(button).toHaveAttribute('aria-checked', 'true')
    expect(button).toHaveAttribute('data-state', 'checked')
  })

  it('should not respond to click events when disabled is true', async () => {
    await render(SwitchComponent, {
      componentInputs: { disabled: true },
      providers: [provideIcons({ lucideCheck, lucideX })],
    })
    const button = screen.getByRole('switch')

    expect(button).toBeDisabled()
    await userEvent.click(button)
    expect(button).toHaveAttribute('aria-checked', 'false')
  })

  it('should render icons when showIcons is true', async () => {
    await render(SwitchComponent, {
      componentInputs: { showIcons: true, checked: true },
      providers: [provideIcons({ lucideCheck, lucideX })],
    })
    // Check if the ng-icon element exists
    const icon = document.querySelector('ng-icon')
    expect(icon).toBeTruthy()
  })

  it('Keyboard Support: Pressing the Space key should trigger a toggle', async () => {
    await setup()
    const button = screen.getByRole('switch')
    button.focus()

    await userEvent.keyboard('[Space]')
    expect(button).toHaveAttribute('aria-checked', 'true')
  })
})
