import { useRef } from 'react'
import { Circle, Group, Layer, Line } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import { isLineObject } from '../../types/canvasObject'
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
const SNAP_COLOR = '#aa3bff'

interface SelectionLayerProps {
  objects: CanvasObject[]
  selectedObjectIds: string[]
  stageSize: StageSize
  zoom: number
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  snapIndicator?: Point | null
}

function ControlHandle({
  x,
  y,
  radius,
  zoom,
  onDragEnd,
}: {
  x: number
  y: number
  radius: number
  zoom: number
  onDragEnd: (p: Point) => void
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={2 / zoom}
      draggable
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
    />
  )
}

export function SelectionLayer({
  objects,
  selectedObjectIds,
  stageSize,
  zoom,
  onUpdateObject,
  snapIndicator = null,
}: SelectionLayerProps) {
  // Ref so drag callbacks always see the latest stageSize even after a window resize
  const stageSizeRef = useRef(stageSize)
  stageSizeRef.current = stageSize

  // Scale handle radius inversely with zoom so handles remain the same size on screen.
  const handleRadius = HANDLE_RADIUS / zoom

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

        if (isLineObject(obj)) {
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
                radius={handleRadius}
                zoom={zoom}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? { ...o, start: normalizePoint(p, stageSizeRef.current) }
                      : o,
                  )
                }
              />
              <ControlHandle
                x={mid.x}
                y={mid.y}
                radius={handleRadius}
                zoom={zoom}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? { ...o, mid: normalizePoint(p, stageSizeRef.current) }
                      : o,
                  )
                }
              />
              <ControlHandle
                x={end.x}
                y={end.y}
                radius={handleRadius}
                zoom={zoom}
                onDragEnd={(p) =>
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
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

      {/* Snap indicator — shown while drawing a vector line near an endpoint */}
      {snapIndicator && (
        <Circle
          x={snapIndicator.x}
          y={snapIndicator.y}
          radius={9 / zoom}
          stroke={SNAP_COLOR}
          strokeWidth={2 / zoom}
          fill="transparent"
          listening={false}
        />
      )}
    </Layer>
  )
}
