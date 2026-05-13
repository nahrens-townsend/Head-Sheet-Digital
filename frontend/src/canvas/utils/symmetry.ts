import type { LineObject } from '../../types/canvasObject'
import type { TemplateLayout } from './layoutEngine'
import type { StageSize } from './canvasUtils'

/**
 * Mirrors a LineObject's x-coordinates across a vertical axis in normalized space.
 * Formula: x' = 2*axisX - x.  y-coordinates and the mid control-point are mirrored
 * the same way.  The caller is responsible for assigning new id / mirrorId / createdAt.
 */
export function mirrorLineAcrossAxis(line: LineObject, axisX: number): LineObject {
  const mx = (x: number) => 2 * axisX - x
  return {
    ...line,
    start: { x: mx(line.start.x), y: line.start.y },
    mid:   { x: mx(line.mid.x),   y: line.mid.y   },
    end:   { x: mx(line.end.x),   y: line.end.y   },
  }
}

/**
 * Returns the normalized axis X (vertical center) of the template layout whose
 * rect contains the given pixel-space point.  When the point falls in a gap
 * between templates (padding/outer-pad areas) the nearest rect center is used
 * so symmetry stays anchored to a real template axis rather than the global 0.5.
 * Falls back to 0.5 only when there are no layouts (image mode).
 */
export function findAxisXForPoint(
  pointPx: { x: number; y: number },
  layouts: TemplateLayout[],
  stageSize: StageSize,
): number {
  if (layouts.length === 0) return 0.5

  // Exact containment first.
  for (const layout of layouts) {
    const { x, y, width, height } = layout.rect
    if (
      pointPx.x >= x &&
      pointPx.x <= x + width &&
      pointPx.y >= y &&
      pointPx.y <= y + height
    ) {
      return (x + width / 2) / stageSize.width
    }
  }

  // No exact match — use the nearest rect center (squared distance from point to center).
  let bestAxisX = (layouts[0].rect.x + layouts[0].rect.width / 2) / stageSize.width
  let bestDist = Infinity
  for (const layout of layouts) {
    const cx = layout.rect.x + layout.rect.width / 2
    const cy = layout.rect.y + layout.rect.height / 2
    const dist = (pointPx.x - cx) ** 2 + (pointPx.y - cy) ** 2
    if (dist < bestDist) {
      bestDist = dist
      bestAxisX = cx / stageSize.width
    }
  }
  return bestAxisX
}
