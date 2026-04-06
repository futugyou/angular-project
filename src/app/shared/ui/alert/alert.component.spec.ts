import { render, screen } from '@testing-library/angular'
import '@testing-library/jest-dom'
import { Alert, AlertTitle, AlertDescription } from './alert.component'
import { Component } from '@angular/core'

describe('Alert Components', () => {
  it('should render Alert with content and default classes', async () => {
    await render(`<app-alert>Test Alert</app-alert>`, {
      imports: [Alert],
    })

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Test Alert')
    expect(alert).toHaveClass('relative block w-full rounded-lg border p-4')
  })

  it('should apply user class on Alert', async () => {
    await render(`<app-alert class="my-alert">Test</app-alert>`, {
      imports: [Alert],
    })

    const alert = screen.getByRole('alert')
    expect(alert).toHaveClass('my-alert')
  })

  it('should render AlertTitle with content', async () => {
    await render(`<app-alert-title>Title</app-alert-title>`, {
      imports: [AlertTitle],
    })

    const title = screen.getByText('Title')
    expect(title).toBeInTheDocument()
    expect(title).toHaveClass('block mb-1 font-medium leading-none tracking-tight')
  })

  it('should render AlertDescription with content', async () => {
    await render(`<app-alert-description>Description</app-alert-description>`, {
      imports: [AlertDescription],
    })

    const desc = screen.getByText('Description')
    expect(desc).toBeInTheDocument()
    expect(desc).toHaveClass('block text-sm [&_p]:leading-relaxed')
  })

  it('should render nested Alert structure', async () => {
    @Component({
      standalone: true,
      imports: [Alert, AlertTitle, AlertDescription],
      template: `
        <app-alert class="outer-alert">
          <app-alert-title class="title-class">Hello</app-alert-title>
          <app-alert-description class="desc-class">World</app-alert-description>
        </app-alert>
      `,
    })
    class TestHostComponent {}

    await render(TestHostComponent)

    const alert = screen.getByRole('alert')
    const title = screen.getByText('Hello')
    const desc = screen.getByText('World')

    expect(alert).toHaveClass('outer-alert')
    expect(title).toHaveClass('title-class')
    expect(desc).toHaveClass('desc-class')
  })
})
