import { Injectable, signal, computed } from '@angular/core'
import { Graph, Node } from '@antv/x6'

@Injectable()
export class GraphService {
  private graph = signal<Graph | null>(null)
  private cacheTrigger = signal<Record<string, number>>({})

  init(graph: Graph) {
    this.graph.set(graph)

    graph.on('node:change:position', ({ node }) => this.notify(node.id))
    graph.on('node:change:size', ({ node }) => this.notify(node.id))
    graph.on('node:change:data', ({ node }) => this.notify(node.id))
  }

  private notify(id: string) {
    this.cacheTrigger.update((v) => ({ ...v, [id]: (v[id] || 0) + 1 }))
  }

  useNode(id: string) {
    return computed(() => {
      this.cacheTrigger()[id]
      return this.graph()?.getCellById(id) as Node | undefined
    })
  }
}
