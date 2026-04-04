import { Directive, input, computed } from '@angular/core'

@Directive({
  standalone: true,
  host: {
    '[attr.role]': 'role()',
    '[attr.aria-orientation]': 'ariaOrientation()',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class SeparatorRoot {
  orientation = input<'horizontal' | 'vertical'>('horizontal')
  decorative = input<boolean>(true)

  role = computed(() => (this.decorative() ? 'none' : 'separator'))
  ariaOrientation = computed(() => (this.decorative() ? null : this.orientation()))
}
