import type React from 'react'
import Konva from 'konva'
import { Layer, Line } from 'react-konva'
import type { ToolType } from '../../types/stroke'

interface LiveLayerProps {
  liveLineRef: React.RefObject<Konva.Line | null>
  tool: ToolType
  color: string
  strokePixelWidth: number
  previewPoints: number[] | null
}

export function LiveLayer({
  liveLineRef,
  tool,
  color,
  strokePixelWidth,
  previewPoints,
}: LiveLayerProps) {
  const liveStrokeColor = tool === 'eraser' ? '#ffffff' : color
  const liveStrokeWidth = tool === 'eraser' ? strokePixelWidth * 2 : strokePixelWidth

  return (
    <Layer listening={false}>
      <Line
        ref={liveLineRef}
        points={[]}
        stroke={liveStrokeColor}
        strokeWidth={liveStrokeWidth}
        opacity={1}
        tension={tool === 'line' ? 0 : 0.35}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        visible={tool !== 'line'}
      />
      {previewPoints && tool === 'line' && (
        <Line
          points={previewPoints}
          stroke={color}
          strokeWidth={strokePixelWidth}
          opacity={1}
          tension={0}
          lineCap="round"
          lineJoin="round"
          strokeScaleEnabled={false}
        />
      )}
    </Layer>
  )
}
