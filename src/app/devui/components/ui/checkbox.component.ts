import { Component, input, model, computed, forwardRef } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { cn } from '../../lib/utils'
import { NgIconsModule } from '@ng-icons/core'

@Component({
  selector: 'app-checkbox',
  standalone: true,
  imports: [NgIconsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CheckboxComponent),
      multi: true,
    },
  ],
  template: `
    <div
      #checkboxRoot
      [class]="rootClasses()"
      [attr.data-state]="state()"
      [attr.aria-checked]="indeterminate() ? 'mixed' : checked()"
      [attr.aria-disabled]="disabled()"
      role="checkbox"
      [tabIndex]="disabled() ? -1 : 0"
      (click)="toggle()"
      (keydown.space)="$event.preventDefault(); toggle()"
    >
      @if (state() !== 'unchecked') {
        <ng-icon
          [name]="indeterminate() ? 'lucideMinus' : 'lucideCheck'"
          class="size-3.5"
          data-slot="checkbox-indicator"
        />
      }
    </div>
  `,
})
export class CheckboxComponent implements ControlValueAccessor {
  // --- Signals ---
  className = input<string>('')
  disabled = input<boolean>(false)

  checked = model<boolean>(false)
  indeterminate = model<boolean>(false)

  state = computed(() => {
    if (this.indeterminate()) return 'indeterminate'
    return this.checked() ? 'checked' : 'unchecked'
  })

  rootClasses = computed(() =>
    cn(
      'peer border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center',
      this.state() !== 'unchecked'
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-transparent',
      this.className(),
    ),
  )

  toggle() {
    if (this.disabled()) return

    if (this.indeterminate()) {
      this.indeterminate.set(false)
      this.checked.set(true)
    } else {
      this.checked.set(!this.checked())
    }

    this.onChange(this.checked())
    this.onTouched()
  }

  // --- ControlValueAccessor ---
  private onTouched = () => {}
  private onChange = (val: boolean) => {}

  writeValue(value: any): void {
    this.checked.set(!!value)
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
}
