import {
  Component,
  Directive,
  inject,
  input,
  model,
  signal,
  booleanAttribute,
  forwardRef,
  effect,
  ElementRef,
  computed,
  TemplateRef,
  ViewChild,
  InjectionToken,
  contentChild,
} from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { OverlayModule } from '@angular/cdk/overlay'
import { CdkListbox, CdkListboxModule, CdkOption } from '@angular/cdk/listbox'
import { NgIconComponent } from '@ng-icons/core'
import { cn } from '../../lib/utils'
import { NgTemplateOutlet } from '@angular/common'

export interface SelectContentProvider {
  templateRef: TemplateRef<any>
  contentClass: () => string
}

export const SELECT_CONTENT_TOKEN = new InjectionToken<SelectContentProvider>(
  'SELECT_CONTENT_TOKEN',
)

/**
 * SELECT ROOT
 */
@Component({
  selector: 'app-select',
  standalone: true,
  imports: [OverlayModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Select),
      multi: true,
    },
  ],
  template: `<ng-content></ng-content>`,
})
export class Select implements ControlValueAccessor {
  contentComponent = contentChild(SELECT_CONTENT_TOKEN)

  value = model<any>()
  disabledInput = input<boolean>(false, { alias: 'disabled' })
  private _formDisabled = signal(false)
  isDisabled = computed(() => this.disabledInput() || this._formDisabled())
  isOpen = signal(false)
  triggerWidth = signal<number>(0)

  onChange: any = () => {}
  onTouched: any = () => {}

  constructor() {
    effect(() => {
      this.onChange(this.value())
    })
  }

  writeValue(val: any): void {
    this.value.set(val)
  }
  registerOnChange(fn: any): void {
    this.onChange = fn
  }
  registerOnTouched(fn: any): void {
    this.onTouched = fn
  }
  setDisabledState(isDisabled: boolean): void {
    this._formDisabled.set(isDisabled)
  }

  toggle() {
    if (!this.isDisabled()) this.isOpen.update((v) => !v)
  }
  close() {
    this.isOpen.set(false)
    this.onTouched()
  }
}

/**
 * SELECT TRIGGER
 */
@Component({
  selector: 'app-select-trigger',
  standalone: true,
  imports: [NgIconComponent, OverlayModule, NgTemplateOutlet],
  host: {
    '[attr.data-slot]': '"select-trigger"',
    '[attr.data-state]': 'root.isOpen() ? "open" : "closed"',
    '[class]': 'triggerClass()',
    '(click)': 'root.toggle()',
  },
  template: `
    <div
      class="flex items-center justify-between w-full"
      cdkOverlayOrigin
      #trigger="cdkOverlayOrigin"
    >
      <ng-content></ng-content>
      <ng-icon name="lucideChevronDown" class="size-4 opacity-50 shrink-0"></ng-icon>
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="trigger"
      [cdkConnectedOverlayPush]="true"
      [cdkConnectedOverlayMinWidth]="root.triggerWidth()"
      [cdkConnectedOverlayOpen]="root.isOpen()"
      [cdkConnectedOverlayHasBackdrop]="true"
      backdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="root.close()"
      (detach)="root.close()"
      [cdkConnectedOverlayOffsetY]="4"
    >
      <div [style.min-width.px]="root.triggerWidth()" class="select-content-portal">
        @if (root.contentComponent(); as contentInstance) {
          <div [class]="contentInstance.contentClass()">
            <ng-container [ngTemplateOutlet]="contentInstance.templateRef"></ng-container>
          </div>
        }
      </div>
    </ng-template>
  `,
})
export class SelectTrigger {
  root = inject(Select)
  elementRef = inject(ElementRef)
  className = input<string>('')
  size = input<'sm' | 'default'>('default')

  constructor() {
    effect(() => {
      if (this.root.isOpen()) {
        const width = this.elementRef.nativeElement.offsetWidth
        this.root.triggerWidth.set(width)
      }
    })
  }

