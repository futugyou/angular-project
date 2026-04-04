import { Directive, input, computed } from '@angular/core'
import { BadgeVariantProps, badgeVariants } from '../utils/badge.variants'
import { cn } from '../utils/utils'

@Directive({
  selector: '[appBadge]',
  standalone: true,
  host: {
    '[class]': 'computedClasses()',
  },
})
export class BadgeDirective {
  variant = input<BadgeVariantProps['variant']>('default')
  readonly userClass = input<string>('', { alias: 'class' })

  readonly computedClasses = computed(() =>
    cn(badgeVariants({ variant: this.variant() }), this.userClass()),
  )
}
