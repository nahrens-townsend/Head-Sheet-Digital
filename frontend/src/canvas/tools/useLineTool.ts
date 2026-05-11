import { useCallback, useState } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { Stroke } from '../../types/stroke'
import {
  getStagePoint,
  normalizePoints,
  createStrokeId,
  STROKE_SIZES,
  type StageSize,
  type StagePointerEvent,
  type StrokeSize,
} from '../utils/canvasUtils'

interface UseLineToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onStrokeComplete: (stroke: Stroke) => void
}

export function useLineTool({
  stageRef,
  stageSize,
  color,
  strokeSize,
  onStrokeComplete,
}: UseLineToolOptions) {
  const [previewPoints, setPreviewPoints] = useState<number[] | null>(null)

  const onPointerDown = useCallback(
    (_event: StagePointerEvent) => {
      const point = getStagePoint(stageRef, stageSize)
      if (!point) {
        return
      }

      setPreviewPoints([point.x, point.y, point.x, point.y])
    },
    [stageRef, stageSize],
  )

  const onPointerMove = useCallback(
    (_event: StagePointerEvent) => {
      if (!previewPoints) {
        return
      }

      const point = getStagePoint(stageRef, stageSize)
      if (!point) {
        return
      }

      setPreviewPoints([previewPoints[0], previewPoints[1], point.x, point.y])
    },
    [previewPoints, stageRef, stageSize],
  )

  const onPointerUp = useCallback(
    (_event: StagePointerEvent) => {
      if (!previewPoints) {
        return
      }

      const point = getStagePoint(stageRef, stageSize)
      const finalPoints = point
        ? [previewPoints[0], previewPoints[1], point.x, point.y]
        : previewPoints

      onStrokeComplete({
        id: createStrokeId(),
        tool: 'line',
        color,
        width: STROKE_SIZES[strokeSize],
        opacity: 1,
        points: normalizePoints(finalPoints, stageSize),
        tension: 0,
        lineCap: 'round',
        lineJoin: 'round',
        createdAt: new Date().toISOString(),
      })

      setPreviewPoints(null)
    },
    [strokeSize, color, onStrokeComplete, previewPoints, stageRef, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    previewPoints,
  }
}
