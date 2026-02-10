import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

@Component({
  selector: 'app-separator',
  standalone: true,
  imports: [NgIcon],
  template: `
    <ng-content>
      @if (icon()) {
        <ng-icon [name]="icon()!" />
      }
    </ng-content>
  `,
  styles: `
    :host {
      display: block;
      flex-shrink: 0;
      background-color: var(--border, #e2e8f0);
    }
    :host[data-orientation="horizontal"] { height: 1px; width: 100%; }
    :host[data-orientation="vertical"] { height: 100%; width: 1px; }
  `, 
  host: {
    '[attr.role]': 'decorative() ? "none" : "separator"',
    '[attr.aria-orientation]': 'decorative() ? null : orientation()',
    '[attr.data-orientation]': 'orientation()',
    '[class.shrink-0]': 'true',
    '[class.bg-border]': 'true'
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Separator {
  orientation = input<'horizontal' | 'vertical'>('horizontal');
  decorative = input<boolean>(true);
  icon = input<string | undefined>();
}