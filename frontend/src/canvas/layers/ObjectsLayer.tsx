import { memo } from 'react'
import { Layer, Line, Shape } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import {
  STROKE_SIZES,
} from '../utils/canvasUtils'

interface ObjectsLayerProps {
  objects: CanvasObject[]
  hiddenObjectIds?: ReadonlySet<string>
}

// ── Component ────────────────────────────────────────────────────────────────

export const ObjectsLayer = memo(function ObjectsLayer({
  objects,
  hiddenObjectIds,
}: ObjectsLayerProps) {
  // Coordinates are stored in world pixels [0..WORLD_SIZE]; no denormalization needed.
  // Konva handles draw-time culling via the stage transform.
  return (
    <Layer listening={false}>
      {objects.map((obj) => {
        if (hiddenObjectIds?.has(obj.id)) return null
        if (obj.type === 'pen' || obj.type === 'eraser') {
          // legacy: pen creation tool removed; pen objects from existing sheets still render here
          // Erasers render at 2× the logical stroke width to remain more
          // effective than pen strokes.
          const strokeWidth =
            obj.type === 'eraser' ? STROKE_SIZES[obj.width] * 2 : STROKE_SIZES[obj.width]
          return (
            <Line
              key={obj.id}
              points={obj.points}
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
          const start = obj.start
          const mid = obj.mid
          const end = obj.end
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
                  // Tangent at t=1: B'(1) ∝ (end - mid)
                  const dx = end.x - mid.x
                  const dy = end.y - mid.y
                  const len = Math.hypot(dx, dy)
                  if (len === 0) return

                  const arrowLen = Math.max(strokeWidth * 3.5, 10)
                  const arrowWid = Math.max(strokeWidth * 2, 7)
                  // Cap arrowhead on very short lines so it doesn't overshoot start
                  const cappedArrowLen = Math.min(arrowLen, len / 2)
                  const ux = dx / len
                  const uy = dy / len
                  // arrowBase: where the bezier stroke terminates — base of the triangle
                  const bx = end.x - cappedArrowLen * ux
                  const by = end.y - cappedArrowLen * uy

                  // Bezier stops at arrowBase so the stroke doesn't poke through the tip
                  ctx.beginPath()
                  ctx.moveTo(start.x, start.y)
                  ctx.quadraticCurveTo(mid.x, mid.y, bx, by)
                  ctx.strokeShape(shape)

                  // Filled arrowhead triangle
                  const px = -uy
                  const py = ux
                  ctx.beginPath()
                  ctx.moveTo(end.x, end.y)
                  ctx.lineTo(bx + (arrowWid / 2) * px, by + (arrowWid / 2) * py)
                  ctx.lineTo(bx - (arrowWid / 2) * px, by - (arrowWid / 2) * py)
                  ctx.closePath()
                  ctx.fillShape(shape)
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
})
