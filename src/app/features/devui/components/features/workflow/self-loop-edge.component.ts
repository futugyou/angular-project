import { Component, computed, input, effect, signal } from '@angular/core'

export interface Edge {
  id: string
  source: string
  markerEnd?: string
  style?: Partial<CSSStyleDeclaration>
}

export interface Node {
  id: string
  x: number
  y: number
  width: number
  height: number
  data?: any
}

@Component({
  selector: 'app-self-loop-edge',
  standalone: true,
  template: `
    @if (path()) {
      <svg:g>
        <svg:path
          [attr.id]="id()"
          [attr.d]="path()"
          [attr.marker-end]="markerEnd()"
          [attr.style]="styleString()"
          fill="none"
        />
      </svg:g>
    }
  `,
})
export class SelfLoopEdgeComponent {
  readonly id = input.required<string>()
  readonly source = input.required<string>()
  readonly markerEnd = input<string | undefined>()
  readonly style = input<Partial<CSSStyleDeclaration> | undefined>()

  readonly nodes = input<Node[] | undefined>()

  readonly path = computed(() => {
    const id = this.source()
    const nodes = this.nodes()
    if (!id || !nodes) return null

    const node = nodes.find((n) => n.id === id)
    if (!node) return null

    const { x, y, width, height, data } = node
    if (width <= 0 || height <= 0) return null

    const isVertical = data?.layoutDirection === 'TB'
    const loopOffset = 100
    const riseOffset = 40

    if (isVertical) {
      const startX = x + width / 2
      const startY = y + height
      const endX = x + width / 2
      const endY = y
      const cpX = x + width + loopOffset
      return `
        M ${startX} ${startY}
        C ${startX} ${startY + riseOffset}, ${cpX} ${startY + riseOffset}, ${cpX} ${y + height / 2}
        C ${cpX} ${endY - riseOffset}, ${endX} ${endY - riseOffset}, ${endX} ${endY}
      `
    } else {
      const startX = x + width
      const startY = y + height / 2
      const endX = x
      const endY = y + height / 2
      const cpY = y + height + loopOffset
      return `
        M ${startX} ${startY}
        C ${startX + riseOffset} ${startY}, ${startX + riseOffset} ${cpY}, ${x + width / 2} ${cpY}
        C ${endX - riseOffset} ${cpY}, ${endX - riseOffset} ${endY}, ${endX} ${endY}
      `
    }
  })

  readonly styleString = computed(() => {
    const s = this.style() ?? {}
    return Object.entries(s)
      .map(([k, v]) => `${k}:${v}`)
      .join(';')
  })
}

// usage example (in parent component template):
// <svg:g>
//   <app-self-loop-edge
//     *ngFor="let e of edges"
//     [id]="e.id"
//     [source]="e.source"
//     [markerEnd]="e.markerEnd"
//     [style]="e.style"
//     [nodes]="nodes"
//   />
// </svg:g>
