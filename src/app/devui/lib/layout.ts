import { NodeMetadata, EdgeMetadata } from '@antv/x6'
import type {
  ExecutorNodeData,
  ExecutorState,
} from '../components/features/workflow/executor-v6node.component'

import type {
  ExtendedResponseStreamEvent,
  ResponseWorkflowEventComplete,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
  JSONSchemaProperty,
} from '../types'
import type { Workflow } from '../types/workflow'
import { getTypedWorkflow } from '../types/workflow'

// use example:
// const nodes = [ { id: '1', shape: 'angular-shape', data: { ...executorData } } ];
// const edges = [ { source: '1', target: '2' } ];

// const layoutNodes = applyX6SimpleLayout(nodes, edges, 'LR');

// this.graph.fromJSON({
//   nodes: layoutNodes,
//   edges: edges
// });
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

export interface WorkflowDumpExecutor {
  id: string
  type: string
  name?: string
  description?: string
  config?: Record<string, unknown>
}

interface RawExecutorData {
  type_?: string
  type?: string
  name?: string
  description?: string
  config?: Record<string, unknown>
}

export interface WorkflowDumpConnection {
  source: string
  target: string
  condition?: string
}

export interface WorkflowDump {
  executors?: WorkflowDumpExecutor[]
  connections?: WorkflowDumpConnection[]
  start_executor?: string
  end_executors?: string[]
  [key: string]: unknown // Allow for additional properties
}

export interface NodeUpdate {
  nodeId: string
  state: ExecutorState
  data?: unknown
  error?: string
  timestamp: string
}

/**
 * Extract executors from workflow dump - handles different possible structures
 */
function getExecutorsFromDump(workflowDump: Record<string, unknown>): WorkflowDumpExecutor[] {
  // First check if executors is an object (like in the actual dump structure)
  if (
    workflowDump['executors'] &&
    typeof workflowDump['executors'] === 'object' &&
    !Array.isArray(workflowDump['executors'])
  ) {
    const executorsObj = workflowDump['executors'] as Record<string, RawExecutorData>
    return Object.entries(executorsObj).map(([id, executor]) => ({
      id,
      type: executor.type_ || executor.type || 'executor',
      name: executor.name || id,
      description: executor.description,
      config: executor.config,
    }))
  }

  // Try different possible keys where executors might be stored as arrays
  const possibleKeys = ['executors', 'agents', 'steps', 'nodes']

  for (const key of possibleKeys) {
    if (workflowDump[key] && Array.isArray(workflowDump[key])) {
      return workflowDump[key] as WorkflowDumpExecutor[]
    }
  }

  // If no direct array, try to extract from nested structures
  if (workflowDump['config'] && typeof workflowDump['config'] === 'object') {
    return getExecutorsFromDump(workflowDump['config'] as Record<string, unknown>)
  }

  // Fallback: create executors from any object keys that look like executor IDs
  const executors: WorkflowDumpExecutor[] = []
  Object.entries(workflowDump).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null && ('type' in value || 'type_' in value)) {
      const rawExecutor = value as RawExecutorData
      executors.push({
        id: key,
        type: rawExecutor.type_ || rawExecutor.type || 'executor',
        name: rawExecutor.name || key,
        description: rawExecutor.description,
        config: rawExecutor.config,
      })
    }
  })

  return executors
}

/**
 * Convert workflow dump data to React Flow nodes
 */
export function convertWorkflowDumpToNodes(
  workflowDump: Workflow | Record<string, unknown> | undefined,
  onNodeClick?: (executorId: string, data: ExecutorNodeData) => void,
  layoutDirection?: 'LR' | 'TB',
): NodeMetadata[] {
  if (!workflowDump) {
    console.warn('convertWorkflowDumpToNodes: workflowDump is undefined')
    return []
  }

  // Try to get typed workflow first, then fall back to generic handling
  const typedWorkflow = getTypedWorkflow(workflowDump)

  let executors: WorkflowDumpExecutor[]
  let startExecutorId: string | undefined

  if (typedWorkflow) {
    // Use typed workflow structure
    executors = Object.values(typedWorkflow.executors).map((executor) => ({
      id: executor.id,
      type: executor.type,
      name: ((executor as Record<string, unknown>)['name'] as string) || executor.id,
      description: (executor as Record<string, unknown>)['description'] as string,
      config: (executor as Record<string, unknown>)['config'] as Record<string, unknown>,
    }))
    startExecutorId = typedWorkflow.start_executor_id
  } else {
    // Fall back to generic handling for backwards compatibility
    executors = getExecutorsFromDump(workflowDump as Record<string, unknown>)
    const workflowDumpRecord = workflowDump as Record<string, unknown>
    startExecutorId = workflowDumpRecord?.['start_executor_id'] as string | undefined
  }

  if (!executors || !Array.isArray(executors) || executors.length === 0) {
    console.warn('No executors found in workflow dump. Available keys:', Object.keys(workflowDump))
    return []
  }

  const nodes = executors.map((executor) => ({
    id: executor.id,
    type: 'executor',
    position: { x: 0, y: 0 }, // Will be set by layout algorithm
    data: {
      executorId: executor.id,
      executorType: executor.type,
      name: executor.name || executor.id,
      state: 'pending' as ExecutorState,
      isStartNode: executor.id === startExecutorId,
      layoutDirection: layoutDirection || 'LR',
      onNodeClick,
    },
  }))

  return nodes
}
