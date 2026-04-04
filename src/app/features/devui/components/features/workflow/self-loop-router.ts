import { EdgeView, PointLike, KeyValue } from '@antv/x6'

export const selfLoopRouter = (
  vertices: PointLike[],
  options: KeyValue<any>,
  edgeView: EdgeView,
) => {
  const edge = edgeView.cell
  const sourceNode = edge.getSourceCell()
  const targetNode = edge.getTargetCell()

  const isSelfLoop = sourceNode && targetNode && sourceNode.id === targetNode.id

  if (!isSelfLoop || !sourceNode || !sourceNode.isNode()) {
    return vertices
  }

  const bbox = sourceNode.getBBox()
  const { x, y, width, height } = bbox
  const data = sourceNode.getData()?.ngArguments?.value
  const isVertical = data?.layoutDirection === 'TB'

  const loopOffset = 100
  const riseOffset = 40

  if (isVertical) {
    return [
      { x: x + width / 2, y: y + height + riseOffset }, // cp1
      { x: x + width + loopOffset, y: y + height + riseOffset }, // cp2
      { x: x + width + loopOffset, y: y + height / 2 }, // cp3
      { x: x + width + loopOffset, y: y - riseOffset }, // cp4
      { x: x + width / 2, y: y - riseOffset }, // cp5
    ]
  } else {
    return [
      { x: x + width + riseOffset, y: y + height / 2 },
      { x: x + width + riseOffset, y: y + height + loopOffset },
      { x: x + width / 2, y: y + height + loopOffset },
      { x: x - riseOffset, y: y + height + loopOffset },
      { x: x - riseOffset, y: y + height / 2 },
    ]
  }
}
