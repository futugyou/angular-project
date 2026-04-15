import {
  Component,
  ElementRef,
  Injectable,
  input,
  output,
  signal,
  viewChild,
  type OnInit,
  DestroyRef,
  inject,
} from '@angular/core'
import { NgIconComponent } from '@ng-icons/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { timer, from, concatMap, tap, Subject, race, take } from 'rxjs'

export interface ToastData {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration: number
}

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgIconComponent],
  template: `
    <div
      #toastElement
      [class]="
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md min-w-75 transition-transform ' +
        bgColorClass()
      "
    >
      <p [class]="'text-sm flex-1 ' + textColorClass()">{{ message() }}</p>
      <button
        (click)="manualClose$.next()"
        [class]="'shrink-0 hover:opacity-70 transition-opacity ' + textColorClass()"
      >
        <ng-icon name="lucideX" class="h-4 w-4" />
      </button>
    </div>
  `,
})
export class ToastComponent implements OnInit {
  message = input.required<string>()
  type = input<'info' | 'success' | 'warning' | 'error'>('info')
  duration = input<number>(4000)
  closeToast = output<void>()

  private el = viewChild.required<ElementRef<HTMLElement>>('toastElement')
  private destroyRef = inject(DestroyRef)

  protected manualClose$ = new Subject<void>()

  ngOnInit() {
    this.playAnimation('in')

    race([timer(this.duration()), this.manualClose$])
      .pipe(
        take(1),
        takeUntilDestroyed(this.destroyRef),
        concatMap(() => from(this.playAnimation('out').finished)),
        tap(() => this.closeToast.emit()),
      )
      .subscribe()
  }

  close() {
    this.manualClose$.next()
  }

  private playAnimation(direction: 'in' | 'out') {
    const keyframes =
      direction === 'in'
        ? [
            { opacity: 0, transform: 'translateX(20px)' },
            { opacity: 1, transform: 'translateX(0)' },
          ]
        : [
            { opacity: 1, transform: 'translateX(0)' },
            { opacity: 0, transform: 'translateX(20px)' },
          ]

    return this.el().nativeElement.animate(keyframes, {
      duration: 300,
      easing: 'ease-in-out',
      fill: 'forwards',
    })
  }

  bgColorClass() {
    const classes = {
      info: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
      success: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
      warning: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
      error: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    }
    return classes[this.type()]
  }

  textColorClass() {
    const classes = {
      info: 'text-blue-800 dark:text-blue-200',
      success: 'text-green-800 dark:text-green-200',
      warning: 'text-orange-800 dark:text-orange-200',
      error: 'text-red-800 dark:text-red-200',
    }
    return classes[this.type()]
  }
}

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [ToastComponent],
  template: `
    <div class="fixed top-4 right-4 z-1000 flex flex-col gap-2 pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div class="pointer-events-auto">
          <app-toast
            [message]="toast.message"
            [type]="toast.type"
            [duration]="toast.duration"
            (closeToast)="onRemove.emit(toast.id)"
          />
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  toasts = input.required<ToastData[]>()
  onRemove = output<string>()
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSignal = signal<ToastData[]>([])
  readonly toasts = this.toastsSignal.asReadonly()

  show(message: string, type: ToastData['type'] = 'info', duration: number = 4000) {
    const id = Math.random().toString(36).substring(2, 9)
    this.toastsSignal.update((ts) => [...ts, { id, message, type, duration }])
  }

  remove(id: string) {
    this.toastsSignal.update((ts) => ts.filter((t) => t.id !== id))
  }

  success(msg: string) {
    this.show(msg, 'success')
  }
  error(msg: string) {
    this.show(msg, 'error')
  }
}
