// badge.component.spec.ts
import { render, screen } from '@testing-library/angular'
import '@testing-library/jest-dom'
import { BadgeComponent } from './badge.component'

describe('BadgeComponent', () => {
  it('The default variant style should be rendered.', async () => {
    await render(`<app-badge>New</app-badge>`, {
      imports: [BadgeComponent],
    })

    const badge = screen.getByText('New')
    expect(badge).toHaveClass('bg-primary')
    expect(badge).toHaveClass('inline-flex')
  })

  it('When variant="destructive" is passed in, the corresponding style is applied.', async () => {
    await render(`<app-badge variant="destructive">Delete</app-badge>`, {
      componentProperties: { variant: 'destructive' },
      imports: [BadgeComponent],
    })

    const badge = screen.getByText('Delete')
    expect(badge).toHaveClass('bg-destructive')
  })

  it('Should support merging custom classes.', async () => {
    await render(`<app-badge class="custom-class">Custom</app-badge>`, {
      imports: [BadgeComponent],
    })

    const badge = screen.getByText('Custom')
    expect(badge).toHaveClass('custom-class')
    expect(badge).toHaveClass('rounded-md')
  })
})
