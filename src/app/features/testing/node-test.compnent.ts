import { AfterViewInit, Component, ElementRef, Injector, signal, ViewChild } from '@angular/core'
import { CommonModule } from '@angular/common'
import { NgIconsModule } from '@ng-icons/core'
import {
  ExecutorNodeComponent,
  ExecutorState,
} from '../devui/components/features/workflow/executor-v6node.component'
import { ResponseInputContent } from '../devui/types/agent-framework'
import { selfLoopConnector } from '../devui/components/features/workflow/self-loop-connector'
import { selfLoopRouter } from '../devui/components/features/workflow/self-loop-router'
import { Graph, Node, Edge } from '@antv/x6'
import { register } from '@antv/x6-angular-shape'
import { DagreLayout } from '@antv/layout'

@Component({
  selector: 'app-node-test',
  standalone: true,
  imports: [CommonModule, NgIconsModule],
  template: `
    <h1 class="text-2xl font-bold mb-6 text-gray-800">Workflow Node Component Test</h1>

    <div class="flex gap-2 bg-white p-2 rounded-lg shadow-sm border">
      <span class="text-sm self-center mr-2 font-medium">Chnage state:</span>
      <button
        (click)="updateWorkflowState('pending')"
        class="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs"
      >
        Pending
      </button>
      <button
        (click)="updateWorkflowState('running')"
        class="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs"
      >
        Running
      </button>
      <button
        (click)="updateWorkflowState('completed')"
        class="px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded text-xs"
      >
        Completed
      </button>
      <button
        (click)="updateWorkflowState('failed')"
        class="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs"
      >
        Failed
      </button>
      <button
        (click)="toggleWorkflowOutput()"
        class="px-3 py-1 bg-red-100 hover:bg-yellow-200 text-yellow-700 rounded text-xs"
      >
        Output
      </button>
    </div>
    <div class="graph-container">
      <div id="container" #container></div>
    </div>
  `,
})
export class NodeTestComponent implements AfterViewInit {
  // workflow node
  private graph: Graph | undefined
  private testNode?: Node

  constructor(private injector: Injector) {}

  @ViewChild('container') container: ElementRef | undefined
  ngAfterViewInit(): void {
    this.graph = new Graph({
      container: this.container!.nativeElement,
      width: 1000,
      height: 600,
      grid: true,
      mousewheel: true,
      background: {
        color: '#F2F7FA',
      },
      connecting: {
        anchor: 'nodeCenter',
        connectionPoint: 'anchor',
      },
    })

    this.container!.nativeElement.addEventListener('node-resize-request', (e: any) => {
      const { height } = e.detail
      const view = this.graph!.findViewByElem(e.target)
      if (view && view.cell.isNode()) {
        const node = view.cell

        const { width } = node.size()
        node.resize(width, height, { direction: 'bottom' })
      }
    })
    // Graph.registerConnector('self-loop-connector', selfLoopConnector, true)
    // Graph.registerEdge('self-loop-edge', {
    //   inherit: 'edge',
    //   connector: { name: 'self-loop-connector' },
    //   attrs: {
    //     line: {
    //       stroke: '#b1b1b7',
    //       strokeWidth: 2,
    //       targetMarker: {
    //         name: 'block',
    //         width: 10,
    //         height: 8,
    //       },
    //     },
    //   },
    // })

    Graph.registerRouter('self-loop-router', selfLoopRouter, true)
    if (!Edge.registry.exist('self-loop-edge')) {
      Graph.registerEdge('self-loop-edge', {
        inherit: 'edge',
        router: {
          name: 'self-loop-router',
        },
        connector: {
          name: 'smooth',
          args: { radius: 20 },
        },
        attrs: {
          line: {
            stroke: '#b1b1b7',
            strokeWidth: 2,
            targetMarker: {
              name: 'block',
              width: 10,
              height: 8,
            },
          },
        },
      })
    }

    register({
      shape: 'custom-angular-template-node',
      content: ExecutorNodeComponent,
      injector: this.injector,
      width: 256,
      height: 68,
    })

    this.testNode = this.graph.addNode({
      id: 'node-a',
      shape: 'custom-angular-template-node',
      // x: 100,
      // y: 100,
      data: {
        ngArguments: {
          value: {
            executorId: 'exec-88294-v5',
            executorType: 'llm-inference-node',
            name: 'GPT-4 Summary Generator',
            state: 'running',
            inputData: {
              text: 'The quick brown fox jumps over the lazy dog.',
              maxLength: 100,
              temperature: 0.7,
            },
            outputData: null,
            error: null,
            isSelected: true,
            isStartNode: false,
            isEndNode: false,
            layoutDirection: 'LR',
            isStreaming: true,
          },
        },
      },
    })

    const nodeB = this.graph.addNode({
      id: 'node-b',
      shape: 'custom-angular-template-node',
      // x: 500,
      // y: 100,
      data: {
        ngArguments: {
          value: {
            executorId: 'exec-002',
            executorType: 'llm-inference-node',
            name: 'LLM Node B',
            state: 'running',
            layoutDirection: 'TB',
          },
        },
      },
    })
    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-a',
      target: 'node-a',
    })

    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-b',
      target: 'node-b',
    })

    this.graph.addEdge({
      shape: 'self-loop-edge',
      source: 'node-a',
      target: 'node-b',
    })

    this.graph.on('node:change:data', ({ node, current }) => {
      console.log('🌐 Graph Level Event:', node.id, current)
    })

    this.applyDagreLayout('TB')
  }

  updateWorkflowState(state: ExecutorState) {
    if (!this.testNode || !this.graph) return

    const currentData = this.testNode.getData()
    this.testNode.setData({
      ngArguments: {
        value: {
          ...currentData.ngArguments.value,
          state: state,
        },
      },
    })
  }

  toggleWorkflowOutput() {
    if (!this.testNode) return

    const currentData = this.testNode.getData()
    const isFailed = Math.random() > 0.5

    this.testNode.setData({
      ngArguments: {
        value: {
          ...currentData.ngArguments.value,
          state: isFailed ? 'failed' : 'completed',
          outputData: isFailed ? null : { result: 'Success!', tokens: 1024, model: 'gpt-4' },
          error: isFailed ? 'Error: Connection timeout to inference server at 10.0.4.1' : null,
        },
      },
    })
    // this.testNode.resize(260, 220)
  }

  applyDagreLayout(direction: 'TB' | 'LR' = 'TB') {
    const graph = this.graph
    if (!graph) return

    const dagreLayout = new DagreLayout({
      type: 'dagre',
      rankdir: direction,
      nodesep: 60,
      ranksep: 80,
      controlPoints: true,
    })

    const layoutData = {
      nodes: graph.getNodes().map((node) => ({
        id: node.id,
        width: node.size().width,
        height: node.size().height,
      })),
      edges: graph.getEdges().map((edge) => ({
        source: edge.getSourceCellId(),
        target: edge.getTargetCellId(),
      })),
    }

    const result = dagreLayout.layout(layoutData)

    graph.batchUpdate(() => {
      result.nodes?.forEach((node: any) => {
        const x6Node = graph.getCellById(node.id)
        if (x6Node && x6Node.isNode()) {
          x6Node.position(node.x, node.y)
        }
      })
    })

    graph.centerContent()
  }
}
