import { Injectable, signal, computed } from '@angular/core'
import { EdgeMetadata, Graph, Node, NodeMetadata, NodeProperties } from '@antv/x6'
import { NodeUpdate } from '../lib/layout'

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

  fitView(arg0: { nodes?: Node<NodeProperties>[]; duration: number; padding: number }) {
    const graph = this.graph()
    if (!graph) return

    if (arg0.nodes) {
      graph.addNodes(arg0.nodes)
    }

    graph.resize()
    graph.zoomToFit({
      padding: arg0.padding,
      maxScale: 1,
    })
  }

  applyDagreLayout(direction: string) {
    throw new Error('Method not implemented.')
  }

  render(nodes: any, edges: any) {
    throw new Error('Method not implemented.')
  }

  convertWorkflowToX6Data(
    dump: any,
    arg1: { direction: 'TB' | 'LR'; consolidate: boolean },
  ): { nodes: any; edges: any } {
    throw new Error('Method not implemented.')
  }

  dispose() {
    throw new Error('Method not implemented.')
  }

  initGraph(nativeElement: HTMLDivElement) {
    throw new Error('Method not implemented.')
  }

  setNodesDraggable(arg0: boolean): any {
    throw new Error('Method not implemented.')
  }

  resetEdgesToDefault(consolidate: boolean) {
    throw new Error('Method not implemented.')
  }

  updateEdgesWithSequenceAnalysis(events: any[], consolidate: boolean) {
    throw new Error('Method not implemented.')
  }

  resetNodesToPending() {
    throw new Error('Method not implemented.')
  }

  updateNodesWithEvents(updates: Record<string, NodeUpdate>, streaming: boolean) {
    throw new Error('Method not implemented.')
  }

  setNodes(nodes: NodeMetadata[]) {
    throw new Error('Method not implemented.')
  }

  setEdges(edges: EdgeMetadata[]) {
    throw new Error('Method not implemented.')
  }

  isInitialized(): boolean {
    throw new Error('Method not implemented.')
  }
}
