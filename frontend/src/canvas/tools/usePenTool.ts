import { useCallback, useRef } from 'react'
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

interface UsePenToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  liveLineRef: React.RefObject<Konva.Line | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onStrokeComplete: (stroke: Stroke) => void
}

export function usePenTool({
  stageRef,
  liveLineRef,
  stageSize,
  color,
  strokeSize,
  onStrokeComplete,
}: UsePenToolOptions) {
  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<number[]>([])

  const onPointerDown = useCallback(
    (_event: StagePointerEvent) => {
      const point = getStagePoint(stageRef, stageSize)
      if (!point) {
        return
      }

      isDrawingRef.current = true
      currentPointsRef.current = [point.x, point.y]
      liveLineRef.current?.points(currentPointsRef.current)
      liveLineRef.current?.getLayer()?.batchDraw()
    },
    [liveLineRef, stageRef, stageSize],
  )

  const onPointerMove = useCallback(
    (_event: StagePointerEvent) => {
      if (!isDrawingRef.current) {
        return
      }

      if (!liveLineRef.current) {
        return
      }

      const point = getStagePoint(stageRef, stageSize)
      if (!point) {
        return
      }

      currentPointsRef.current.push(point.x, point.y)
      liveLineRef.current.points(currentPointsRef.current)
      liveLineRef.current.getLayer()?.batchDraw()
    },
    [liveLineRef, stageRef, stageSize],
  )

  const onPointerUp = useCallback(
    (_event: StagePointerEvent) => {
      if (!isDrawingRef.current || currentPointsRef.current.length < 2) {
        isDrawingRef.current = false
        currentPointsRef.current = []
        liveLineRef.current?.points([])
        liveLineRef.current?.getLayer()?.batchDraw()
        return
      }

      const points =
        currentPointsRef.current.length === 2
          ? [...currentPointsRef.current, ...currentPointsRef.current]
          : currentPointsRef.current

      onStrokeComplete({
        id: createStrokeId(),
        tool: 'pen',
        color,
        width: STROKE_SIZES[strokeSize],
        opacity: 1,
        points: normalizePoints(points, stageSize),
        tension: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
        createdAt: new Date().toISOString(),
      })

      isDrawingRef.current = false
      currentPointsRef.current = []
      liveLineRef.current?.points([])
      liveLineRef.current?.getLayer()?.batchDraw()
    },
    [strokeSize, color, liveLineRef, onStrokeComplete, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
