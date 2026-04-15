import type { Meta, StoryObj } from '@storybook/angular'
import { moduleMetadata } from '@storybook/angular'
import { OverlayModule } from '@angular/cdk/overlay'
import { NgIconsModule } from '@ng-icons/core'
import { lucideInfo, lucideCheckCircle } from '@ng-icons/lucide'
import { TooltipContent, TooltipDirective } from '.'

const meta: Meta = {
  title: 'Components/Tooltip',
  decorators: [
    moduleMetadata({
      imports: [
        TooltipDirective,
        TooltipContent,
        OverlayModule,
        NgIconsModule.withIcons({ lucideInfo, lucideCheckCircle }),
      ],
    }),
  ],
}

export default meta

export const Positions: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 100px; display: flex; gap: 20px;">
        <button [appTooltip]="t1" position="top">Top</button>
        <button [appTooltip]="t2" position="right">Right</button>
        
        <app-tooltip-content #t1>Top Tooltip</app-tooltip-content>
        <app-tooltip-content #t2>Right Tooltip</app-tooltip-content>
      </div>
    `,
  }),
}

export const WithRichContent: StoryObj = {
  render: () => ({
    template: `
      <div style="padding: 100px;">
        <button [appTooltip]="richTooltip">Rich Content</button>
        <app-tooltip-content #richTooltip>
          <div style="display: flex; align-items: center; gap: 8px; color: #4ade80">
            <ng-icon name="lucideCheckCircle" />
            <span>Success Message!</span>
          </div>
        </app-tooltip-content>
      </div>
    `,
  }),
}
