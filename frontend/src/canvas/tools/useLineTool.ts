import { useCallback, useState } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { LineObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoint,
  createStrokeId,
  type StageSize,
  type StagePointerEvent,
  type StrokeSize,
} from '../utils/canvasUtils'

interface UseLineToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onObjectComplete: (object: LineObject) => void
}

export function useLineTool({
  stageRef,
  stageSize,
  color,
  strokeSize,
  onObjectComplete,
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
      const [px0 = 0, py0 = 0] = previewPoints
      const endX = point ? point.x : (previewPoints[2] ?? px0)
      const endY = point ? point.y : (previewPoints[3] ?? py0)

      const startPx = { x: px0, y: py0 }
      const endPx = { x: endX, y: endY }
      const midPx = { x: (px0 + endX) / 2, y: (py0 + endY) / 2 }

      onObjectComplete({
        type: 'line',
        id: createStrokeId(),
        color,
        width: strokeSize,
        opacity: 1,
        start: normalizePoint(startPx, stageSize),
        mid: normalizePoint(midPx, stageSize),
        end: normalizePoint(endPx, stageSize),
        createdAt: new Date().toISOString(),
      })

      setPreviewPoints(null)
    },
    [strokeSize, color, onObjectComplete, previewPoints, stageRef, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    previewPoints,
  }
}
