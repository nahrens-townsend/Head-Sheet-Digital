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
 * `snapRadius` screen-pixels, returns the endpoint instead of `p` and surfaces a
 * `snapIndicator` position for the SelectionLayer to render.
 *
 * `zoom` is used to convert the screen-space snap radius to canvas content-space
 * so the snap zone feels consistent regardless of zoom level.
 */
export function useSnapping(
  objects: CanvasObject[],
  stageSize: StageSize,
  zoom = 1,
  snapRadius = 12,
): {
  snap: SnapFn
  clearSnap: () => void
  snapIndicator: Point | null
} {
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null)

  const snap = useCallback(
    (p: Point, excludeId?: string): SnapResult => {
      // Convert screen-space snap radius to canvas content-space radius
      const effectiveRadius = snapRadius / zoom

      for (const obj of objects) {
        if (obj.id === excludeId) continue
        if (obj.type !== 'line' && obj.type !== 'arrow' && obj.type !== 'dotted') continue

        const startPx = denormalizePoint(obj.start, stageSize)
        if (Math.hypot(p.x - startPx.x, p.y - startPx.y) <= effectiveRadius) {
          setSnapIndicator(startPx)
          return { point: startPx, snapped: true, targetId: obj.id }
        }

        const endPx = denormalizePoint(obj.end, stageSize)
        if (Math.hypot(p.x - endPx.x, p.y - endPx.y) <= effectiveRadius) {
          setSnapIndicator(endPx)
          return { point: endPx, snapped: true, targetId: obj.id }
        }
      }

      setSnapIndicator(null)
      return { point: p, snapped: false }
    },
    [objects, stageSize, zoom, snapRadius],
  )

  const clearSnap = useCallback(() => setSnapIndicator(null), [])

  return { snap, clearSnap, snapIndicator }
}
