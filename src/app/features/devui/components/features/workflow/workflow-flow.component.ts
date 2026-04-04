import {
  Component,
  AfterViewInit,
  OnDestroy,
  ElementRef,
  signal,
  input,
  output,
  viewChild,
  effect,
  Directive,
  inject,
  untracked,
  ChangeDetectionStrategy,
  OnInit,
  computed,
} from '@angular/core'
import { Graph, Node } from '@antv/x6'

import { NgIconComponent } from '@ng-icons/core'
import { ButtonDirective } from '@shared/directives/button.directive'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenu,
} from '@shared/ui/dropdown.component'
import { GridDrawOptions } from '@antv/x6/lib/graph/grid'
import { GraphService } from '../../../services/v6node-graph.service'
import { CommonModule, JsonPipe } from '@angular/common'
import {
  consolidateBidirectionalEdges,
  convertWorkflowDumpToEdges,
  convertWorkflowDumpToNodes,
  processWorkflowEvents,
} from '../../../utils/layout'

@Component({
  selector: 'app-workflow-graph',
  standalone: true,
  imports: [
    NgIconComponent,
    ButtonDirective,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenu,
  ],
  host: {
    class: 'block relative w-full h-full',
  },
  template: `
    <div class="w-full h-full relative">
      <div #container class="w-full h-full"></div>

      <div [appDropdownMenu]="appDropdownMenuContent">
        <button [appButton] variant="ghost" size="sm" class="relative">
          <ng-icon
            name="lucideSun"
            class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
          />
          <ng-icon
            name="lucideMoon"
            class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
          />
          <span class="sr-only">View options</span>
        </button>
      </div>

      <ng-template #appDropdownMenuContent>
        <app-dropdown-menu-content class="w-56">
          <button
            appDropdownMenuCheckboxItem
            [checked]="showMinimap()"
            (click)="toggle(showMinimap)"
          >
            <ng-icon name="lucideMap" class="mr-2"></ng-icon>
            Show Minimap
          </button>

          <button appDropdownMenuCheckboxItem [checked]="showGrid()" (click)="toggle(showGrid)">
            <ng-icon name="lucideGrid3X3" class="mr-2"></ng-icon>
            Show Grid
          </button>

          <button appDropdownMenuCheckboxItem [checked]="animateRun()" (click)="toggle(animateRun)">
            <ng-icon name="lucideZap" class="mr-2"></ng-icon>
            Animate Run
          </button>

          <button
            appDropdownMenuCheckboxItem
            [checked]="consolidateBidirectionalEdges()"
            (click)="toggle(consolidateBidirectionalEdges)"
          >
            <ng-icon name="lucideArrowLeftRight" class="mr-2"></ng-icon>
            Merge Bidirectional Edges
          </button>

          <app-dropdown-menu-separator />

          <button
            appDropdownMenuCheckboxItem
            [checked]="layoutDirection() === 'TB'"
            (click)="toggleDirection()"
          >
            <ng-icon name="lucideArrowDown" class="mr-2"></ng-icon>
            Vertical Layout
          </button>

          <app-dropdown-menu-separator />

          <button appDropdownMenuItem (click)="resetZoom()">
            <ng-icon name="lucideRotateCcw" class="mr-2"></ng-icon>
            Reset Zoom
          </button>

          <button appDropdownMenuItem (click)="fitView()">
            <ng-icon name="lucideMaximize" class="mr-2"></ng-icon>
            Fit To Screen
          </button>

          <button appDropdownMenuItem (click)="autoArrange()">
            <ng-icon name="lucideShuffle" class="mr-2"></ng-icon>
            Auto Arrange
          </button>
        </app-dropdown-menu-content>
      </ng-template>
    </div>
  `,
})
export class WorkflowGraphComponent implements AfterViewInit, OnDestroy {
  workflowDump = input<any>()
  nodeSelect = output<{ id: string; data: any }>()

  showMinimap = signal(true)
  showGrid = signal(true)
  animateRun = signal(false)
  consolidateBidirectionalEdges = signal(true)
  layoutDirection = signal<'LR' | 'TB'>('LR')

  container = viewChild<ElementRef<HTMLDivElement>>('container')

  private graph!: Graph

