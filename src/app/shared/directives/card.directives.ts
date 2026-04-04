import { Directive, input, computed } from '@angular/core'
import { cn } from '../utils/utils'

// --- Card ---
@Directive({
  selector: '[ui-card]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card"',
    '[class]': 'computedClass()',
  },
})
export class CardDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn(
      'bg-card text-card-foreground flex flex-col gap-6 rounded border py-6 shadow-sm',
      this.className(),
    ),
  )
}

// --- Card Header ---
@Directive({
  selector: '[ui-card-header]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-header"',
    '[class]': 'computedClass()',
  },
})
export class CardHeaderDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
      this.className(),
    ),
  )
}

// --- Card Title ---
@Directive({
  selector: '[ui-card-title]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-title"',
    '[class]': 'computedClass()',
  },
})
export class CardTitleDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('leading-none font-semibold', this.className()))
}

// --- Card Description ---
@Directive({
  selector: '[ui-card-description]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-description"',
    '[class]': 'computedClass()',
  },
})
export class CardDescriptionDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('text-muted-foreground text-sm', this.className()))
}

// --- Card Action ---
@Directive({
  selector: '[ui-card-action]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-action"',
    '[class]': 'computedClass()',
  },
})
export class CardActionDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', this.className()),
  )
}

// --- Card Content ---
@Directive({
  selector: '[ui-card-content]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-content"',
    '[class]': 'computedClass()',
  },
})
export class CardContentDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('px-6', this.className()))
}

// --- Card Footer ---
@Directive({
  selector: '[ui-card-footer]',
  standalone: true,
  host: {
    '[attr.data-slot]': '"card-footer"',
    '[class]': 'computedClass()',
  },
})
export class CardFooterDirective {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn('flex items-center px-6 [.border-t]:pt-6', this.className()),
  )
}
