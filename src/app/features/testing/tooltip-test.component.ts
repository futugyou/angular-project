import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { TooltipContent, TooltipDirective } from '@shared/ui/tooltip.component'

@Component({
  selector: 'app-tooltip-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, TooltipContent, TooltipDirective],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Tooltip Component Test</h1>
    <div class="grid grid-cols-4 gap-4">
      <button [appTooltip]="tooltipInfo" position="top">
        <ng-icon name="lucideInfo" />
        top
      </button>
      <button [appTooltip]="tooltipInfo" position="bottom">
        <ng-icon name="lucideInfo" />
        bottom
      </button>
      <button [appTooltip]="tooltipInfo" position="left">
        <ng-icon name="lucideInfo" />
        left
      </button>
      <button [appTooltip]="tooltipInfo" position="right">
        <ng-icon name="lucideInfo" />
        right
      </button>
    </div>

    <app-tooltip-content #tooltipInfo>
      <div style="display: flex; align-items: center; gap: 8px">
        <span>Tooltip</span>
        <ng-icon name="lucideCheckCircle" />
      </div>
    </app-tooltip-content>
  `,
})
export class TooltipTestComponent {}
