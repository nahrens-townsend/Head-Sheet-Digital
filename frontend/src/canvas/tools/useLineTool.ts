import { useCallback, useState } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { Stroke } from '../../types/stroke'

interface StageSize {
  width: number
  height: number
}

interface UseLineToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  brushSize: number
  onStrokeComplete: (stroke: Stroke) => void
}

type StagePointerEvent = Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>

function getStagePoint(stageRef: React.RefObject<Konva.Stage | null>, stageSize: StageSize) {
  const stage = stageRef.current
  const point = stage?.getPointerPosition()

  if (!stage || !point || stageSize.width <= 0 || stageSize.height <= 0) {
    return null
  }

  return {
    x: Math.min(Math.max(point.x, 0), stageSize.width),
    y: Math.min(Math.max(point.y, 0), stageSize.height),
  }
}

function normalizePoints(points: number[], stageSize: StageSize) {
  return points.map((value, index) =>
    index % 2 === 0 ? value / stageSize.width : value / stageSize.height,
  )
}

function createStrokeId() {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useLineTool({
  stageRef,
  stageSize,
  color,
  brushSize,
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
        width: brushSize,
        opacity: 1,
        points: normalizePoints(finalPoints, stageSize),
        tension: 0,
        lineCap: 'round',
        lineJoin: 'round',
        createdAt: new Date().toISOString(),
      })

      setPreviewPoints(null)
    },
    [brushSize, color, onStrokeComplete, previewPoints, stageRef, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    previewPoints,
  }
}
