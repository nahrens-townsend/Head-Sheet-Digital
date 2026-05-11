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

        if (obj.type === 'line') {
          const start = denormalizePoint(obj.start, stageSize)
          const mid = denormalizePoint(obj.mid, stageSize)
          const end = denormalizePoint(obj.end, stageSize)
          const strokeWidth = STROKE_SIZES[obj.width]

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
