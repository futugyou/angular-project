import { Component, input, model, computed, forwardRef, signal } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { cn } from '../../lib/utils'
import { NgIconsModule } from '@ng-icons/core'

// usage
// <app-checkbox [(ngModel)]="isAdmin" />
// <app-checkbox [formControl]="myControl" />
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
      [attr.aria-disabled]="isDisabled()"
      [tabIndex]="isDisabled() ? -1 : 0"
      role="checkbox"
      (click)="toggle()"
      (blur)="onTouched()"
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
  className = input<string>('')
  disabled = input<boolean>(false)

  checked = model<boolean>(false)
  indeterminate = model<boolean>(false)

  private _cvaDisabled = signal(false)
  isDisabled = computed(() => this.disabled() || this._cvaDisabled())

  state = computed(() => {
    if (this.indeterminate()) return 'indeterminate'
    return this.checked() ? 'checked' : 'unchecked'
  })

  rootClasses = computed(() =>
    cn(
      'peer border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] focus-visible:border-ring focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center cursor-pointer',
      this.state() !== 'unchecked'
        ? 'bg-primary text-primary-foreground border-primary'
        : 'bg-transparent',
      this.isDisabled() && 'opacity-50 cursor-not-allowed pointer-events-none',
      this.className(),
    ),
  )

  toggle() {
    if (this.isDisabled()) return

    if (this.indeterminate()) {
      this.indeterminate.set(false)
      this.checked.set(true)
    } else {
      this.checked.set(!this.checked())
    }

    this.onChange(this.checked())
    this.onTouched()
  }

  onChange: (value: any) => void = () => {}
  onTouched: () => void = () => {}

  writeValue(value: any): void {
    if (value === 'indeterminate') {
      this.indeterminate.set(true)
    } else {
      this.indeterminate.set(false)
      this.checked.set(!!value)
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this._cvaDisabled.set(isDisabled)
  }
}
