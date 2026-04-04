import {
  Component,
  input,
  computed,
  forwardRef,
  signal,
  ElementRef,
  viewChild,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { cn } from '../utils/utils'

@Component({
  selector: 'app-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  host: {
    '[attr.data-slot]': '"input"',
  },
  template: `
    <input
      #input
      [type]="type()"
      [class]="classes()"
      [attr.placeholder]="placeholder()"
      [disabled]="isEffectivelyDisabled()"
      [value]="value()"
      (input)="onInputChange($event)"
      (blur)="onTouched()"
    />
  `,
})
export class InputComponent implements ControlValueAccessor {
  type = input<string>('text')
  placeholder = input<string>('')
  disabled = input<boolean>(false)
  private readonly _isCvaDisabled = signal(false)
  readonly isEffectivelyDisabled = computed(() => this.disabled() || this._isCvaDisabled())

  readonly userClass = input<string>('', { alias: 'class' })
  readonly inputElement = viewChild.required<ElementRef<HTMLInputElement>>('input')

  readonly value = input<string>('')
  private innerValue: string = ''

  onChange: any = () => {}
  onTouched: any = () => {}

  readonly classes = computed(() =>
    cn(
      'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      this.userClass(),
    ),
  )

  onInputChange(event: Event) {
    const val = (event.target as HTMLInputElement).value
    this.innerValue = val
    this.onChange(val)
  }

  writeValue(value: any): void {
    this.innerValue = value || ''
    if (this.inputElement()) {
      this.inputElement().nativeElement.value = this.innerValue
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  setDisabledState(isDisabled: boolean): void {
    this._isCvaDisabled.set(isDisabled)
  }
}
