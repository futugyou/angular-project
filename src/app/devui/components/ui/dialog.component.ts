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
import { ButtonDirective } from '../../directives/button.directive'

@Component({
  selector: 'app-dialog-header',
  standalone: true,
  template: `<div [class]="'space-y-2 p-6 ' + class()"><ng-content /></div>`,
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
  template: `<div class="flex justify-end gap-2 p-4 border-t bg-muted/50">
    <ng-content></ng-content>
  </div>`,
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
    <div [class]="containerClasses()">
      <ng-content />
    </div>
  `,
})
export class DialogContentComponent {
  class = input<string>('')

  containerClasses = computed(() => {
    const customClass = this.class()
    const hasWidth = /w-\[|w-full|max-w-/.test(customClass)
    const defaultWidth = hasWidth ? '' : 'max-w-lg w-full'
    return `relative bg-background border rounded-lg shadow-lg max-h-[90vh] overflow-hidden ${defaultWidth} ${customClass}`
  })
}
// usage
// <button (click)="showModal.set(true)">open</button>

// <app-dialog [(open)]="showModal">
//   <app-dialog-content>
//     <app-dialog-header>
//       <app-dialog-title>title</app-dialog-title>
//       <app-dialog-close (close)="showModal.set(false)" />
//     </app-dialog-header>

//     <div class="p-6 text-sm text-muted-foreground">
//       content
//     </div>

//     <app-dialog-footer>
//       <button appButton variant="outline" (click)="showModal.set(false)">cancel</button>
//       <button appButton (click)="handleSave()">save</button>
//     </app-dialog-footer>
//   </app-dialog-content>
// </app-dialog>
@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [OverlayModule],
  template: `
    <ng-template #contentTemplate>
      <ng-content />
    </ng-template>
  `,
})
export class DialogComponent {
  open = model<boolean>(false)

  private overlay = inject(Overlay)
  private viewContainerRef = inject(ViewContainerRef)
  private contentTemplate = viewChild.required<TemplateRef<any>>('contentTemplate')
  private overlayRef?: OverlayRef

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
