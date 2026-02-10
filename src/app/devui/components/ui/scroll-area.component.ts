import {
  Component,
  ElementRef,
  viewChild,
  input,
  computed,
  signal,
  afterNextRender,
  Renderer2,
  inject,
} from '@angular/core'
import { ScrollingModule } from '@angular/cdk/scrolling'
import { cn } from '../../lib/utils'

@Component({
  selector: 'app-scroll-bar',
  standalone: true,
  template: `
    <div
      #thumb
      [class]="thumbClasses()"
      [style.height.%]="thumbSize()"
      [style.transform]="thumbTransform()"
      (pointerdown)="onPointerDown($event)"
    ></div>
  `,
  host: {
    '[class]': 'hostClasses()',
  },
})
export class ScrollBar {
  private renderer = inject(Renderer2)

  orientation = input<'vertical' | 'horizontal'>('vertical')
  scrollProgress = input<number>(0)
  thumbSize = input<number>(0)
  viewportElement = input<HTMLElement | null>(null)

  thumb = viewChild<ElementRef<HTMLDivElement>>('thumb')

  hostClasses = computed(() =>
    cn(
      'absolute flex touch-none select-none transition-colors bg-black/5',
      this.orientation() === 'vertical'
        ? 'h-full w-2.5 right-0 top-0'
        : 'h-2.5 w-full bottom-0 left-0',
    ),
  )

  thumbClasses = computed(
    () => 'relative flex-1 rounded-full bg-gray-400/50 hover:bg-gray-400/80 cursor-default',
  )

  thumbTransform = computed(() => {
    const moveRange = 100 - this.thumbSize()
    const translate = (this.scrollProgress() * moveRange) / 100
    return this.orientation() === 'vertical'
      ? `translateY(${translate}%)`
      : `translateX(${translate}%)`
  })

  onPointerDown(event: PointerEvent) {
    const viewport = this.viewportElement()
    if (!viewport) return

    const startY = event.clientY
    const startScrollTop = viewport.scrollTop
    const scrollHeight = viewport.scrollHeight
    const clientHeight = viewport.clientHeight

    const ratio =
      (scrollHeight - clientHeight) / (clientHeight - (this.thumbSize() * clientHeight) / 100)

    const onPointerMove = (e: PointerEvent) => {
      const deltaY = e.clientY - startY
      viewport.scrollTop = startScrollTop + deltaY * ratio
    }

    const onPointerUp = () => {
      this.renderer.setStyle(document.body, 'user-select', 'auto')
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }

    this.renderer.setStyle(document.body, 'user-select', 'none')
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
  }
}

@Component({
  selector: 'app-scroll-area',
  standalone: true,
  imports: [ScrollingModule, ScrollBar],
  template: `
    <div
      cdkScrollable
      #viewport
      class="h-full w-full rounded-[inherit] overflow-auto scrollbar-hide"
      (scroll)="updateMetrics()"
    >
      <ng-content></ng-content>
    </div>

    @if (showVBar()) {
      <app-scroll-bar
        [viewportElement]="viewportRef()?.nativeElement || null"
        [thumbSize]="vThumbSize()"
        [scrollProgress]="vProgress()"
      />
    }
  `,
  host: { '[class]': 'rootClasses()' },
})
export class ScrollArea {
  className = input<string>('')
  viewportRef = viewChild<ElementRef<HTMLElement>>('viewport')

  vProgress = signal(0)
  vThumbSize = signal(0)
  showVBar = signal(false)

  rootClasses = computed(() => cn('relative overflow-hidden group', this.className()))

  constructor() {
    afterNextRender(() => this.updateMetrics())
  }

  updateMetrics() {
    const el = this.viewportRef()?.nativeElement
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    this.showVBar.set(scrollHeight > clientHeight)
    this.vThumbSize.set(Math.max((clientHeight / scrollHeight) * 100, 10))
    this.vProgress.set((scrollTop / (scrollHeight - clientHeight)) * 100 || 0)
  }
}
// usage
// <app-scroll-area class="h-[200px] w-[350px] border rounded-md">
//   <div class="p-4">
//     <h4 class="mb-4 text-sm font-medium leading-none">Tags</h4>
//     @for (tag of tags; track tag) {
//       <div class="text-sm">
//         {{ tag }}
//         <hr class="my-2" />
//       </div>
//     }
//   </div>
// </app-scroll-area>
