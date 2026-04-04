import { Path, Graph, EdgeView, Registry } from '@antv/x6'

export const selfLoopConnector = (
  sourcePoint: { x: number; y: number },
  targetPoint: { x: number; y: number },
  vertices: any[],
  options: any,
  edgeView: EdgeView,
) => {
  const edge = edgeView.cell
  const sourceNode = edgeView.cell.getSourceCell()
  const targetNode = edgeView.cell.getTargetCell()

  const isSelfLoop = sourceNode && targetNode && sourceNode.id === targetNode.id

  if (!isSelfLoop || !sourceNode || !sourceNode.isNode()) {
    return new Path().moveTo(sourcePoint.x, sourcePoint.y).lineTo(targetPoint.x, targetPoint.y)
  }

  const bbox = sourceNode.getBBox()
  const { x, y, width, height } = bbox

  const data = sourceNode.getData()?.ngArguments?.value
  const isVertical = data?.layoutDirection === 'TB'

  const path = new Path()
  const loopOffset = 100
  const riseOffset = 40

  if (isVertical) {
    const startX = x + width / 2
    const startY = y + height
    const endX = x + width / 2
    const endY = y

    const cp1X = startX
    const cp1Y = startY + riseOffset
    const cp2X = x + width + loopOffset
    const cp2Y = startY + riseOffset
    const cp3X = x + width + loopOffset
    const cp3Y = y + height / 2

    path.moveTo(startX, startY)
    path.curveTo(cp1X, cp1Y, cp2X, cp2Y, cp3X, cp3Y)
    path.curveTo(cp3X, y - riseOffset, endX, y - riseOffset, endX, endY)
  } else {
    const startX = x + width
    const startY = y + height / 2
    const endX = x
    const endY = y + height / 2

    const cp1X = startX + riseOffset
    const cp1Y = startY
    const cp2X = startX + riseOffset
    const cp2Y = y + height + loopOffset
    const cp3X = x + width / 2
    const cp3Y = y + height + loopOffset

    path.moveTo(startX, startY)
    path.curveTo(cp1X, cp1Y, cp2X, cp2Y, cp3X, cp3Y)
    path.curveTo(x - riseOffset, y + height + loopOffset, x - riseOffset, endY, endX, endY)
  }

  return path
}
