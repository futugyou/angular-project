import { Injectable, signal, computed, OnDestroy } from '@angular/core'
import { EdgeMetadata, Graph, Node, NodeMetadata, NodeProperties, Cell, Edge } from '@antv/x6'
import { DagreLayout } from '@antv/layout'
import { NodeUpdate, WorkflowDump } from '../utils/layout'

@Injectable({
  providedIn: 'root',
})
export class GraphService implements OnDestroy {
  private graph = signal<Graph | null>(null)
  private cacheTrigger = signal<Record<string, number>>({})

  initGraph(container: HTMLDivElement): Graph {
    const graph = new Graph({
      container: container,
      autoResize: true,
      grid: { size: 10, visible: true, type: 'dot' },
      panning: { enabled: true, eventTypes: ['leftMouseDown'] },
      mousewheel: { enabled: true, modifiers: 'ctrl' },
      connecting: {
        router: 'orth',
        connector: { name: 'rounded' },
        anchor: 'center',
        connectionPoint: 'anchor',
        allowNode: false,
      },
      interacting: {
        nodeMovable: true,
      },
    })

    this.init(graph)
    return graph
  }

  init(graph: Graph) {
    this.graph.set(graph)

    const events = [
      'node:change:position',
      'node:change:size',
      'node:change:data',
      'cell:added',
      'cell:removed',
    ]
    events.forEach((event) => {
      graph.on(event, (args: any) => {
        const id = args.node?.id || args.cell?.id
        if (id) this.notify(id)
      })
    })
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

  convertWorkflowToX6Data(
    dump: WorkflowDump,
    options: { direction: 'TB' | 'LR'; consolidate: boolean },
  ): { nodes: NodeMetadata[]; edges: EdgeMetadata[] } {
    const nodes: NodeMetadata[] = dump['nodes'].map((n: any) => ({
      id: n.id,
      shape: 'custom-rect',
      width: 180,
      height: 60,
      label: n.name,
      data: { ...n, status: 'pending' },
    }))

    const edges: EdgeMetadata[] = dump['edges'].map((e: any) => ({
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      attrs: {
        line: { stroke: '#A2B1C3', strokeWidth: 2 },
      },
    }))

    return { nodes, edges }
  }

  applyDagreLayout(direction: 'TB' | 'LR' = 'TB') {
    const graph = this.graph()
    if (!graph) return

    const dagreLayout = new DagreLayout({
      type: 'dagre',
      rankdir: direction,
      nodesep: 60,
      ranksep: 80,
    })
    const nodes = graph.getNodes()
    const edges = graph.getEdges()

    const data = {
      nodes: [],
      edges: [],
    }

    nodes.forEach((node) => {
      data.nodes!.push({
        id: node.id,
        shape: node.shape,
        width: 180,
        height: 60,
        label: node.data.name,
        attrs: {
          body: {
            fill: '#5F95FF',
            stroke: 'transparent',
          },
          label: {
            fill: '#ffffff',
            textWrap: {
              text: node.data.name,
              width: -10,
              ellipsis: true,
              breakWord: false,
            },
          },
        },
      } as never)
    })

    edges.forEach((edge: any) => {
      data.edges!.push({
        source: edge.store.data.source.cell,
        target: edge.store.data.target.cell,
        attrs: {
          line: {
            stroke: '#A2B1C3',
            strokeWidth: 2,
          },
        },
      } as never)
    })

    const newCells = dagreLayout.layout(data)
    graph.fromJSON(newCells)
  }

  render(nodes: NodeMetadata[], edges: EdgeMetadata[]) {
    const graph = this.graph()
    if (!graph) return
    graph.fromJSON({ nodes, edges })
  }

  updateNodesWithEvents(updates: Record<string, NodeUpdate>, streaming: boolean) {
    const graph = this.graph()
    if (!graph) return

    graph.batchUpdate(() => {
      Object.entries(updates).forEach(([id, update]) => {
        const node = graph.getCellById(id) as Node
        if (node) {
          node.setData({ ...update, isStreaming: streaming }, { overwrite: false })

          if (update.status === 'success') {
            node.attr('body/stroke', '#52c41a')
          }
        }
      })
    })
  }

  fitView(options: { nodes?: Node[]; duration: number; padding: number }) {
    const graph = this.graph()
    if (!graph) return

    if (options.nodes && options.nodes.length > 0) {
      graph.zoomToRect(graph.getCellsBBox(options.nodes), {
        padding: options.padding,
        maxScale: 1,
      })
    } else {
      graph.zoomToFit({ padding: options.padding, maxScale: 1 })
    }
  }

  setNodesDraggable(enabled: boolean) {
    const graph = this.graph()
    if (!graph) return
    graph.getNodes().forEach((n) => n.setProp('draggable', enabled))
  }

  resetNodesToPending() {
    this.graph()
      ?.getNodes()
      .forEach((n) => n.setData({ status: 'pending' }))
  }

  isInitialized(): boolean {
    return !!this.graph()
  }

  dispose() {
    this.graph()?.dispose()
    this.graph.set(null)
  }

  ngOnDestroy() {
    this.dispose()
  }

  setNodes(nodes: NodeMetadata[]) {
    const graph = this.graph()
    if (!graph) return
    const nodeInstances = nodes.map((n) => graph.createNode(n))
    graph.resetCells([...nodeInstances, ...graph.getEdges()])
  }

  setEdges(edges: EdgeMetadata[]) {
    const graph = this.graph()
    if (!graph) return
    const edgeInstances = edges.map((e) => graph.createEdge(e))
    graph.resetCells([...graph.getNodes(), ...edgeInstances])
  }

  async setNodesAndEdges(nodes: NodeMetadata[], edges: EdgeMetadata[]) {
    const graph = this.graph()
    if (!graph) return
    const nodeInstances = nodes.map((n) => graph.createNode(n))
    const edgeInstances = edges.map((e) => graph.createEdge(e))
    graph.resetCells([...nodeInstances, ...edgeInstances])
  }

  resetEdgesToDefault(consolidate: boolean) {
    const graph = this.graph()
    if (!graph) return

    graph.getEdges().forEach((edge) => {
      edge.attr('line/stroke', '#A2B1C3')
      edge.attr('line/strokeWidth', consolidate ? 3 : 2)
      edge.attr('line/targetMarker', 'block')
      edge.setLabels([])
    })
  }

  updateEdgesWithSequenceAnalysis(events: any[], consolidate: boolean) {
    const graph = this.graph()
    if (!graph) return

    this.resetEdgesToDefault(consolidate)

    events.forEach((event, index) => {
      const edges = graph.getEdges()
      const targetEdge = edges.find(
        (e) => e.getSourceCellId() === event.fromNodeId && e.getTargetCellId() === event.toNodeId,
      )

      if (targetEdge) {
        targetEdge.attr('line/stroke', '#1890ff')
        targetEdge.attr('line/strokeWidth', consolidate ? 4 : 3)

        if (index === events.length - 1) {
          targetEdge.attr('line/style/animation', 'ant-line-dash 30s infinite linear')
        }
      }
    })
  }
}
