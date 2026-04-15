import { Component, input, ChangeDetectionStrategy } from '@angular/core'
import { NgIcon } from '@ng-icons/core'
import { SeparatorRoot } from '../../directives/separator.directive'

@Component({
  selector: 'app-separator',
  standalone: true,
  imports: [NgIcon],
  hostDirectives: [
    {
      directive: SeparatorRoot,
      inputs: ['orientation', 'decorative'],
    },
  ],
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
    :host[data-orientation='horizontal'] {
      height: 1px;
      width: 100%;
    }
    :host[data-orientation='vertical'] {
      height: 100%;
      width: 1px;
    }
  `,
  host: {
    '[class.app-separator]': 'true',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SeparatorComponent {
  icon = input<string | undefined>()
}
