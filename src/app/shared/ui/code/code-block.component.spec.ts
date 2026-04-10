import { render, screen } from '@testing-library/angular'
import userEvent from '@testing-library/user-event'
import { vi, expect, it, describe, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { CodeBlockComponent } from './code-block.component'
import { NgIconComponent, NgIconsModule } from '@ng-icons/core'
import { lucideCheck, lucideCopy } from '@ng-icons/lucide'

describe('CodeBlock Component', () => {
  const testCode = "console.log('hello world')"

  beforeEach(() => {
    vi.useFakeTimers()
    // Provide a mock implementation that doesn't throw errors; no Spy assertions are performed here.
    vi.stubGlobal('navigator', {
      clipboard: {
        writeText: () => Promise.resolve(),
      },
    })
  })

  it('should correctly toggle UI state after clicking the copy button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const { fixture } = await render(CodeBlockComponent, {
      componentInputs: { code: testCode },
      imports: [
        NgIconComponent,
        NgIconsModule.withIcons({
          lucideCopy,
          lucideCheck,
        }),
      ],
    })

    const copyBtn = screen.getByRole('button')

    // 1. Verify initial state
    expect(copyBtn).toHaveAttribute('title', 'Copy code')

    // 2. Trigger the click event
    await user.click(copyBtn)

    // 3. Verify the internal Signal state of the component (checked directly from the component instance)
    const componentInstance = fixture.componentInstance
    expect(componentInstance.copied()).toBe(true)

    // 4. Verify the DOM attribute feedback
    expect(copyBtn).toHaveAttribute('title', 'Copied!')

    // 5. Verify the state resets automatically after the timer expires
    vi.advanceTimersByTime(2000)
    fixture.detectChanges()
    expect(componentInstance.copied()).toBe(false)
    expect(copyBtn).toHaveAttribute('title', 'Copy code')
  })

  it('should not render the language tag when no language is provided', async () => {
    await render(CodeBlockComponent, {
      componentInputs: { code: testCode },
      imports: [
        NgIconComponent,
        NgIconsModule.withIcons({
          lucideCopy,
          lucideCheck,
        }),
      ],
    })

    // The 'language' input is optional and defaults to an empty string.
    // We check if the uppercase span element exists.
    const langTag = screen.queryByText(/[A-Z]+/)
    expect(langTag).not.toBeInTheDocument()
  })
})
