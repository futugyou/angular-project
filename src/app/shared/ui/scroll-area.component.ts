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
import { cn } from '../utils/utils'

@Component({
  selector: 'app-scroll-bar',
  standalone: true,
  template: `
    <div class="track-bg">
      <div
        #thumb
        class="thumb-el"
        [style.height.%]="thumbSize()"
        [style.transform]="thumbTransform()"
        (pointerdown)="onPointerDown($event)"
      ></div>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
        right: 0;
        top: 0;
        height: 100%;
        width: 12px;
        z-index: 1000;
        opacity: 0;
        visibility: hidden;
        transition: opacity 1s ease;
        pointer-events: none;
      }
      :host.show {
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }
      .track-bg {
        position: relative;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.05);
      }
      .thumb-el {
        position: absolute;
        width: 100%;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 10px;
        cursor: pointer;
        top: 0;
        left: 0;
        will-change: transform;
      }
    `,
  ],
  host: {
    '[class.show]': 'isVisible() || isDragging()',
  },
})
export class ScrollBarComponent {
  private renderer = inject(Renderer2)
  private el = inject(ElementRef)

  isVisible = input<boolean>(false)
  orientation = input<'vertical' | 'horizontal'>('vertical')
  scrollProgress = input<number>(0)
  thumbSize = input<number>(0)
  viewportElement = input<HTMLElement | null>(null)

  thumb = viewChild<ElementRef<HTMLDivElement>>('thumb')
  isDragging = signal(false)

  hostClasses = computed(() =>
    cn(
      'absolute flex touch-none select-none transition-colors bg-black/5 z-50',
      this.orientation() === 'vertical'
        ? 'h-full w-2.5 right-0 top-0'
        : 'h-2.5 w-full bottom-0 left-0',
    ),
  )

  thumbClasses = computed(
    () =>
      'relative w-full rounded-full bg-gray-400/50 hover:bg-gray-400/80 cursor-default transition-colors',
  )

  thumbTransform = computed(() => {
    const moveRange = (100 / this.thumbSize()) * (100 - this.thumbSize())
    const translate = (this.scrollProgress() * moveRange) / 100
    return `translateY(${translate}%)`
  })

  onPointerDown(event: PointerEvent) {
    event.stopPropagation()
    const viewport = this.viewportElement()
    const thumbEl = this.thumb()?.nativeElement
    const trackRect = this.el.nativeElement.getBoundingClientRect()

    if (!viewport || !thumbEl) return

    thumbEl.setPointerCapture(event.pointerId)
    this.isDragging.set(true)
    const thumbRect = thumbEl.getBoundingClientRect()
    const clickOffsetY = event.clientY - thumbRect.top

    const onPointerMove = (e: PointerEvent) => {
      const maxScrollTop = viewport.scrollHeight - viewport.clientHeight
      const currentTrackHeight = this.el.nativeElement.offsetHeight
      const currentThumbHeight = thumbEl.offsetHeight
      const maxThumbTravel = currentTrackHeight - currentThumbHeight

      let targetThumbTop = e.clientY - trackRect.top - clickOffsetY
      targetThumbTop = Math.max(0, Math.min(targetThumbTop, maxThumbTravel))

      const scrollPercent = targetThumbTop / maxThumbTravel
      viewport.scrollTop = scrollPercent * maxScrollTop
    }

    const onPointerUp = (e: PointerEvent) => {
      thumbEl.releasePointerCapture(e.pointerId)
      this.isDragging.set(false)
      this.renderer.removeStyle(document.body, 'user-select')
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
  imports: [ScrollingModule, ScrollBarComponent],
  template: `
    <div
      #viewport
      class="viewport-container"
      (scroll)="updateMetrics()"
      style="width: 100%; height: 100%; overflow: auto; scrollbar-width: none;"
    >
      <ng-content></ng-content>
    </div>

    @if (showVBar()) {
      <app-scroll-bar
        [isVisible]="shouldDisplayBar()"
        [viewportElement]="viewport"
        [thumbSize]="vThumbSize()"
        [scrollProgress]="vProgress()"
      />
    }
  `,
  host: {
    '(mouseenter)': 'isHovered.set(true)',
    '(mouseleave)': 'isHovered.set(false)',
    '[style.height]': 'height()',
    class: 'relative block w-full overflow-hidden',
  },
  styles: [
    `
      .viewport-container::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
})
export class ScrollAreaComponent {
  height = input<string>()
  className = input<string>('')
  viewportRef = viewChild<ElementRef<HTMLElement>>('viewport')

  vProgress = signal(0)
  vThumbSize = signal(0)
  showVBar = signal(false)
  isHovered = signal(false)

  rootClasses = computed(() => cn('relative overflow-hidden group', this.className()))
  shouldDisplayBar = computed(() => this.showVBar() && this.isHovered())

  constructor() {
    afterNextRender(() => {
      this.updateMetrics()

      const el = this.viewportRef()?.nativeElement
      if (el) {
        const ro = new ResizeObserver(() => this.updateMetrics())
        ro.observe(el)
      }
    })
  }

  updateMetrics() {
    const el = this.viewportRef()?.nativeElement
    if (!el) return

    const { scrollTop, scrollHeight, clientHeight } = el
    this.showVBar.set(scrollHeight > clientHeight + 1)
    const size = Math.max((clientHeight / scrollHeight) * 100, 10)
    this.vThumbSize.set(size)
    const progress = (scrollTop / (scrollHeight - clientHeight)) * 100
    this.vProgress.set(progress || 0)
  }
}
