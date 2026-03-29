import { Component, input, computed } from '@angular/core'
import { cn } from '../../lib/utils'

// --- Card ---
@Component({
  selector: 'div[ui-card]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card"',
    '[class]': 'computedClass()',
  },
})
export class CardComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn(
      'bg-card text-card-foreground flex flex-col gap-6 rounded border py-6 shadow-sm',
      this.className(),
    ),
  )
}

// --- Card Header ---
@Component({
  selector: 'div[ui-card-header]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-header"',
    '[class]': 'computedClass()',
  },
})
export class CardHeaderComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn(
      '@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6',
      this.className(),
    ),
  )
}

// --- Card Title ---
@Component({
  selector: 'div[ui-card-title]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-title"',
    '[class]': 'computedClass()',
  },
})
export class CardTitleComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('leading-none font-semibold', this.className()))
}

// --- Card Description ---
@Component({
  selector: 'div[ui-card-description]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-description"',
    '[class]': 'computedClass()',
  },
})
export class CardDescriptionComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('text-muted-foreground text-sm', this.className()))
}

// --- Card Action ---
@Component({
  selector: 'div[ui-card-action]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-action"',
    '[class]': 'computedClass()',
  },
})
export class CardActionComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', this.className()),
  )
}

// --- Card Content ---
@Component({
  selector: 'div[ui-card-content]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-content"',
    '[class]': 'computedClass()',
  },
})
export class CardContentComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() => cn('px-6', this.className()))
}

// --- Card Footer ---
@Component({
  selector: 'div[ui-card-footer]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[attr.data-slot]': '"card-footer"',
    '[class]': 'computedClass()',
  },
})
export class CardFooterComponent {
  className = input<string>('', { alias: 'class' })
  protected computedClass = computed(() =>
    cn('flex items-center px-6 [.border-t]:pt-6', this.className()),
  )
}

export const CARD_COMPONENTS = [
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardFooterComponent,
  CardHeaderComponent,
  CardTitleComponent,
  CardActionComponent,
] as const