  triggerClass = () =>
    cn(
      'border-input data-[placeholder]:text-muted-foreground flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
      this.size() === 'default' ? 'h-9' : 'h-8',
      this.className(),
    )
}

/**
 * SELECT VALUE
 */
@Component({
  selector: 'app-select-value',
  standalone: true,
  template: `
    <span class="line-clamp-1 flex items-center gap-2  whitespace-nowrap text-ellipsis">
      {{ root.value() || placeholder() }}
    </span>
  `,
})
export class SelectValue {
  root = inject(Select)
  placeholder = input<string>('')
}

/**
 * SELECT CONTENT
 */
@Component({
  selector: 'app-select-content',
  standalone: true,
  imports: [CdkListboxModule, NgIconComponent],
  providers: [
    {
      provide: SELECT_CONTENT_TOKEN,
      useExisting: SelectContent,
    },
  ],
  hostDirectives: [
    {
      directive: CdkListbox,
      inputs: ['cdkListboxValue: value'],
    },
  ],
  host: {
    '[attr.data-slot]': '"select-content"',
    '[class]': 'contentClass()',
  },
  template: `
    <ng-template #contentTemplate>
      <div class="flex cursor-default items-center justify-center py-1">
        <ng-icon name="lucideChevronUp" class="size-4"></ng-icon>
      </div>
      <div class="p-1">
        <ng-content></ng-content>
      </div>
      <div class="flex cursor-default items-center justify-center py-1">
        <ng-icon name="lucideChevronDown" class="size-4"></ng-icon>
      </div>
    </ng-template>
  `,
})
export class SelectContent {
  @ViewChild('contentTemplate', { static: true }) templateRef!: TemplateRef<any>

  root = inject(Select)
  listbox = inject(CdkListbox)
  className = input<string>('')

  constructor() {
    effect(() => {
      const val = this.root.value()
      this.listbox.value = val ? [val] : []
    })

    this.listbox.valueChange.subscribe((event) => {
      this.root.value.set(event.value[0])
      this.root.close()
    })
  }

  contentClass = () =>
    cn(
      'bg-popover text-popover-foreground relative z-50 max-h-96 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border shadow-md animate-in fade-in-0 zoom-in-95',
      this.className(),
    )
}

/**
 * SELECT ITEM
 */
@Component({
  selector: 'app-select-item',
  standalone: true,
  imports: [NgIconComponent],
  hostDirectives: [
    {
      directive: CdkOption,
      inputs: ['cdkOption: value', 'cdkOptionDisabled: disabled'],
    },
  ],
  host: {
    '[attr.data-slot]': '"select-item"',
    '[class]': 'itemClass()',
  },
  template: `
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      @if (root.value() === value()) {
        <ng-icon name="lucideCheck" class="size-4"></ng-icon>
      }
    </span>
    <ng-content></ng-content>
  `,
})
export class SelectItem {
  root = inject(Select)
  value = input.required<any>()
  disabled = input(false, { transform: booleanAttribute })
  className = input<string>('')

  itemClass = () =>
    cn(
      'focus:bg-accent focus:text-accent-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 aria-selected:bg-accent',
      this.disabled() ? 'opacity-50 pointer-events-none' : '',
      this.className(),
    )
}

@Directive({
  selector: 'app-select-separator',
  standalone: true,
  host: {
    '[class]': 'cn("bg-border pointer-events-none -mx-1 my-1 h-px block", className())',
    '[attr.data-slot]': '"select-separator"',
  },
})
export class SelectSeparator {
  className = input<string>('')
  protected readonly cn = cn
}

@Directive({
  selector: 'app-select-label',
  standalone: true,
  host: {
    '[class]': 'cn("text-muted-foreground px-2 py-1.5 text-xs font-semibold", className())',
    '[attr.data-slot]': '"select-label"',
  },
})
export class SelectLabel {
  className = input<string>('')
  protected readonly cn = cn
}

@Directive({
  selector: 'app-select-group',
  standalone: true,
  host: { '[attr.data-slot]': '"select-group"' },
})
export class SelectGroup {}

export const SELECT_COMPONENTS = [
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectGroup,
] as const
