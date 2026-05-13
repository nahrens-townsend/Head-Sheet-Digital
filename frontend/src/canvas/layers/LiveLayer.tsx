import type React from 'react'
import Konva from 'konva'
import { Layer, Line, Shape } from 'react-konva'
import type { ToolType } from '../../types/stroke'

interface LiveLayerProps {
  liveLineRef: React.RefObject<Konva.Line | null>
  mirrorLiveLineRef: React.RefObject<Konva.Line | null>
  tool: ToolType
  color: string
  strokePixelWidth: number
  previewPoints: number[] | null
  mirrorPreviewPoints?: number[] | null
  isExporting?: boolean
}

const VECTOR_TOOLS: ToolType[] = ['line', 'arrow', 'dotted']

export function LiveLayer({
  liveLineRef,
  mirrorLiveLineRef,
  tool,
  color,
  strokePixelWidth,
  previewPoints,
  mirrorPreviewPoints,
  isExporting = false,
}: LiveLayerProps) {
  if (isExporting) {
    return null
  }

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

      {/* Mirror freehand stroke — updated in real time by usePenTool when symmetry is on */}
      <Line
        ref={mirrorLiveLineRef}
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

      {/* Plain line preview (+ optional mirror) */}
      {previewPoints && tool === 'line' && (
        <>
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
          {mirrorPreviewPoints && (
            <Line
              points={mirrorPreviewPoints}
              stroke={color}
              strokeWidth={strokePixelWidth}
              opacity={1}
              tension={0}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
            />
          )}
        </>
      )}

      {/* Dotted line preview (+ optional mirror) */}
      {previewPoints && tool === 'dotted' && (
        <>
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
          {mirrorPreviewPoints && (
            <Line
              points={mirrorPreviewPoints}
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
        </>
      )}

      {/* Arrow preview — custom Shape matching ObjectsLayer arrowhead fix (bezier stops at base) */}
      {previewPoints && tool === 'arrow' && (
        <>
          <Shape
            stroke={color}
            fill={color}
            strokeWidth={strokePixelWidth}
            opacity={1}
            lineCap="round"
            lineJoin="round"
            strokeScaleEnabled={false}
            sceneFunc={(ctx, shape) => {
              const sx = previewPoints[0] ?? 0
              const sy = previewPoints[1] ?? 0
              const ex = previewPoints[2] ?? sx
              const ey = previewPoints[3] ?? sy
              // During live preview mid is the geometric centre (straight-line equivalent)
              const mx = (sx + ex) / 2
              const my = (sy + ey) / 2
              const dx = ex - mx
              const dy = ey - my
              const len = Math.hypot(dx, dy)
              if (len === 0) return

              const arrowLen = Math.max(strokePixelWidth * 3.5, 10)
              const arrowWid = Math.max(strokePixelWidth * 2, 7)
              const cappedArrowLen = Math.min(arrowLen, len / 2)
              const ux = dx / len
              const uy = dy / len
              const bx = ex - cappedArrowLen * ux
              const by = ey - cappedArrowLen * uy

              ctx.beginPath()
              ctx.moveTo(sx, sy)
              ctx.quadraticCurveTo(mx, my, bx, by)
              ctx.strokeShape(shape)

              const px = -uy
              const py = ux
              ctx.beginPath()
              ctx.moveTo(ex, ey)
              ctx.lineTo(bx + (arrowWid / 2) * px, by + (arrowWid / 2) * py)
              ctx.lineTo(bx - (arrowWid / 2) * px, by - (arrowWid / 2) * py)
              ctx.closePath()
              ctx.fillShape(shape)
            }}
          />
          {mirrorPreviewPoints && (
            <Shape
              stroke={color}
              fill={color}
              strokeWidth={strokePixelWidth}
              opacity={1}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
              sceneFunc={(ctx, shape) => {
                const sx = mirrorPreviewPoints[0] ?? 0
                const sy = mirrorPreviewPoints[1] ?? 0
                const ex = mirrorPreviewPoints[2] ?? sx
                const ey = mirrorPreviewPoints[3] ?? sy
                const mx = (sx + ex) / 2
                const my = (sy + ey) / 2
                const dx = ex - mx
                const dy = ey - my
                const len = Math.hypot(dx, dy)
                if (len === 0) return

                const arrowLen = Math.max(strokePixelWidth * 3.5, 10)
                const arrowWid = Math.max(strokePixelWidth * 2, 7)
                const cappedArrowLen = Math.min(arrowLen, len / 2)
                const ux = dx / len
                const uy = dy / len
                const bx = ex - cappedArrowLen * ux
                const by = ey - cappedArrowLen * uy

                ctx.beginPath()
                ctx.moveTo(sx, sy)
                ctx.quadraticCurveTo(mx, my, bx, by)
                ctx.strokeShape(shape)

                const px = -uy
                const py = ux
                ctx.beginPath()
                ctx.moveTo(ex, ey)
                ctx.lineTo(bx + (arrowWid / 2) * px, by + (arrowWid / 2) * py)
                ctx.lineTo(bx - (arrowWid / 2) * px, by - (arrowWid / 2) * py)
                ctx.closePath()
                ctx.fillShape(shape)
              }}
            />
          )}
        </>
      )}
    </Layer>
  )
}
