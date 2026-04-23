import {
  signal,
  input,
  model,
  Component,
  inject,
  ViewContainerRef,
  viewChild,
  TemplateRef,
  effect,
  computed,
  output,
} from '@angular/core'
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonDirective } from '../../directives/button.directive'
import { cn } from '../../utils/utils'

@Component({
  selector: 'app-dialog-header',
  standalone: true,
  template: `<ng-content />`,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
      }
    `,
  ],
  host: {
    '[class]': 'computedClasses()',
  },
})
export class DialogHeaderComponent {
  className = input<string>('', { alias: 'class' })
  computedClasses = computed(() => cn('space-y-2 p-6', this.className()))
}

@Component({
  selector: 'app-dialog-title',
  standalone: true,
  template: `<h2 class="{{ computedClasses() }}"><ng-content></ng-content></h2>`,
})
export class DialogTitleComponent {
  className = input<string>('', { alias: 'class' })
  computedClasses = computed(() => cn('text-lg font-semibold', this.className()))
}

@Component({
  selector: 'app-dialog-description',
  standalone: true,
  template: `<p class="text-sm text-muted-foreground {{ class() }}"><ng-content></ng-content></p>`,
})
export class DialogDescriptionComponent {
  class = input<string>('')
}

@Component({
  selector: 'app-dialog-footer',
  standalone: true,
  template: `
    <div class="flex justify-end gap-2 p-4 border-t bg-muted/50">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
      }
    `,
  ],
})
export class DialogFooterComponent {}

@Component({
  selector: 'app-dialog-close',
  standalone: true,
  imports: [ButtonDirective, NgIconComponent],
  template: `
    <button
      appButton="ghost"
      size="sm"
      (click)="close.emit()"
      class="absolute top-4 right-4 h-8 w-8 p-0 rounded-sm opacity-70 hover:opacity-100"
    >
      <ng-icon name="lucideX" class="h-4 w-4"></ng-icon>
      <span class="sr-only">Close</span>
    </button>
  `,
})
export class DialogCloseComponent {
  close = output<void>()
}

@Component({
  selector: 'app-dialog-content',
  standalone: true,
  template: `
    <div [class]="'h-full overflow-y-auto p-6 ' + class()">
      <ng-content />
    </div>
  `,
  styles: [
    `
      :host {
        flex: 1 1 auto;
        min-height: 0;
        display: block;
      }
    `,
  ],
})
export class DialogContentComponent {
  class = input<string>('')
}

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [OverlayModule],
  template: `
    <ng-template #contentTemplate>
      <div [class]="containerClasses()" [class.animate-shake]="shake()">
        <ng-content />
      </div>
    </ng-template>
  `,
  styles: [
    `
      .animate-shake {
        animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
      }
      @keyframes shake {
        10%,
        90% {
          transform: translate3d(-1px, 0, 0);
        }
        20%,
        80% {
          transform: translate3d(2px, 0, 0);
        }
        30%,
        50%,
        70% {
          transform: translate3d(-4px, 0, 0);
        }
        40%,
        60% {
          transform: translate3d(4px, 0, 0);
        }
      }
    `,
  ],
})
export class DialogComponent {
  open = model<boolean>(false)
  class = input<string>('')
  isModal = input<boolean>(false)

  private overlay = inject(Overlay)
  private viewContainerRef = inject(ViewContainerRef)
  private contentTemplate = viewChild.required<TemplateRef<any>>('contentTemplate')
  private overlayRef?: OverlayRef
  protected shake = signal(false)

  containerClasses = computed(() => {
    const customClass = this.class()
    const hasWidth = /w-|max-w-/.test(customClass)
    const hasHeight = /h-|min-h-/.test(customClass)

    const widthClasses = hasWidth ? '' : 'w-[95vw] sm:max-w-lg md:max-w-3xl lg:max-w-5xl'
    const heightClasses = hasHeight ? '' : 'min-h-[40vh] md:min-h-[60vh] max-h-[90vh]'

    return `relative bg-background border rounded-lg shadow-lg overflow-hidden flex flex-col ${widthClasses} ${heightClasses} ${customClass}`
  })

  constructor() {
    effect(() => {
      this.open() ? this.attachOverlay() : this.detachOverlay()
    })
  }

  private attachOverlay() {
    if (this.overlayRef) return
    this.overlayRef = this.overlay.create({
      hasBackdrop: true,
      backdropClass: 'bg-black/50',
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      scrollStrategy: this.overlay.scrollStrategies.block(),
    })

    this.overlayRef.backdropClick().subscribe(() => {
      if (this.isModal()) {
        this.triggerShake()
      } else {
        this.open.set(false)
      }
    })

    this.overlayRef.keydownEvents().subscribe((event) => {
      if (event.key === 'Escape') {
        if (this.isModal()) {
          this.triggerShake()
        } else {
          this.open.set(false)
        }
      }
    })

    const portal = new TemplatePortal(this.contentTemplate(), this.viewContainerRef)
    this.overlayRef.attach(portal)
  }

  private triggerShake() {
    this.shake.set(true)
    setTimeout(() => this.shake.set(false), 400)
  }

  private detachOverlay() {
    this.overlayRef?.detach()
    this.overlayRef = undefined
  }
}
