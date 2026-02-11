import {
  Component,
  ElementRef,
  Injectable,
  Injector,
  inject,
  input,
  output,
  signal,
  viewChild,
  type OnInit,
} from '@angular/core'
import { Overlay, OverlayRef } from '@angular/cdk/overlay'
import { ComponentPortal } from '@angular/cdk/portal'
import { NgIconComponent, provideIcons } from '@ng-icons/core'
import { lucideX } from '@ng-icons/lucide'

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
  providers: [provideIcons({ lucideX })],
  template: `
    <div
      #toastElement
      [class]="
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-md min-w-[300px] transition-transform ' +
        bgColorClass()
      "
    >
      <p [class]="'text-sm flex-1 ' + textColorClass()">{{ message() }}</p>
      <button
        (click)="close()"
        [class]="'flex-shrink-0 hover:opacity-70 transition-opacity ' + textColorClass()"
      >
        <ng-icon name="lucideX" class="h-4 w-4" />
      </button>
    </div>
  `,
})
export class Toast implements OnInit {
  message = input.required<string>()
  type = input<'info' | 'success' | 'warning' | 'error'>('info')
  duration = input<number>(4000)
  closeToast = output<void>()

  private el = viewChild.required<ElementRef<HTMLElement>>('toastElement')

  ngOnInit() {
    this.playAnimation([
      { opacity: 0, transform: 'translateX(20px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ])

    setTimeout(() => this.close(), this.duration())
  }

  async close() {
    const animation = this.playAnimation([
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: 'translateX(20px)' },
    ])

    await animation.finished
    this.closeToast.emit()
  }

  private playAnimation(keyframes: Keyframe[]) {
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
  imports: [Toast],
  template: `
    <div class="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
      @for (toast of toasts(); track toast.id) {
        <div class="pointer-events-auto">
          <app-toast
            [message]="toast.message"
            [type]="toast.type"
            [duration]="toast.duration"
            (closeToast)="onRemove(toast.id)"
          />
        </div>
      }
    </div>
  `,
})
export class ToastContainer {
  toasts = signal<ToastData[]>([])

  onRemove(id: string) {
    this.toasts.update((current) => current.filter((t) => t.id !== id))
  }

  add(toast: ToastData) {
    this.toasts.update((current) => [...current, toast])
  }
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private overlay = inject(Overlay)
  private injector = inject(Injector)
  private overlayRef?: OverlayRef
  private containerRef?: ToastContainer

  private createContainer() {
    if (this.overlayRef) return this.containerRef!

    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().global().top('0').right('0'),
      scrollStrategy: this.overlay.scrollStrategies.noop(),
      hasBackdrop: false,
    })

    const containerPortal = new ComponentPortal(ToastContainer, null, this.injector)
    const componentRef = this.overlayRef.attach(containerPortal)
    this.containerRef = componentRef.instance

    return this.containerRef
  }

  show(message: string, type: ToastData['type'] = 'info', duration: number = 4000) {
    const container = this.createContainer()
    const id = Math.random().toString(36).substring(2, 9)
    container.add({ id, message, type, duration })
  }

  success(message: string) {
    this.show(message, 'success')
  }
  error(message: string) {
    this.show(message, 'error')
  }
  warning(message: string) {
    this.show(message, 'warning')
  }
}
