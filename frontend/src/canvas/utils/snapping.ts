import { useState, useCallback } from 'react'
import type { CanvasObject } from '../../types/canvasObject'
import type { Point } from './canvasUtils'
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
 * All coordinates are in world pixels [0..WORLD_SIZE].
 * `zoom` and `fitScale` are used to convert the screen-space snap radius to
 * world-space pixels so the snap zone feels consistent regardless of zoom level
 * or container size.
 */
export function useSnapping(
  objects: CanvasObject[],
  zoom = 1,
  snapRadius = 12,
  guidePoints: ResolvedGuidePoint[] = [],
  fitScale = 1,
): {
  snap: SnapFn
  clearSnap: () => void
  snapIndicator: SnapIndicator | null
} {
  const [snapIndicator, setSnapIndicator] = useState<SnapIndicator | null>(null)

  const snap = useCallback(
    (p: Point, excludeId?: string): SnapResult => {
      const effectiveRadius = snapRadius / (fitScale * zoom)

      // 1. Endpoint snap (highest priority)
      for (const obj of objects) {
        if (obj.id === excludeId) continue
        if (obj.type !== 'line' && obj.type !== 'arrow' && obj.type !== 'dotted') continue

        if (Math.hypot(p.x - obj.start.x, p.y - obj.start.y) <= effectiveRadius) {
          setSnapIndicator({ point: obj.start, color: ENDPOINT_SNAP_COLOR })
          return { point: obj.start, snapped: true, targetId: obj.id }
        }

        if (Math.hypot(p.x - obj.end.x, p.y - obj.end.y) <= effectiveRadius) {
          setSnapIndicator({ point: obj.end, color: ENDPOINT_SNAP_COLOR })
          return { point: obj.end, snapped: true, targetId: obj.id }
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
    [objects, zoom, fitScale, snapRadius, guidePoints],
  )

  const clearSnap = useCallback(() => setSnapIndicator(null), [])

  return { snap, clearSnap, snapIndicator }
}
