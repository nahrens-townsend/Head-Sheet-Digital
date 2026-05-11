import { useRef } from 'react'
import { Circle, Group, Layer, Line } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import {
  denormalizePoint,
  denormalizePoints,
  normalizePoint,
  STROKE_SIZES,
  type Point,
  type StageSize,
} from '../utils/canvasUtils'

const HANDLE_RADIUS = 7
const HANDLE_FILL = '#ffffff'
const HANDLE_STROKE = '#aa3bff'
const SELECTION_HIGHLIGHT = '#aa3bff'

interface SelectionLayerProps {
  objects: CanvasObject[]
  selectedObjectIds: string[]
  stageSize: StageSize
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
}

function ControlHandle({
  x,
  y,
  onDragEnd,
}: {
  x: number
  y: number
  onDragEnd: (p: Point) => void
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={HANDLE_RADIUS}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={2}
      draggable
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
    />
  )
}

export function SelectionLayer({
  objects,
  selectedObjectIds,
  stageSize,
  onUpdateObject,
}: SelectionLayerProps) {
  // Ref so drag callbacks always see the latest stageSize even after a window resize
  const stageSizeRef = useRef(stageSize)
  stageSizeRef.current = stageSize

  const selectedObjects = selectedObjectIds
    .map((id) => objects.find((o) => o.id === id))
    .filter(Boolean) as CanvasObject[]

  return (
    <Layer>
      {selectedObjects.map((obj) => {
        if (obj.type === 'pen') {
          const pts = denormalizePoints(obj.points, stageSize)
          return (
            <Line
              key={obj.id}
              points={pts}
              stroke={SELECTION_HIGHLIGHT}
              strokeWidth={STROKE_SIZES[obj.width] + 6}
              opacity={0.35}
              tension={obj.tension}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
              listening={false}
            />
          )
        }

        if (obj.type === 'line') {
          const start = denormalizePoint(obj.start, stageSize)
          const mid = denormalizePoint(obj.mid, stageSize)
          const end = denormalizePoint(obj.end, stageSize)

          return (
            <Group key={obj.id}>
              {/* dashed guide lines between control points */}
              <Line
                points={[start.x, start.y, mid.x, mid.y, end.x, end.y]}
                stroke={SELECTION_HIGHLIGHT}
                strokeWidth={1}
                opacity={0.5}
                dash={[4, 4]}
                listening={false}
              />
              <ControlHandle
                x={start.x}
                y={start.y}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    o.type === 'line'
                      ? { ...o, start: normalizePoint(p, stageSizeRef.current) }
                      : o,
                  )
                }
              />
              <ControlHandle
                x={mid.x}
                y={mid.y}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    o.type === 'line'
                      ? { ...o, mid: normalizePoint(p, stageSizeRef.current) }
                      : o,
                  )
                }
              />
              <ControlHandle
                x={end.x}
                y={end.y}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    o.type === 'line'
                      ? { ...o, end: normalizePoint(p, stageSizeRef.current) }
                      : o,
                  )
                }
              />
            </Group>
          )
        }

        return null
      })}
    </Layer>
  )
}
