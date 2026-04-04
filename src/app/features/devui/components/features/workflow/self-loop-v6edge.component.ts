import { Component, computed, inject, input } from '@angular/core'
import { GraphService } from '../../../services/v6node-graph.service'

@Component({
  selector: 'app-self-loop-edge',
  standalone: true,
  template: `
    @if (pathData(); as p) {
      <svg class="absolute overflow-visible pointer-events-none" style="width: 1px; height: 1px;">
        <path
          [attr.d]="p.path"
          [style]="style()"
          [attr.marker-end]="markerEnd() ? 'url(#' + markerEnd() + ')' : null"
          fill="none"
          stroke="#b1b1b7"
          stroke-width="2"
        />
      </svg>
    }
  `,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class SelfLoopEdgeComponent {
  private graphService = inject(GraphService)

  // Inputs using Signal API
  id = input.required<string>()
  source = input.required<string>()
  markerEnd = input<string>()
  style = input<Partial<CSSStyleDeclaration>>({})

  private node = computed(() => {
    const sourceId = this.source()
    const nodeSignal = this.graphService.useNode(sourceId)
    return nodeSignal()
  })

  pathData = computed(() => {
    const n = this.node()
    if (!n) return null

    const { x, y } = n.position()
    const { width, height } = n.size()
    const data = n.getData() as any
    const isVertical = data?.layoutDirection === 'TB'

    const loopOffset = 100
    const riseOffset = 40

    let path = ''
    if (isVertical) {
      const startX = x + width / 2
      const startY = y + height
      const cpX = x + width + loopOffset
      path = `M ${startX} ${startY} C ${startX} ${startY + riseOffset}, ${cpX} ${startY + riseOffset}, ${cpX} ${y + height / 2} C ${cpX} ${y - riseOffset}, ${startX} ${y - riseOffset}, ${startX} ${y}`
    } else {
      const startX = x + width
      const startY = y + height / 2
      const cpY = y + height + loopOffset
      path = `M ${startX} ${startY} C ${startX + riseOffset} ${startY}, ${startX + riseOffset} ${cpY}, ${x + width / 2} ${cpY} C ${x - riseOffset} ${cpY}, ${x - riseOffset} ${startY}, ${x} ${startY}`
    }

    return { path }
  })
}
