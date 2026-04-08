import { Component, signal } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import { BadgeComponent } from '@shared/ui/badge'
import { BadgeDirective } from '@shared/directives/badge.directive'

@Component({
  selector: 'app-badge-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule, BadgeComponent, BadgeDirective],
  template: `
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Badge Component Test</h1>
      <app-badge variant="outline" class="text-xs"> outline </app-badge>
      <app-badge variant="destructive" class="text-xs"> destructive </app-badge>
      <app-badge variant="secondary" class="text-xs"> secondary </app-badge>
      <app-badge variant="default" class="text-xs font-mono"> default </app-badge>
    </div>
    <div class="p-4">
      <h1 class="text-2xl font-bold mb-6 text-gray-800">Badge Directive Test</h1>
      <div appBadge variant="outline" class="text-xs">outline</div>
      <div appBadge variant="destructive" class="text-xs">destructive</div>
      <div appBadge variant="secondary" class="text-xs">secondary</div>
      <div appBadge variant="default" class="text-xs font-mono">default</div>
    </div>
  `,
})
export class BadgeTestComponent {}
