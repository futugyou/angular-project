import { NodeMetadata, EdgeMetadata } from '@antv/x6'
import type { ExecutorNodeData } from '../components/features/workflow/executor-v6node.component'

export function applySimpleLayout(
  nodes: NodeMetadata[],
  edges: EdgeMetadata[],
  direction: 'TB' | 'LR' = 'LR',
): NodeMetadata[] {
  if (nodes.length === 0) return nodes

  if (nodes.length === 1) {
    return nodes.map((node) => ({
      ...node,
      x: 0,
      y: 0,
    }))
  }

  // --- adjacency maps ---
  const outgoingEdges = new Map<string, string[]>()
  const incomingEdges = new Map<string, string[]>()

  nodes.forEach((node) => {
    outgoingEdges.set(node.id!, [])
    incomingEdges.set(node.id!, [])
  })

  edges.forEach((edge) => {
    let sourceId: string | undefined
    let targetId: string | undefined

    // --- source ---
    if (typeof edge.source === 'string') {
      sourceId = edge.source
    } else if (edge.source && 'cell' in edge.source) {
      sourceId = edge.source.cell as string
    }

    // --- target ---
    if (typeof edge.target === 'string') {
      targetId = edge.target
    } else if (edge.target && 'cell' in edge.target) {
      targetId = edge.target.cell as string
    }

    if (!sourceId || !targetId) return

    outgoingEdges.get(sourceId)?.push(targetId)
    incomingEdges.get(targetId)?.push(sourceId)
  })

  // --- root nodes ---
  const rootNodes = nodes.filter((node) => (incomingEdges.get(node.id!) || []).length === 0)

  if (rootNodes.length === 0 && nodes.length > 0) {
    rootNodes.push(nodes[0])
  }

  // --- spacing constants ---
  const NODE_WIDTH = 220
  const NODE_HEIGHT = 120
  const HORIZONTAL_SPACING = direction === 'LR' ? 350 : 280
  const VERTICAL_SPACING = direction === 'TB' ? 250 : 180

  const positioned = new Map<string, { x: number; y: number; level: number }>()
  const levelGroups = new Map<number, string[]>()

  const queue: Array<{ nodeId: string; level: number }> = []
  const visited = new Set<string>()

  rootNodes.forEach((node) => {
    queue.push({ nodeId: node.id!, level: 0 })
  })

  // --- BFS assign level ---
  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!

    if (visited.has(nodeId)) continue
    visited.add(nodeId)

    if (!levelGroups.has(level)) {
      levelGroups.set(level, [])
    }

    levelGroups.get(level)!.push(nodeId)

    const children = outgoingEdges.get(nodeId) || []
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        queue.push({ nodeId: childId, level: level + 1 })
      }
    })
  }

  // --- orphan nodes ---
  nodes.forEach((node) => {
    if (!visited.has(node.id!)) {
      const maxLevel = Math.max(...Array.from(levelGroups.keys()), -1)
      const orphanLevel = maxLevel + 1

      if (!levelGroups.has(orphanLevel)) {
        levelGroups.set(orphanLevel, [])
      }

      levelGroups.get(orphanLevel)!.push(node.id!)
    }
  })

  // --- positioning ---
  levelGroups.forEach((nodeIds, level) => {
    const nodeCount = nodeIds.length

    nodeIds.forEach((nodeId, index) => {
      let x: number
      let y: number

      if (direction === 'LR') {
        x = level * HORIZONTAL_SPACING
        const totalHeight = (nodeCount - 1) * VERTICAL_SPACING
        const startY = -totalHeight / 2
        y = startY + index * VERTICAL_SPACING
      } else {
        y = level * VERTICAL_SPACING
        const totalWidth = (nodeCount - 1) * HORIZONTAL_SPACING
        const startX = -totalWidth / 2
        x = startX + index * HORIZONTAL_SPACING
      }

      positioned.set(nodeId, { x, y, level })
    })
  })

  // --- apply ---
  return nodes.map((node) => {
    const pos = positioned.get(node.id!) || { x: 0, y: 0 }

    return {
      ...node,
      x: pos.x - NODE_WIDTH / 2,
      y: pos.y - NODE_HEIGHT / 2,
      data: node.data as ExecutorNodeData,
    }
  })
}

// use example:
// const nodes = [ { id: '1', shape: 'angular-shape', data: { ...executorData } } ];
// const edges = [ { source: '1', target: '2' } ];

// const layoutNodes = applyX6SimpleLayout(nodes, edges, 'LR');

// this.graph.fromJSON({
//   nodes: layoutNodes,
//   edges: edges
// });
