// scroll-area.component.spec.ts
import { render, screen, fireEvent } from '@testing-library/angular'
import { ScrollAreaComponent } from './scroll-area.component'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { By } from '@angular/platform-browser'

describe('ScrollAreaComponent Integration', () => {
  beforeEach(() => {
    global.ResizeObserver = vi.fn().mockImplementation(function () {
      return {
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: vi.fn(),
      }
    })

    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = function () {}
      Element.prototype.releasePointerCapture = function () {}
    }
  })

  it('should display the scrollbar when content height exceeds the container height', async () => {
    const { fixture } = await render(
      `
<app-scroll-area height="200px">
<div style="height: 1000px">Long Content</div>
</app-scroll-area>
`,
      {
        imports: [ScrollAreaComponent],
      },
    )
    const debugElement = fixture.debugElement.query(By.directive(ScrollAreaComponent))
    const componentInstance = debugElement.componentInstance
    const viewport = debugElement.nativeElement.querySelector('.viewport-container')
    // Manually simulate scroll dimensions
    Object.defineProperty(viewport, 'scrollHeight', { value: 1000 })
    Object.defineProperty(viewport, 'clientHeight', { value: 200 })

    componentInstance.updateMetrics()
    fixture.detectChanges()

    // Simulate mouse entry to trigger display
    fireEvent.mouseEnter(fixture.nativeElement)
    fixture.detectChanges()

    const scrollBar = fixture.nativeElement.querySelector('app-scroll-bar')
    expect(scrollBar).toBeTruthy()
  })

  it("clicking and dragging the thumb should update the viewport's scrollTop", async () => {
    const { fixture } = await render(
      `
<app-scroll-area height="200px">
<div style="height: 1000px">Long Content</div>
</app-scroll-area>
`,
      {
        imports: [ScrollAreaComponent],
      },
    )
    const debugElement = fixture.debugElement.query(By.directive(ScrollAreaComponent))
    const viewport = debugElement.nativeElement.querySelector('.viewport-container') as HTMLElement

    // 3. Simulate layout properties missing in JSDOM
    Object.defineProperty(viewport, 'scrollHeight', { value: 1000, configurable: true })
    Object.defineProperty(viewport, 'clientHeight', { value: 200, configurable: true })
    Object.defineProperty(viewport, 'offsetHeight', { value: 200, configurable: true })

    // Manually intercept the scrollTop assignment, as JSDOM does not update it automatically
    let capturedScrollTop = 0
    Object.defineProperty(viewport, 'scrollTop', {
      get: () => capturedScrollTop,
      set: (val) => (capturedScrollTop = val),
      configurable: true,
    })

    // Initialize component state
    debugElement.componentInstance.updateMetrics()
    fixture.detectChanges()

    // 4. Simulate interaction
    fireEvent.mouseEnter(debugElement.nativeElement) // Show scrollbar
    fixture.detectChanges()

    const thumb = debugElement.nativeElement.querySelector('.thumb-el')
    const track = debugElement.nativeElement.querySelector('app-scroll-bar')

    // Mock the track's height (el.nativeElement.offsetHeight is used internally by the component)
    Object.defineProperty(track, 'offsetHeight', { value: 200, configurable: true })
    // Mock the thumb's height
    Object.defineProperty(thumb, 'offsetHeight', { value: 40, configurable: true })

    // Get thumb position and press down
    const thumbRect = { top: 0, left: 0, height: 40 }
    thumb.getBoundingClientRect = vi.fn(() => thumbRect as DOMRect)

    fireEvent.pointerDown(thumb, { clientY: 10, pointerId: 1 })

    // 5. Simulate sliding: Move down by 50px
    // Logic: targetThumbTop = 50 - 0 - 10 = 40px
    // scrollPercent = 40 / (200 - 40) = 0.25
    // scrollTop = 0.25 * (1000 - 200) = 200px
    const moveEvent = new PointerEvent('pointermove', {
      clientY: 50,
      bubbles: true,
      pointerId: 1,
    })
    window.dispatchEvent(moveEvent)

    expect(viewport.scrollTop).toBeGreaterThan(0)
    expect(viewport.scrollTop).toBe(200)
  })
})
