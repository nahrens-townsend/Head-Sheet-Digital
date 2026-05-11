import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva'
import type { StageSize } from '../utils/canvasUtils'

const GRID_SPACING = 20
const GRID_STROKE = 'rgba(0,0,0,0.06)'
const GRID_STROKE_WIDTH = 0.5

interface BackgroundLayerProps {
  stageSize: StageSize
  templateImage: HTMLImageElement | null
  templateRect: { x: number; y: number; width: number; height: number } | null
}

export function BackgroundLayer({ stageSize, templateImage, templateRect }: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#ffffff" />
      <Shape
        stroke={GRID_STROKE}
        strokeWidth={GRID_STROKE_WIDTH}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath()
          for (let x = GRID_SPACING; x < stageSize.width; x += GRID_SPACING) {
            ctx.moveTo(x, 0)
            ctx.lineTo(x, stageSize.height)
          }
          for (let y = GRID_SPACING; y < stageSize.height; y += GRID_SPACING) {
            ctx.moveTo(0, y)
            ctx.lineTo(stageSize.width, y)
          }
          ctx.strokeShape(shape)
        }}
      />
      {templateRect && templateImage && (
        <KonvaImage
          image={templateImage}
          x={templateRect.x}
          y={templateRect.y}
          width={templateRect.width}
          height={templateRect.height}
          opacity={0.9}
        />
      )}
    </Layer>
  )
}
