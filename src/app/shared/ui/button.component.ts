import { Component, input, computed } from '@angular/core'
import { cn } from '../utils/utils'
import { ButtonVariantProps, buttonVariants } from '../utils/button.variants'

@Component({
  selector: 'button[appButton], a[appButton]',
  standalone: true,
  template: `<ng-content></ng-content>`,
  host: {
    '[class]': 'computedClass()',
  },
})
export class ButtonComponent {
  // <button [appButton] variant="destructive">destructive</button>
  // <button appButton variant="destructive">destructive2</button>
  // <button appButton="destructive">destructive3</button>
  // <button [appButton]="'destructive'">destructive4</button>
  // The reason I didn't use `alias` was to observe the results across all four syntax variations.
  // This approach applies only to the Button Component and Directive; for all other components, `alias` should be used.
  appButton = input<any>(null)
  variant = input<ButtonVariantProps['variant']>('default')

  size = input<ButtonVariantProps['size']>('default')
  readonly userClass = input<string>('', { alias: 'class' })

  readonly computedClass = computed(() => {
    const aliasValue = this.appButton()
    const explicitVariant = this.variant()
    const finalVariant =
      typeof aliasValue === 'string' && aliasValue !== ''
        ? (aliasValue as ButtonVariantProps['variant'])
        : explicitVariant

    return cn(buttonVariants({ variant: finalVariant, size: this.size() }), this.userClass())
  })
}
