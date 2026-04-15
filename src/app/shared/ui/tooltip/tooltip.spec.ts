import { render, screen, fireEvent, waitFor } from '@testing-library/angular'
import '@testing-library/jest-dom'
import { NgIconsModule } from '@ng-icons/core'
import { lucideInfo } from '@ng-icons/lucide'
import { OverlayModule } from '@angular/cdk/overlay'
import { Component, viewChild } from '@angular/core'
import { TooltipContent, TooltipDirective } from '.'

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right'

@Component({
  standalone: true,
  imports: [TooltipDirective, TooltipContent],
  template: `
    <button [appTooltip]="tooltipRef" [position]="pos" [showDelay]="0">Hover me</button>
    <app-tooltip-content #tooltipRef>Tooltip Message</app-tooltip-content>
  `,
})
class TestHostComponent {
  pos: TooltipPosition = 'top'
  tooltipInstance = viewChild.required<TooltipContent>('tooltipRef')
}

describe('Tooltip Integration', () => {
  const setup = async (pos: TooltipPosition = 'top') => {
    return await render(TestHostComponent, {
      imports: [
        OverlayModule,
        NgIconsModule.withIcons({ lucideInfo }),
        TooltipDirective,
        TooltipContent,
      ],
      componentProperties: {
        pos: pos,
      },
    })
  }

  it('should display content on mouse hover and disappear on mouse leave', async () => {
    await setup('bottom')
    const trigger = screen.getByText('Hover me')

    fireEvent.mouseEnter(trigger)

    await waitFor(() => {
      expect(screen.getByText('Tooltip Message')).toBeInTheDocument()
    })

    fireEvent.mouseLeave(trigger)

    await waitFor(
      () => {
        expect(screen.queryByText('Tooltip Message')).not.toBeInTheDocument()
      },
      { timeout: 1000 },
    )
  })

  it('should not close when the mouse moves from the trigger to the Tooltip content itself', async () => {
    const { fixture } = await setup()
    const trigger = screen.getByText('Hover me')

    // 1. Open the Tooltip
    fireEvent.mouseEnter(trigger)
    await waitFor(() => expect(screen.getByText('Tooltip Message')).toBeInTheDocument())

    // 2. Simulate moving the mouse out of the trigger
    fireEvent.mouseLeave(trigger)

    // 3. Immediately simulate moving the mouse into the Tooltip content
    // Access the signal via viewChild and set its value
    fixture.componentInstance.tooltipInstance().isHovered.set(true)

    // 4. Wait for 200ms (the close delay in the logic is 100ms)
    await new Promise((r) => setTimeout(r, 200))

    expect(screen.getByText('Tooltip Message')).toBeInTheDocument()
  })
})
