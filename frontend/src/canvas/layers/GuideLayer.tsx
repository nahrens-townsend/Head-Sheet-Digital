import { Circle, Layer, Line } from 'react-konva'
import type { TemplateLayout } from '../utils/layoutEngine'
import { resolveGuidePoints } from '../utils/guidePoints'

const AXIS_COLOR = 'rgba(255,34,34,0.35)'
const AXIS_STROKE_WIDTH = 1
const AXIS_DASH = [6, 4]
const GUIDE_RADIUS = 5

interface GuideLayerProps {
  layouts: TemplateLayout[]
  showGuides: boolean
  isExporting?: boolean
}

export function GuideLayer({ layouts, showGuides, isExporting = false }: GuideLayerProps) {
  if (!showGuides || isExporting) return null

  const resolvedPoints = resolveGuidePoints(layouts)

  return (
    <Layer listening={false}>
      {/* Dashed vertical center-axis line per template */}
      {layouts.map((layout) => {
        const cx = layout.rect.x + layout.rect.width * 0.5
        return (
          <Line
            key={`axis-${layout.type}`}
            points={[cx, layout.rect.y, cx, layout.rect.y + layout.rect.height]}
            stroke={AXIS_COLOR}
            strokeWidth={AXIS_STROKE_WIDTH}
            dash={AXIS_DASH}
            strokeScaleEnabled={false}
            listening={false}
          />
        )
      })}

      {/* Guide point dots */}
      {resolvedPoints.map((pt) => (
        <Circle
          key={pt.id}
          x={pt.absolutePx.x}
          y={pt.absolutePx.y}
          radius={GUIDE_RADIUS}
          fill={pt.color}
          listening={false}
        />
      ))}
    </Layer>
  )
}
