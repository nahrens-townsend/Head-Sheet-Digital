import type { CanvasObject } from '../../types/canvasObject'
import { denormalizePoint, denormalizePoints, STROKE_SIZES, type Point, type StageSize } from './canvasUtils'

export function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/**
 * Hit-test a single canvas object against a pixel-space pointer position.
 * thresholdPx controls how many pixels from the object counts as a hit.
 */
export function hitTestCanvasObject(
  obj: CanvasObject,
  px: Point,
  stageSize: StageSize,
  thresholdPx: number,
): boolean {
  if (obj.type === 'pen' || obj.type === 'eraser') {
    const pts = denormalizePoints(obj.points, stageSize)
    for (let i = 0; i < pts.length - 2; i += 2) {
      if (
        distToSegment(
          px,
          { x: pts[i], y: pts[i + 1] },
          { x: pts[i + 2], y: pts[i + 3] },
        ) <= thresholdPx
      ) {
        return true
      }
    }
    return false
  }

  if (obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted') {
    const s = denormalizePoint(obj.start, stageSize)
    const m = denormalizePoint(obj.mid, stageSize)
    const e = denormalizePoint(obj.end, stageSize)
    for (let t = 0; t <= 1; t += 0.05) {
      const bx = (1 - t) * (1 - t) * s.x + 2 * t * (1 - t) * m.x + t * t * e.x
      const by = (1 - t) * (1 - t) * s.y + 2 * t * (1 - t) * m.y + t * t * e.y
      if (Math.hypot(px.x - bx, px.y - by) <= thresholdPx) return true
    }
    return false
  }

  return false
}

/** Pixel threshold for the select tool — half stroke width + 4px, min 8px. */
export function selectThreshold(obj: CanvasObject): number {
  return Math.max(STROKE_SIZES[obj.width] / 2 + 4, 8)
}

/** Pixel threshold for the eraser tool — 1.5× stroke width, min 12px. */
export function eraserThreshold(obj: CanvasObject): number {
  return Math.max(STROKE_SIZES[obj.width] * 1.5, 12)
}
