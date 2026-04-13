import { render, screen } from '@testing-library/angular'
import { LoadingStateComponent } from './loading-state.component'
import { provideIcons } from '@ng-icons/core'
import { lucideLoader2 } from '@ng-icons/lucide'
import '@testing-library/jest-dom'

describe('LoadingStateComponent', () => {
  const setup = async (props: Partial<LoadingStateComponent> = {}) => {
    return await render(LoadingStateComponent, {
      componentInputs: props,
      providers: [provideIcons({ lucideLoader2 })],
    })
  }

  it('should render the default loading text', async () => {
    await setup()
    expect(screen.getByText(/loading.../i)).toBeInTheDocument()
  })

  it('should correctly render the description text and custom projected content', async () => {
    await render(
      `
<app-loading-state message="Processing" description="Please wait">
<button>Cancel</button>
</app-loading-state>
`,
      {
        imports: [LoadingStateComponent],
        providers: [provideIcons({ lucideLoader2 })],
      },
    )

    expect(screen.getByText('Processing')).toBeInTheDocument()
    expect(screen.getByText('Please wait')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })

  it('should include full-screen style classes when fullPage is true', async () => {
    await render(LoadingStateComponent, {
      componentInputs: {
        fullPage: true,
        message: 'Loading Data',
        size: 'lg',
      },
      providers: [provideIcons({ lucideLoader2 })],
    })

    // Verify the rendered output
    const messageElement = screen.getByText('Loading Data')

    // Look upwards for the container containing `min-h-screen`
    const fullPageContainer = messageElement.closest('.min-h-screen')

    expect(fullPageContainer).toBeInTheDocument()
    expect(fullPageContainer).toHaveClass('items-center', 'justify-center')
  })
})
