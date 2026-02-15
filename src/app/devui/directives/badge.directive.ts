import { Directive, input, computed, OnInit } from '@angular/core'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeVariantProps = VariantProps<typeof badgeVariants>

// usage
// <div appBadge variant="destructive">Reminders</div>
// <span appBadge variant="outline">Secondary tags</span>
@Directive({
  selector: '[appBadge]',
  standalone: true,
  host: {
    '[class]': 'computedClasses()',
  },
})
export class BadgeDirective implements OnInit {
  variant = input<BadgeVariantProps['variant']>('default')
  className = input<string>('', { alias: 'class' })

  computedClasses = computed(() =>
    cn(
      "focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:!text-destructive [&_svg:not([class*='text-'])]:text-muted-foreground relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      this.className(),
    ),
  )
  constructor() {}

  ngOnInit(): void {}
}
