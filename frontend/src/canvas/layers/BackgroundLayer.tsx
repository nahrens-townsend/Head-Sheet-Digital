import { Image as KonvaImage, Layer, Rect } from 'react-konva'
import type { StageSize } from '../utils/canvasUtils'

interface BackgroundLayerProps {
  stageSize: StageSize
  templateImage: HTMLImageElement | null
  templateRect: { x: number; y: number; width: number; height: number } | null
}

export function BackgroundLayer({ stageSize, templateImage, templateRect }: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#ffffff" />
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
