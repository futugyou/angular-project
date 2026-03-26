import { Component, input, computed } from '@angular/core'
import { cn } from '../../lib/utils'
import { BadgeVariantProps, badgeVariants } from '../../lib/badge.variants'
@Component({
  selector: 'app-badge',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass()',
  },
})
export class BadgeComponent {
  variant = input<BadgeVariantProps['variant']>('default')
  readonly userClass = input<string>('', { alias: 'class' })

  readonly computedClass = computed(() =>
    cn(badgeVariants({ variant: this.variant() }), this.userClass()),
  )
}
