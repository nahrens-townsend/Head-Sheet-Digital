import { memo } from 'react'
import { Layer, Line, Shape } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import {
  denormalizePoints,
  denormalizePoint,
  STROKE_SIZES,
  type Point,
  type StageSize,
} from '../utils/canvasUtils'

interface ObjectsLayerProps {
  objects: CanvasObject[]
  stageSize: StageSize
  zoom: number
  panOffset: Point
}

// ── Viewport culling helpers ─────────────────────────────────────────────────

type ViewportBounds = { left: number; right: number; top: number; bottom: number }

// Compute the visible region in normalised [0,1] object space.
// A 10 % margin prevents objects from visually popping in/out at exact boundaries.
function getViewportBoundsNorm(
  stageSize: StageSize,
  zoom: number,
  panOffset: Point,
  margin = 0.1,
): ViewportBounds {
  // screen → content: content = (screen - panOffset) / zoom
  return {
    left: (0 - panOffset.x) / zoom / stageSize.width - margin,
    right: (stageSize.width - panOffset.x) / zoom / stageSize.width + margin,
    top: (0 - panOffset.y) / zoom / stageSize.height - margin,
    bottom: (stageSize.height - panOffset.y) / zoom / stageSize.height + margin,
  }
}

function getObjectBoundsNorm(
  obj: CanvasObject,
): { minX: number; minY: number; maxX: number; maxY: number } {
  if (obj.type === 'pen' || obj.type === 'eraser') {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity
    for (let i = 0; i < obj.points.length; i += 2) {
      const x = obj.points[i]
      const y = obj.points[i + 1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    // Degenerate/empty stroke — treat as full-canvas to avoid culling it incorrectly.
    if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1, maxY: 1 }
    return { minX, minY, maxX, maxY }
  }
  // line / arrow / dotted — bounding box of the three bezier control points
  return {
    minX: Math.min(obj.start.x, obj.mid.x, obj.end.x),
    maxX: Math.max(obj.start.x, obj.mid.x, obj.end.x),
    minY: Math.min(obj.start.y, obj.mid.y, obj.end.y),
    maxY: Math.max(obj.start.y, obj.mid.y, obj.end.y),
  }
}

function isInViewport(obj: CanvasObject, vp: ViewportBounds): boolean {
  const b = getObjectBoundsNorm(obj)
  return b.maxX >= vp.left && b.minX <= vp.right && b.maxY >= vp.top && b.minY <= vp.bottom
}

// ── Component ────────────────────────────────────────────────────────────────

export const ObjectsLayer = memo(function ObjectsLayer({
  objects,
  stageSize,
  zoom,
  panOffset,
}: ObjectsLayerProps) {
  // Only cull when zoomed in; at zoom ≤ 1 the full content area is visible.
  const visibleObjects =
    zoom <= 1
      ? objects
      : objects.filter((obj) =>
          isInViewport(obj, getViewportBoundsNorm(stageSize, zoom, panOffset)),
        )
  return (
    <Layer listening={false}>
      {visibleObjects.map((obj) => {
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
