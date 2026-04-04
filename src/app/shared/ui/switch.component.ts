import {
  Component,
  booleanAttribute,
  computed,
  forwardRef,
  input,
  model,
  signal,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { NgIcon } from '@ng-icons/core'
import { cn } from '../utils/utils'

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [NgIcon],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SwitchComponent),
      multi: true,
    },
  ],
  host: {
    '(blur)': 'handleBlur()',
    '[class.disabled]': 'disabled()',
  },
  template: `
    <button
      #switchRoot
      type="button"
      role="switch"
      [attr.aria-checked]="checked()"
      [attr.data-state]="state()"
      [disabled]="disabled()"
      [class]="mergedClass()"
      (click)="toggle()"
      (keydown.space)="$event.preventDefault(); toggle()"
      (keydown.enter)="$event.preventDefault(); toggle()"
    >
      <span [attr.data-state]="state()" [class]="thumbClass()">
        @if (showIcons()) {
          <ng-icon
            [name]="checked() ? 'lucideCheck' : 'lucideX'"
            class="h-3 w-3 text-primary-foreground"
          />
        }
      </span>
    </button>
  `,
})
export class SwitchComponent implements ControlValueAccessor {
  // --- Signal Inputs ---
  private _formDisabled = signal(false)
  className = input<string>('')
  disabledInput = input(false, { alias: 'disabled', transform: booleanAttribute })
  protected disabled = computed(() => this.disabledInput() || this._formDisabled())
  showIcons = input(false, { transform: booleanAttribute })

  checked = model<boolean>(false)

  // --- Computed States ---
  protected state = computed(() => (this.checked() ? 'checked' : 'unchecked'))

  protected mergedClass = computed(() =>
    cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      this.className(),
    ),
  )

  protected thumbClass = computed(() =>
    cn(
      'pointer-events-none flex items-center justify-center h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0',
    ),
  )

  toggle() {
    if (!this.disabled()) {
      this.checked.update((v) => !v)
      this.onChange(this.checked())
      this.onTouched()
    }
  }

  // --- CVA Logic ---
  private onChange: (v: boolean) => void = () => {}
  private onTouched: () => void = () => {}

  setDisabledState(isDisabled: boolean): void {
    this._formDisabled.set(isDisabled)
  }
  writeValue(v: boolean): void {
    this.checked.set(!!v)
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  protected handleBlur() {
    this.onTouched()
  }
}