  ngAfterViewInit() {
    this.graph = new Graph({
      container: this.container()!.nativeElement,
      grid: this.showGrid(),
      panning: true,
      mousewheel: true,
      connecting: {
        router: 'manhattan',
        connector: 'rounded',
      },
    })

    this.graph.on('node:click', ({ node }) => {
      this.nodeSelect.emit({
        id: node.id,
        data: node.getData(),
      })
    })

    effect(() => {
      const gridOptions: GridDrawOptions = this.showGrid()
        ? { type: 'dot', args: { color: '#ddd', size: 10 } }
        : { type: 'customGrid', args: { customKey: 'customValue' } }

      this.graph?.drawGrid(gridOptions)
    })

    effect(() => {
      const dump = this.workflowDump()
      if (dump) {
        this.render(dump)
      }
    })
  }

  private render(dump: any) {
    this.graph.clearCells()

    const nodes = dump.nodes.map((n: any) => ({
      id: n.id,
      x: 0,
      y: 0,
      width: 180,
      height: 60,
      label: n.name,
      data: n,
      attrs: {
        body: {
          fill: '#fff',
          stroke: '#999',
          rx: 8,
          ry: 8,
        },
      },
    }))

    let edges = dump.edges.map((e: any) => ({
      source: e.source,
      target: e.target,
      attrs: {
        line: {
          stroke: '#999',
          strokeWidth: 1.5,
          targetMarker: 'classic',
        },
      },
    }))

    if (this.consolidateBidirectionalEdges()) {
      const map = new Map<string, any>()
      for (const e of edges) {
        const key = `${e.source}-${e.target}`
        const reverse = `${e.target}-${e.source}`
        if (map.has(reverse)) {
          map.delete(reverse)
        } else {
          map.set(key, e)
        }
      }
      edges = Array.from(map.values())
    }

    nodes.forEach((n: any) => this.graph.addNode(n))
    edges.forEach((e: any) => this.graph.addEdge(e))

    this.applyLayout()
  }

  private applyLayout() {
    this.graph.centerContent()
  }

  toggle(sig: any) {
    sig.update((v: boolean) => !v)
  }

  toggleDirection() {
    this.layoutDirection.update((d) => (d === 'LR' ? 'TB' : 'LR'))
    this.applyLayout()
  }

  resetZoom() {
    this.graph.zoomTo(1)
    this.graph.translate(0, 0)
  }

  fitView() {
    this.graph.zoomToFit({ padding: 20 })
  }

  autoArrange() {
    this.applyLayout()
  }

  ngOnDestroy() {
    this.graph?.dispose()
  }
}

@Directive({
  selector: '[appWorkflowAnimation]',
  standalone: true,
})
export class WorkflowAnimationDirective {
  private rfService = inject(GraphService)

  nodes = input<Node[]>([])
  isStreaming = input<boolean>(false)
  animateRun = input<boolean>(false)

  constructor() {
    effect(() => {
      const animate = this.animateRun()
      const streaming = this.isStreaming()
      const currentNodes = this.nodes()

      if (!animate) return

      if (streaming) {
        const runningNode = currentNodes.find((n) => n.data.state === 'running')
        if (runningNode) {
          this.rfService.fitView({
            nodes: [runningNode],
            duration: 800,
            padding: 0.3,
          })
        }
      } else if (currentNodes.length > 0) {
        this.rfService.fitView({
          duration: 1000,
          padding: 0.2,
        })
      }
    })
  }
}

@Component({
  selector: 'app-timeline-resize-handler',
  standalone: true,
  template: '',
})
export class TimelineResizeHandlerComponent {
  timelineVisible = input.required<boolean>()

  private reactFlowService = inject(GraphService)

  constructor() {
    effect((onCleanup) => {
      const visible = this.timelineVisible()

      untracked(() => {
        const timeoutId = setTimeout(() => {
          this.reactFlowService.fitView({
            padding: 0.2,
            duration: 300,
          })
        }, 350)

        onCleanup(() => clearTimeout(timeoutId))
      })
    })
  }
}

