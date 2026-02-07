import {
  Directive,
  Input,
  HostBinding,
  ElementRef,
  Renderer2,
  OnChanges,
  SimpleChanges,
} from '@angular/core'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive:
          'bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>
@Directive({
  selector: '[appButton]',
  standalone: true,
})
export class ButtonDirective implements OnChanges {
  @Input() variant: ButtonVariantProps['variant'] = 'default'
  @Input() size: ButtonVariantProps['size'] = 'default'
  @Input() class: string = ''

  @Input() loading: boolean = false

  @HostBinding('disabled') get isDisabled() {
    return this.loading
  }

  @HostBinding('class') get hostClasses() {
    return cn(
      buttonVariants({ variant: this.variant, size: this.size }),
      this.loading ? 'opacity-70 cursor-not-allowed' : '',
      this.class,
    )
  }

  private loaderElement: HTMLElement | null = null

  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['loading']) {
      this.toggleLoader()
    }
  }

  private toggleLoader() {
    const host = this.el.nativeElement

    if (this.loading) {
      this.loaderElement = this.renderer.createElement('span')
      this.loaderElement!.innerHTML = `
        <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      `
      this.renderer.insertBefore(host, this.loaderElement, host.firstChild)
    } else {
      if (this.loaderElement) {
        this.renderer.removeChild(host, this.loaderElement)
        this.loaderElement = null
      }
    }
  }
}
