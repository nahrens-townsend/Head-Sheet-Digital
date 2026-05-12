import type { TemplateType } from '../../types/headSheet'
import type { TemplateLayout } from './layoutEngine'
import type { Point } from './canvasUtils'

export interface GuidePoint {
  id: string
  label: 'center' | 'topCenter' | 'bottomCenter'
  /** Position relative to the template rect: [0, 1] in local rect space. */
  relX: number
  relY: number
  color: string
}

export const TEMPLATE_GUIDE_POINTS: Record<TemplateType, GuidePoint[]> = {
  front: [
    { id: 'front-center',       label: 'center',       relX: 0.5, relY: 0.5,  color: '#ff2222' },
    { id: 'front-topCenter',    label: 'topCenter',    relX: 0.5, relY: 0.08, color: '#ff2222' },
    { id: 'front-bottomCenter', label: 'bottomCenter', relX: 0.5, relY: 0.92, color: '#ff2222' },
  ],
  back: [
    { id: 'back-center',       label: 'center',       relX: 0.5, relY: 0.5,  color: '#ff2222' },
    { id: 'back-topCenter',    label: 'topCenter',    relX: 0.5, relY: 0.08, color: '#ff2222' },
    { id: 'back-bottomCenter', label: 'bottomCenter', relX: 0.5, relY: 0.92, color: '#ff2222' },
  ],
  side: [
    { id: 'side-center',       label: 'center',       relX: 0.5, relY: 0.5,  color: '#ff2222' },
    { id: 'side-topCenter',    label: 'topCenter',    relX: 0.5, relY: 0.08, color: '#ff2222' },
    { id: 'side-bottomCenter', label: 'bottomCenter', relX: 0.5, relY: 0.92, color: '#ff2222' },
  ],
  top: [
    { id: 'top-center',       label: 'center',       relX: 0.5, relY: 0.5,  color: '#ff2222' },
    { id: 'top-topCenter',    label: 'topCenter',    relX: 0.5, relY: 0.08, color: '#ff2222' },
    { id: 'top-bottomCenter', label: 'bottomCenter', relX: 0.5, relY: 0.92, color: '#ff2222' },
  ],
}

export interface ResolvedGuidePoint extends GuidePoint {
  absolutePx: Point
}

/** Converts guide-point relative coords to absolute canvas pixel positions based on the given layouts. */
export function resolveGuidePoints(layouts: TemplateLayout[]): ResolvedGuidePoint[] {
  const result: ResolvedGuidePoint[] = []
  for (const layout of layouts) {
    const pts = TEMPLATE_GUIDE_POINTS[layout.type] ?? []
    for (const pt of pts) {
      result.push({
        ...pt,
        absolutePx: {
          x: layout.rect.x + pt.relX * layout.rect.width,
          y: layout.rect.y + pt.relY * layout.rect.height,
        },
      })
    }
  }
  return result
}