@Component({
  selector: 'app-workflow-flow',
  standalone: true,
  imports: [CommonModule, JsonPipe],
  template: `
    <div [class]="'h-full w-full ' + className()">
      @if (!workflowDump()) {
        <div
          class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center text-gray-500 dark:text-gray-400">
            <div class="text-lg font-medium mb-2">No Workflow Data</div>
            <div class="text-sm">Workflow dump is not available.</div>
          </div>
        </div>
      } @else if (initialNodes().length === 0) {
        <div
          class="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700"
        >
          <div class="text-center text-gray-500 dark:text-gray-400">
            <div class="text-lg font-medium mb-2">No Executors Found</div>
            <div class="text-sm">Could not extract executors from workflow dump.</div>
            <details class="mt-2 text-xs">
              <summary class="cursor-pointer">Debug Info</summary>
              <pre class="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-left overflow-auto">{{
                workflowDump() | json
              }}</pre>
            </details>
          </div>
        </div>
      } @else {
        <div class="h-full w-full relative">
          <div #container class="h-full w-full"></div>

          @if (viewOptions().showGrid) {
            <div class="absolute inset-0 pointer-events-none x6-grid-placeholder"></div>
          }

          <div class="absolute bottom-4 left-4 z-10"></div>

          @if (viewOptions().showMinimap) {
            <div
              class="absolute bottom-4 right-4 z-10 w-40 h-32 border bg-white/90 dark:bg-gray-800/90 shadow-sm rounded"
            ></div>
          }

          <ng-content></ng-content>
        </div>
      }

      <style>
        .react-flow__edge-path {
          transition:
            stroke 0.3s ease,
            stroke-width 0.3s ease;
        }
        .react-flow__edge.animated .react-flow__edge-path {
          stroke-dasharray: 5 5;
          animation: dash 1s linear infinite;
        }
        @keyframes dash {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -10;
          }
        }
        .dark .react-flow__controls {
          background-color: rgba(31, 41, 55, 0.9) !important;
          border-color: rgb(75, 85, 99) !important;
        }
      </style>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowFlowComponent implements OnDestroy {
  protected readonly graphService = inject(GraphService)

  workflowDump = input.required<any>()
  events = input<any[]>([])
  isStreaming = input<boolean>(false)
  className = input<string>('')
  onNodeSelect = output<any>()
  viewOptions = input({
    showMinimap: false,
    showGrid: true,
    animateRun: true,
    consolidateBidirectionalEdges: true,
  })
  onToggleViewOption = output<string>()
  layoutDirection = input<'TB' | 'LR'>('TB')
  onLayoutDirectionChange = output<string>()
  timelineVisible = input<boolean>(false)

  container = viewChild<ElementRef<HTMLDivElement>>('container')

  initialGraphData = computed(() => {
    const dump = this.workflowDump()
    if (!dump) return { initialNodes: [], initialEdges: [] }

    const nodes = convertWorkflowDumpToNodes(
      dump,
      (id: string, data: any) => this.onNodeSelect.emit({ id, data }),
      this.layoutDirection(),
    )
    const edges = convertWorkflowDumpToEdges(dump)

    const finalEdges = this.viewOptions().consolidateBidirectionalEdges
      ? consolidateBidirectionalEdges(edges)
      : edges

    return { initialNodes: nodes, initialEdges: finalEdges }
  })

  initialNodes = computed(() => this.initialGraphData().initialNodes)
  initialEdges = computed(() => this.initialGraphData().initialEdges)

  nodeUpdates = computed(() => {
    return processWorkflowEvents(this.events(), this.workflowDump()?.start_executor_id)
  })

  constructor() {
    effect(() => {
      const nodes = this.initialNodes()
      const edges = this.initialEdges()
      if (nodes.length > 0 && this.graphService.isInitialized()) {
        untracked(() => {
          this.graphService.setNodesAndEdges(nodes, edges)
          this.graphService.applyDagreLayout(this.layoutDirection())
          this.graphService.fitView({ padding: 0.2, duration: 500 })
        })
      }
    })

    effect(() => {
      const updates = this.nodeUpdates()
      const streaming = this.isStreaming()
      const events = this.events()

      if (this.graphService.isInitialized()) {
        untracked(() => {
          if (Object.keys(updates).length > 0) {
            this.graphService.updateNodesWithEvents(updates, streaming)
          } else if (events.length === 0) {
            this.graphService.resetNodesToPending()
          }
        })
      }
    })

    effect(() => {
      const events = this.events()
      const consolidate = this.viewOptions().consolidateBidirectionalEdges

      if (this.graphService.isInitialized()) {
        untracked(() => {
          if (events.length > 0) {
            this.graphService.updateEdgesWithSequenceAnalysis(events, consolidate)
          } else {
            this.graphService.resetEdgesToDefault(consolidate)
          }
        })
      }
    })

    effect(() => {
      const streaming = this.isStreaming()
      if (this.graphService.isInitialized()) {
        untracked(() => this.graphService.setNodesDraggable(!streaming))
      }
    })

    effect(() => {
      const el = this.container()
      if (el) {
        this.graphService.initGraph(el.nativeElement)
      }
    })
  }

  ngOnDestroy() {
    this.graphService.dispose()
  }
}
