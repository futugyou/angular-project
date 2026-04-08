import { render, screen } from '@testing-library/angular'
import '@testing-library/jest-dom'
import { CARD_COMPONENTS, CardComponent } from './index'

describe('CardComponent Integration', () => {
  it('Should render the complete card structure including all sub-components', async () => {
    await render(
      ` 
<div ui-card data-testid="card-root"> 
<div ui-card-header> 
<div ui-card-title>Title</div> 
<div ui-card-description>Description</div> 
<div ui-card-action><button>Action</button></div> 
</div> 
<div ui-card-content>Content Body</div> 
<div ui-card-footer>Footer Note</div> 
</div> 
`,
      {
        imports: [...CARD_COMPONENTS],
      },
    )

    expect(screen.getByTestId('card-root')).toHaveClass('bg-card')
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
    expect(screen.getByText('Content Body')).toBeInTheDocument()
  })

  it('Should correctly merge custom class input attributes', async () => {
    const customClass = 'custom-border-red'
    await render(`<div ui-card [class]="className">Content</div>`, {
      componentProperties: { className: customClass },
      imports: [CardComponent],
    })

    const card = screen.getByText('Content')
    expect(card).toHaveClass('custom-border-red')
    expect(card).toHaveClass('rounded')
  })
})
