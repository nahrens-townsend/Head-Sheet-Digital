import { useState, useCallback } from 'react'
import type { CanvasObject } from '../../types/canvasObject'
import { denormalizePoint, type Point, type StageSize } from './canvasUtils'

export interface SnapResult {
  point: Point
  snapped: boolean
  targetId?: string
}

export type SnapFn = (p: Point, excludeId?: string) => SnapResult

/**
 * Canvas-level snapping hook.  Checks every LineObject's start/end endpoints
 * (pixel space) against the incoming pixel-space point.  When within
 * `snapRadius` pixels, returns the endpoint instead of `p` and surfaces a
 * `snapIndicator` position for the SelectionLayer to render.
 */
export function useSnapping(
  objects: CanvasObject[],
  stageSize: StageSize,
  snapRadius = 12,
): {
  snap: SnapFn
  clearSnap: () => void
  snapIndicator: Point | null
} {
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null)

  const snap = useCallback(
    (p: Point, excludeId?: string): SnapResult => {
      for (const obj of objects) {
        if (obj.id === excludeId) continue
        if (obj.type !== 'line' && obj.type !== 'arrow' && obj.type !== 'dotted') continue

        const startPx = denormalizePoint(obj.start, stageSize)
        if (Math.hypot(p.x - startPx.x, p.y - startPx.y) <= snapRadius) {
          setSnapIndicator(startPx)
          return { point: startPx, snapped: true, targetId: obj.id }
        }

        const endPx = denormalizePoint(obj.end, stageSize)
        if (Math.hypot(p.x - endPx.x, p.y - endPx.y) <= snapRadius) {
          setSnapIndicator(endPx)
          return { point: endPx, snapped: true, targetId: obj.id }
        }
      }

      setSnapIndicator(null)
      return { point: p, snapped: false }
    },
    [objects, stageSize, snapRadius],
  )

  const clearSnap = useCallback(() => setSnapIndicator(null), [])

  return { snap, clearSnap, snapIndicator }
}
