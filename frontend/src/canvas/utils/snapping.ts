import { useState, useCallback } from 'react'
import type { CanvasObject } from '../../types/canvasObject'
import { denormalizePoint, type Point, type StageSize } from './canvasUtils'
import type { ResolvedGuidePoint } from './guidePoints'

export interface SnapResult {
  point: Point
  snapped: boolean
  targetId?: string
}

export type SnapFn = (p: Point, excludeId?: string) => SnapResult

/** Snap indicator carries the snap position and a color so guide-point snaps can render red. */
export interface SnapIndicator {
  point: Point
  color: string
}

const ENDPOINT_SNAP_COLOR = '#aa3bff'
const GUIDE_SNAP_COLOR = '#ff2222'

/**
 * Canvas-level snapping hook.  Priority order:
 *   1. LineObject endpoint snap (purple indicator)
 *   2. Guide point snap (red indicator)
 *
 * `zoom` is used to convert the screen-space snap radius to canvas content-space
 * so the snap zone feels consistent regardless of zoom level.
 */
export function useSnapping(
  objects: CanvasObject[],
  stageSize: StageSize,
  zoom = 1,
  snapRadius = 12,
  guidePoints: ResolvedGuidePoint[] = [],
): {
  snap: SnapFn
  clearSnap: () => void
  snapIndicator: SnapIndicator | null
} {
  const [snapIndicator, setSnapIndicator] = useState<SnapIndicator | null>(null)

  const snap = useCallback(
    (p: Point, excludeId?: string): SnapResult => {
      const effectiveRadius = snapRadius / zoom

      // 1. Endpoint snap (highest priority)
      for (const obj of objects) {
        if (obj.id === excludeId) continue
        if (obj.type !== 'line' && obj.type !== 'arrow' && obj.type !== 'dotted') continue

        const startPx = denormalizePoint(obj.start, stageSize)
        if (Math.hypot(p.x - startPx.x, p.y - startPx.y) <= effectiveRadius) {
          setSnapIndicator({ point: startPx, color: ENDPOINT_SNAP_COLOR })
          return { point: startPx, snapped: true, targetId: obj.id }
        }

        const endPx = denormalizePoint(obj.end, stageSize)
        if (Math.hypot(p.x - endPx.x, p.y - endPx.y) <= effectiveRadius) {
          setSnapIndicator({ point: endPx, color: ENDPOINT_SNAP_COLOR })
          return { point: endPx, snapped: true, targetId: obj.id }
        }
      }

      // 2. Guide point snap
      for (const gpt of guidePoints) {
        if (Math.hypot(p.x - gpt.absolutePx.x, p.y - gpt.absolutePx.y) <= effectiveRadius) {
          setSnapIndicator({ point: gpt.absolutePx, color: GUIDE_SNAP_COLOR })
          return { point: gpt.absolutePx, snapped: true }
        }
      }

      setSnapIndicator(null)
      return { point: p, snapped: false }
    },
    [objects, stageSize, zoom, snapRadius, guidePoints],
  )

  const clearSnap = useCallback(() => setSnapIndicator(null), [])

  return { snap, clearSnap, snapIndicator }
}
