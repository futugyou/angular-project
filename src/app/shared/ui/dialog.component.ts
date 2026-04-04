import {
  Component,
  TemplateRef,
  ViewContainerRef,
  input,
  computed,
  output,
  model,
  effect,
  viewChild,
  inject,
} from '@angular/core'
import { Overlay, OverlayModule, OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { NgIconComponent } from '@ng-icons/core'
import { ButtonDirective } from '../directives/button.directive'

@Component({
  selector: 'app-dialog-header',
  standalone: true,
  template: `<div [class]="'space-y-2 p-6 ' + class()"><ng-content /></div>`,
  styles: [
    `
      :host {
        display: block;
        flex-shrink: 0;
      }
    `,
  ],
})
export class DialogHeaderComponent {
  class = input<string>('')
}

@Component({
  selector: 'app-dialog-title',
  standalone: true,
  template: `<h2 class="text-lg font-semibold {{ class() }}"><ng-content></ng-content></h2>`,
})
export class DialogTitleComponent {
  class = input<string>('')
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
      <div [class]="containerClasses()">
        <ng-content />
      </div>
    </ng-template>
  `,
})
export class DialogComponent {
  open = model<boolean>(false)
  class = input<string>('')

  private overlay = inject(Overlay)
  private viewContainerRef = inject(ViewContainerRef)
  private contentTemplate = viewChild.required<TemplateRef<any>>('contentTemplate')
  private overlayRef?: OverlayRef

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

    this.overlayRef.backdropClick().subscribe(() => this.open.set(false))
    const portal = new TemplatePortal(this.contentTemplate(), this.viewContainerRef)
    this.overlayRef.attach(portal)
  }

  private detachOverlay() {
    this.overlayRef?.detach()
    this.overlayRef = undefined
  }
}

export const DIALOG_COMPONENTS = [
  DialogComponent,
  DialogContentComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
  DialogCloseComponent,
  DialogFooterComponent,
  DialogDescriptionComponent,
] as const
