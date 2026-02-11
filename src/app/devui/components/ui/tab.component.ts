import {
  Component,
  Directive,
  forwardRef,
  inject,
  input,
  model,
  computed,
  InjectionToken,
  ViewEncapsulation,
  effect,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { cn } from '../../lib/utils'

const TABS_ROOT = new InjectionToken<{
  value: ReturnType<typeof model<string>>
}>('TABS_ROOT')

@Component({
  selector: 'tabs',
  standalone: true,
  template: `<ng-content />`,
  providers: [
    { provide: TABS_ROOT, useExisting: forwardRef(() => Tabs) },
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Tabs), multi: true },
  ],
  host: {
    '[class]': 'hostClass()',
  },
})
export class Tabs implements ControlValueAccessor {
  readonly value = model<string>('')
  readonly className = input<string>('')

  readonly hostClass = computed(() => cn('block', this.className()))

  private onChange: (val: string) => void = () => {}
  private onTouched: () => void = () => {}

  constructor() {
    effect(() => this.onChange(this.value()))
  }

  writeValue(val: string): void {
    if (val !== undefined) this.value.set(val)
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
}

@Component({
  selector: 'tabs-list',
  standalone: true,
  template: `<ng-content />`,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class]': 'hostClass()',
    role: 'tablist',
  },
})
export class TabsList {
  readonly className = input<string>('')
  readonly hostClass = computed(() =>
    cn(
      'inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground',
      this.className(),
    ),
  )
}

@Component({
  selector: 'button[tabsTrigger]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-state]': 'state()',
    '[attr.type]': '"button"',
    '[disabled]': 'disabled()',
    role: 'tab',
    '(click)': 'handleClick()',
  },
})
export class TabsTrigger {
  private root = inject(TABS_ROOT)

  readonly value = input.required<string>()
  readonly className = input<string>('')
  readonly disabled = input<boolean, any>(false, {
    transform: (v: any) => v === '' || !!v,
  })

  readonly isActive = computed(() => this.root.value() === this.value())
  readonly state = computed(() => (this.isActive() ? 'active' : 'inactive'))

  readonly hostClass = computed(() =>
    cn(
      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
      this.isActive() ? 'bg-background text-foreground shadow' : '',
      this.className(),
    ),
  )

  handleClick() {
    if (!this.disabled()) {
      this.root.value.set(this.value())
    }
  }
}

@Component({
  selector: 'tabs-content',
  standalone: true,
  template: `
    @if (isVisible()) {
      <ng-content />
    }
  `,
  host: {
    '[class]': 'hostClass()',
    '[attr.data-state]': 'state()',
    role: 'tabpanel',
  },
})
export class TabsContent {
  private root = inject(TABS_ROOT)

  readonly value = input.required<string>()
  readonly className = input<string>('')

  readonly isVisible = computed(() => this.root.value() === this.value())
  readonly state = computed(() => (this.isVisible() ? 'active' : 'inactive'))

  readonly hostClass = computed(() =>
    cn(
      'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      this.className(),
      !this.isVisible() ? 'hidden' : '',
    ),
  )
}
// usage
// <tabs [(value)]="currentTab">
//   <tabs-list>
//     <button tabsTrigger value="account">Account</button>
//     <button tabsTrigger value="password">Password</button>
//   </tabs-list>
//   <tabs-content value="account">Make changes to your account here.</tabs-content>
//   <tabs-content value="password">Change your password here.</tabs-content>
// </tabs>
