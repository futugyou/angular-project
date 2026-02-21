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
} from '@angular/core'
import { Graph } from '@antv/x6'
import '@antv/x6-angular-shape'

import { NgIconComponent } from '@ng-icons/core'
import { ButtonDirective } from '../../../directives/button.directive'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenu,
} from '../../../components/ui/dropdown.component'
import { GridDrawOptions } from '@antv/x6/lib/graph/grid'

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
