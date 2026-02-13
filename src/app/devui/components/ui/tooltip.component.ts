import {
  Component,
  Directive,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
  ViewContainerRef,
  TemplateRef,
  ViewEncapsulation,
  type OnDestroy,
} from '@angular/core'
import { Overlay, OverlayRef } from '@angular/cdk/overlay'
import { TemplatePortal } from '@angular/cdk/portal'
import { NgIconComponent } from '@ng-icons/core'

@Component({
  selector: 'app-tooltip-content',
  standalone: true,
  template: `
    <ng-template #contentTemplate>
      <div
        [class]="fullClass()"
        (mouseenter)="isHovered.set(true)"
        (mouseleave)="isHovered.set(false)"
      >
        <ng-content />
      </div>
    </ng-template>
  `,
  styles: `
    .tooltip-content {
      z-index: 50;
      border-radius: 0.375rem;
      background-color: #18181b;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      color: #fafafa;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      animation: tooltip-fade-in 150ms ease-out;
    }
    @keyframes tooltip-fade-in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
  `,
  encapsulation: ViewEncapsulation.None,
})
export class TooltipContent {
  className = input<string>('')
  contentTemplate = viewChild.required<TemplateRef<any>>('contentTemplate')
  isHovered = signal(false)
  fullClass = () => `tooltip-content ${this.className()}`
}

@Directive({
  selector: '[appTooltip]',
  standalone: true,
  host: {
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focus)': 'onMouseEnter()',
    '(blur)': 'onMouseLeave()',
  },
})
export class TooltipDirective implements OnDestroy {
  private overlay = inject(Overlay)
  private elementRef = inject(ElementRef)
  private viewContainerRef = inject(ViewContainerRef)

  content = input.required<TooltipContent>({ alias: 'appTooltip' })
  sideOffset = input<number>(4)
  showDelay = input<number>(200)

  isOpen = signal(false)
  private overlayRef: OverlayRef | null = null
  private delayTimeout?: any

  onMouseEnter() {
    this.delayTimeout = setTimeout(() => this.open(), this.showDelay())
  }

  onMouseLeave() {
    clearTimeout(this.delayTimeout)
    setTimeout(() => {
      if (!this.content().isHovered()) this.close()
    }, 100)
  }

  private open() {
    if (this.overlayRef?.hasAttached()) return

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([
        {
          originX: 'center',
          originY: 'top',
          overlayX: 'center',
          overlayY: 'bottom',
          offsetY: -this.sideOffset(),
        },
        {
          originX: 'center',
          originY: 'bottom',
          overlayX: 'center',
          overlayY: 'top',
          offsetY: this.sideOffset(),
        },
      ])

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    })

    const portal = new TemplatePortal(this.content().contentTemplate(), this.viewContainerRef)
    this.overlayRef.attach(portal)
    this.isOpen.set(true)
  }

  private close() {
    if (this.overlayRef) {
      this.overlayRef.detach()
      this.isOpen.set(false)
    }
  }

  ngOnDestroy() {
    this.overlayRef?.dispose()
    clearTimeout(this.delayTimeout)
  }
}

/**
 * 3. usage
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TooltipDirective, TooltipContent, NgIconComponent],
  template: `
    <div style="padding: 100px;">
      <button [appTooltip]="tooltipInfo" class="trigger-btn">
        <ng-icon name="lucideInfo" />
        Hover Me
      </button>

      <app-tooltip-content #tooltipInfo>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>Tooltip</span>
          <ng-icon name="lucideCheckCircle" />
        </div>
      </app-tooltip-content>
    </div>
  `,
  styles: `
    .trigger-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px solid #ccc;
      border-radius: 6px;
      background: white;
      cursor: pointer;
    }
  `,
})
export class App {}
