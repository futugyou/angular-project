import { Component, input, computed } from '@angular/core'
import { cn } from '../../lib/utils'
import { ButtonVariantProps, buttonVariants } from '../../lib/button.variants'

@Component({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass()',
  },
})
export class ButtonComponent {
  appButton = input<any>(null)

  variant = input<ButtonVariantProps['variant']>('default')
  size = input<ButtonVariantProps['size']>('default')
  readonly userClass = input<string>('', { alias: 'class' })

  readonly computedClass = computed(() =>
    cn(buttonVariants({ variant: this.variant(), size: this.size() }), this.userClass()),
  )
}
