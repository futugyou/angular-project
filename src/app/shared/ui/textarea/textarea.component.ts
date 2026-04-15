import {
  Component,
  ElementRef,
  forwardRef,
  input,
  viewChild,
  signal,
  computed,
  effect,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms'
import { cn } from '../../utils/utils'

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
      [rows]="rows()"
      [disabled]="isEffectivelyDisabled()"
      (input)="handleInput($event)"
      (blur)="onTouched()"
    ></textarea>
  `,
})
export class TextareaComponent implements ControlValueAccessor {
  // --- Signal Inputs ---
  readonly className = input<string>('', { alias: 'class' })
  readonly placeholder = input<string>('')
  readonly rows = input<number>(3)
  readonly disabled = input<boolean>(false)

  readonly value = input<string>('')

  // --- View Child ---
  readonly textareaElement = viewChild.required<ElementRef<HTMLTextAreaElement>>('textarea')

  // --- Internal State ---
  private readonly _innerValue = signal<string>('')
  private readonly _isCvaDisabled = signal(false)

  protected readonly displayValue = computed(() => {
    const ext = this.value()
    const inn = this._innerValue()
    return ext || inn
  })

  readonly isEffectivelyDisabled = computed(() => this.disabled() || this._isCvaDisabled())

  constructor() {
    effect(() => {
      const val = this.displayValue()
      const el = this.textareaElement().nativeElement
      if (el.value !== val) {
        el.value = val
      }
    })
  }

  // --- CVA Callbacks ---
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
    this._innerValue.set(val)
    this.onChange(val)
  }

  // --- CVA Implementation ---
  writeValue(value: any): void {
    this._innerValue.set(value || '')
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
