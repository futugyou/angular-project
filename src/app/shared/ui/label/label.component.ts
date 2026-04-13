import {
  Component,
  input,
  computed,
  ChangeDetectionStrategy,
  ViewEncapsulation,
} from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { cn } from '../../utils/utils'

@Component({
  selector: 'label[appLabel], app-label',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <ng-content />
    @if (icon()) {
      <ng-icon [name]="icon()!" [class]="iconClass()" />
    }
  `,
  host: {
    '[attr.data-slot]': '"label"',
    '[class]': 'mergedClass()',
    '[attr.for]': 'htmlFor()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class LabelComponent {
  className = input<string>('', { alias: 'class' })
  htmlFor = input<string | undefined>(undefined, { alias: 'for' })
  icon = input<string | undefined>()
  iconClass = input<string>('')
  disabled = input<boolean>(false)

  protected mergedClass = computed(() =>
    cn(
      'flex items-center gap-2 text-sm leading-none font-medium select-none',
      'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
      'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
      this.disabled() ? 'pointer-events-none opacity-50' : '',
      this.className(),
    ),
  )
}
