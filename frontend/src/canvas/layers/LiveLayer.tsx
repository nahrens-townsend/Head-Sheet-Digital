import type React from 'react'
import Konva from 'konva'
import { Layer, Line, Arrow } from 'react-konva'
import type { ToolType } from '../../types/stroke'

interface LiveLayerProps {
  liveLineRef: React.RefObject<Konva.Line | null>
  tool: ToolType
  color: string
  strokePixelWidth: number
  previewPoints: number[] | null
}

const VECTOR_TOOLS: ToolType[] = ['line', 'arrow', 'dotted']

export function LiveLayer({
  liveLineRef,
  tool,
  color,
  strokePixelWidth,
  previewPoints,
}: LiveLayerProps) {
  const liveStrokeColor = tool === 'eraser' ? '#ffffff' : color
  const liveStrokeWidth = tool === 'eraser' ? strokePixelWidth * 2 : strokePixelWidth
  const isVectorTool = VECTOR_TOOLS.includes(tool)

  return (
    <Layer listening={false}>
      {/* Freehand pen / eraser live stroke (hidden while drawing vector lines) */}
      <Line
        ref={liveLineRef}
        points={[]}
        stroke={liveStrokeColor}
        strokeWidth={liveStrokeWidth}
        opacity={1}
        tension={0.35}
        lineCap="round"
        lineJoin="round"
        strokeScaleEnabled={false}
        visible={!isVectorTool}
      />

      {/* Plain line preview */}
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

      {/* Dotted line preview */}
      {previewPoints && tool === 'dotted' && (
        <Line
          points={previewPoints}
          stroke={color}
          strokeWidth={strokePixelWidth}
          opacity={1}
          tension={0}
          lineCap="round"
          lineJoin="round"
          strokeScaleEnabled={false}
          dash={[strokePixelWidth * 2, strokePixelWidth * 2]}
        />
      )}

      {/* Arrow preview — uses Konva's built-in Arrow for straight-line draw gesture */}
      {previewPoints && tool === 'arrow' && (
        <Arrow
          points={previewPoints}
          stroke={color}
          fill={color}
          strokeWidth={strokePixelWidth}
          opacity={1}
          lineCap="round"
          lineJoin="round"
          strokeScaleEnabled={false}
          pointerLength={Math.max(strokePixelWidth * 3.5, 10)}
          pointerWidth={Math.max(strokePixelWidth * 2, 7)}
        />
      )}
    </Layer>
  )
}
