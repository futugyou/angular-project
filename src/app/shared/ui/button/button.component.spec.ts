import { render, screen } from '@testing-library/angular'
import '@testing-library/jest-dom'
import { ButtonComponent } from './button.component'

describe('ButtonComponent', () => {
  it('should render a button with default styles', async () => {
    await render('<button appButton>Click me</button>', {
      imports: [ButtonComponent],
    })

    const btn = screen.getByRole('button', { name: /click me/i })
    expect(btn).toBeInTheDocument()
    // Verify default class (derived from CVA)
    expect(btn).toHaveClass('bg-primary')
  })

  it('should set the variant via the appButton directive alias', async () => {
    await render('<button appButton="destructive">Delete</button>', {
      imports: [ButtonComponent],
    })

    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('bg-destructive')
  })

  it('should prioritize appButton when both appButton and variant are provided', async () => {
    await render('<button appButton="outline" variant="destructive">Mixed</button>', {
      imports: [ButtonComponent],
    })

    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('border') // Characteristic of 'outline'
    expect(btn).not.toHaveClass('bg-destructive')
  })

  it('should correctly pass through custom classes', async () => {
    await render('<button appButton class="extra-class">Custom</button>', {
      imports: [ButtonComponent],
    })

    const btn = screen.getByRole('button')
    expect(btn).toHaveClass('extra-class')
  })

  it('should support usage as a link (<a> tag)', async () => {
    await render('<a appButton href="/test">Link</a>', {
      imports: [ButtonComponent],
    })

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveClass('inline-flex')
  })
})
