import { Layer, Line } from 'react-konva'
import type { Stroke } from '../../types/stroke'
import { denormalizePoints, type StageSize } from '../utils/canvasUtils'

interface ObjectsLayerProps {
  strokes: Stroke[]
  stageSize: StageSize
}

export function ObjectsLayer({ strokes, stageSize }: ObjectsLayerProps) {
  return (
    <Layer listening={false}>
      {strokes.map((stroke) => (
        <Line
          key={stroke.id}
          points={denormalizePoints(stroke.points, stageSize)}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          opacity={stroke.opacity}
          tension={stroke.tension ?? 0}
          lineCap={stroke.lineCap ?? 'round'}
          lineJoin={stroke.lineJoin ?? 'round'}
          strokeScaleEnabled={false}
          globalCompositeOperation={
            stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
          }
        />
      ))}
    </Layer>
  )
}
