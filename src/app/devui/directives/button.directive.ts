import { Directive, input, computed, ElementRef, Renderer2, effect, untracked } from '@angular/core'
import { cn } from '../lib/utils'
import { ButtonVariantProps, buttonVariants } from '../lib/button.variants'

@Directive({
  selector: '[appButton]',
  standalone: true,
  host: {
    '[class]': 'hostClasses()',
    '[attr.disabled]': 'loading() || null',
  },
})
export class ButtonDirective {
  readonly appButton = input<any>(null)

  readonly variant = input<ButtonVariantProps['variant']>('default')
  readonly size = input<ButtonVariantProps['size']>('default')
  readonly userClass = input<string>('', { alias: 'class' })
  readonly loading = input<boolean>(false)

  protected hostClasses = computed(() => {
    const val = this.appButton()
    const finalVariant = typeof val === 'string' && val !== '' ? val : this.variant()

    return cn(
      buttonVariants({
        variant: finalVariant as ButtonVariantProps['variant'],
        size: this.size(),
      }),
      this.loading() ? 'opacity-70 cursor-not-allowed relative !text-transparent' : '',
      this.userClass(),
    )
  })

  private loaderElement: HTMLElement | null = null

  constructor(
    private el: ElementRef<HTMLElement>,
    private renderer: Renderer2,
  ) {
    effect(() => {
      const isLoading = this.loading()
      untracked(() => this.toggleLoader(isLoading))
    })
  }

  private toggleLoader(isLoading: boolean) {
    const host = this.el.nativeElement
    if (isLoading) {
      if (this.loaderElement) return
      this.loaderElement = this.renderer.createElement('span')
      const loaderClass = 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-current'
      loaderClass.split(' ').forEach((c) => this.renderer.addClass(this.loaderElement, c))

      this.loaderElement!.innerHTML = `
        <svg class="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>`
      this.renderer.appendChild(host, this.loaderElement)
    } else {
      if (this.loaderElement) {
        this.renderer.removeChild(host, this.loaderElement)
        this.loaderElement = null
      }
    }
  }
}
