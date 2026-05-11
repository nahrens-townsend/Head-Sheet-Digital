import { useCallback, useRef } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { EraserStrokeObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoints,
  createStrokeId,
  type StageSize,
  type StagePointerEvent,
  type StrokeSize,
} from '../utils/canvasUtils'

interface UseEraserToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  liveLineRef: React.RefObject<Konva.Line | null>
  stageSize: StageSize
  strokeSize: StrokeSize
  onObjectComplete: (object: EraserStrokeObject) => void
}

export function useEraserTool({
  stageRef,
  liveLineRef,
  stageSize,
  strokeSize,
  onObjectComplete,
}: UseEraserToolOptions) {
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

      onObjectComplete({
        type: 'eraser',
        id: createStrokeId(),
        color: '#ffffff',
        width: strokeSize,
        opacity: 1,
        points: normalizePoints(points, stageSize),
        tension: 0.35,
        createdAt: new Date().toISOString(),
      })

      isDrawingRef.current = false
      currentPointsRef.current = []
      liveLineRef.current?.points([])
      liveLineRef.current?.getLayer()?.batchDraw()
    },
    [strokeSize, liveLineRef, onObjectComplete, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
