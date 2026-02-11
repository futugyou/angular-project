import {
  Component,
  ElementRef,
  forwardRef,
  input,
  viewChild,
  signal,
  computed,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms'
import { cn } from '../../lib/utils'

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
  template: `
    <textarea
      #textarea
      data-slot="textarea"
      [class]="computedClass()"
      [placeholder]="placeholder()"
      [disabled]="isEffectivelyDisabled()"
      [value]="value()"
      (input)="handleInput($event)"
      (blur)="onTouched()"
    ></textarea>
  `,
})
export class TextareaComponent implements ControlValueAccessor {
  // Signals Inputs
  readonly className = input<string>('')
  readonly placeholder = input<string>('')
  readonly disabled = input<boolean>(false)
  private readonly _isCvaDisabled = signal(false)
  readonly isEffectivelyDisabled = computed(() => this.disabled() || this._isCvaDisabled())
  readonly textareaElement = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea')

  // Internal State
  readonly value = input<string>('')
  private innerValue: string = ''

  // ControlValueAccessor Callbacks
  onChange: (value: string) => void = () => {}
  onTouched: () => void = () => {}

  computedClass() {
    return cn(
      'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      this.className(),
    )
  }

  handleInput(event: Event) {
    const val = (event.target as HTMLTextAreaElement).value
    this.innerValue = val
    this.onChange(val)
  }

  writeValue(value: any): void {
    this.innerValue = value || ''
    if (this.textareaElement()) {
      this.textareaElement().nativeElement.value = this.innerValue
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }

  setDisabledState?(isDisabled: boolean): void {
    this._isCvaDisabled.set(isDisabled)
  }
}
