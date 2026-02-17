import { Component, computed, input } from '@angular/core'

export interface SelfLoopEdgeProps {
  id: string
  source: string
  markerEnd?: string
  data?: {
    layoutDirection?: 'TB' | 'LR'
  }
}

@Component({
  selector: 'svg[app-self-loop-edge]',
  standalone: true,
  template: `
    @if (edgePath(); as path) {
      <svg:g class="xyflow__edge">
        <svg:path
          [id]="id()"
          [attr.d]="path"
          [attr.marker-end]="markerEnd()"
          [style]="style()"
          class="xyflow__edge-path"
          fill="none"
          stroke="#b1b1b7"
          stroke-width="2"
        />
      </svg:g>
    }
  `,
})
export class SelfLoopEdgeComponent {
  id = input.required<string>()
  source = input.required<string>()
  sourceNode = input.required<any>()
  markerEnd = input<string>()
  style = input<Partial<CSSStyleDeclaration>>()
  data = input<SelfLoopEdgeProps['data']>()

  edgePath = computed(() => {
    const node = this.sourceNode()

    if (!node || !node.measured?.width || !node.measured?.height) {
      return null
    }

    const { width, height } = node.measured
    const { x, y } = node.position

    const isVertical = this.data()?.layoutDirection === 'TB'

    const loopOffset = 100
    const riseOffset = 40

    if (isVertical) {
      const startX = x + width / 2
      const startY = y + height
      const endX = x + width / 2
      const endY = y
      const cpX = x + width + loopOffset

      return `M ${startX} ${startY} 
              C ${startX} ${startY + riseOffset}, ${cpX} ${startY + riseOffset}, ${cpX} ${y + height / 2} 
              C ${cpX} ${endY - riseOffset}, ${endX} ${endY - riseOffset}, ${endX} ${endY}`
    } else {
      const startX = x + width
      const startY = y + height / 2
      const endX = x
      const endY = y + height / 2
      const cpY = y + height + loopOffset

      return `M ${startX} ${startY} 
              C ${startX + riseOffset} ${startY}, ${startX + riseOffset} ${cpY}, ${x + width / 2} ${cpY} 
              C ${endX - riseOffset} ${cpY}, ${endX - riseOffset} ${endY}, ${endX} ${endY}`
    }
  })
}
