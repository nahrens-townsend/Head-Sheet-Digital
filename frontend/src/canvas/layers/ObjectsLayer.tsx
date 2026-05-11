import { Layer, Line, Shape } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import { denormalizePoints, denormalizePoint, STROKE_SIZES, type StageSize } from '../utils/canvasUtils'

interface ObjectsLayerProps {
  objects: CanvasObject[]
  stageSize: StageSize
}

export function ObjectsLayer({ objects, stageSize }: ObjectsLayerProps) {
  return (
    <Layer listening={false}>
      {objects.map((obj) => {
        if (obj.type === 'pen' || obj.type === 'eraser') {
          // Erasers render at 2× the logical stroke width to remain more
          // effective than pen strokes — matching the live preview in LiveLayer.
          const strokeWidth =
            obj.type === 'eraser' ? STROKE_SIZES[obj.width] * 2 : STROKE_SIZES[obj.width]
          return (
            <Line
              key={obj.id}
              points={denormalizePoints(obj.points, stageSize)}
              stroke={obj.color}
              strokeWidth={strokeWidth}
              opacity={obj.opacity}
              tension={obj.tension}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
              globalCompositeOperation={
                obj.type === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          )
        }

        if (obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted') {
          const start = denormalizePoint(obj.start, stageSize)
          const mid = denormalizePoint(obj.mid, stageSize)
          const end = denormalizePoint(obj.end, stageSize)
          const strokeWidth = STROKE_SIZES[obj.width]

          if (obj.type === 'dotted') {
            return (
              <Shape
                key={obj.id}
                stroke={obj.color}
                strokeWidth={strokeWidth}
                opacity={obj.opacity}
                lineCap="round"
                lineJoin="round"
                strokeScaleEnabled={false}
                dash={[strokeWidth * 2, strokeWidth * 2]}
                sceneFunc={(ctx, shape) => {
                  ctx.beginPath()
                  ctx.moveTo(start.x, start.y)
                  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y)
                  ctx.strokeShape(shape)
                }}
              />
            )
          }

          if (obj.type === 'arrow') {
            return (
              <Shape
                key={obj.id}
                stroke={obj.color}
                fill={obj.color}
                strokeWidth={strokeWidth}
                opacity={obj.opacity}
                lineCap="round"
                lineJoin="round"
                strokeScaleEnabled={false}
                sceneFunc={(ctx, shape) => {
                  // Draw the bezier curve
                  ctx.beginPath()
                  ctx.moveTo(start.x, start.y)
                  ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y)
                  ctx.strokeShape(shape)

                  // Draw arrowhead at end, oriented along the bezier tangent at t=1
                  // Tangent direction at t=1: B'(1) ∝ (end - mid)
                  const dx = end.x - mid.x
                  const dy = end.y - mid.y
                  const len = Math.hypot(dx, dy)
                  if (len > 0) {
                    const arrowLen = Math.max(strokeWidth * 3.5, 10)
                    const arrowWid = Math.max(strokeWidth * 2, 7)
                    const ux = dx / len
                    const uy = dy / len
                    // Perpendicular
                    const px = -uy
                    const py = ux
                    const bx = end.x - arrowLen * ux
                    const by = end.y - arrowLen * uy
                    ctx.beginPath()
                    ctx.moveTo(end.x, end.y)
                    ctx.lineTo(bx + (arrowWid / 2) * px, by + (arrowWid / 2) * py)
                    ctx.lineTo(bx - (arrowWid / 2) * px, by - (arrowWid / 2) * py)
                    ctx.closePath()
                    ctx.fillShape(shape)
                  }
                }}
              />
            )
          }

          // plain 'line'
          return (
            <Shape
              key={obj.id}
              stroke={obj.color}
              strokeWidth={strokeWidth}
              opacity={obj.opacity}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
              sceneFunc={(ctx, shape) => {
                ctx.beginPath()
                ctx.moveTo(start.x, start.y)
                ctx.quadraticCurveTo(mid.x, mid.y, end.x, end.y)
                ctx.strokeShape(shape)
              }}
            />
          )
        }

        return null
      })}
    </Layer>
  )
}
