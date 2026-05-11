import { useCallback, useRef } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { Stroke } from '../../types/stroke'

interface StageSize {
  width: number
  height: number
}

interface UseEraserToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  liveLineRef: React.RefObject<Konva.Line | null>
  stageSize: StageSize
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

export function useEraserTool({
  stageRef,
  liveLineRef,
  stageSize,
  brushSize,
  onStrokeComplete,
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

      onStrokeComplete({
        id: createStrokeId(),
        tool: 'eraser',
        color: '#ffffff',
        width: brushSize * 2,
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
    [brushSize, liveLineRef, onStrokeComplete, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
