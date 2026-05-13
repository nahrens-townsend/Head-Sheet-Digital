import { useCallback, useRef } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { PenStrokeObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoints,
  createStrokeId,
  type Point,
  type StageSize,
  type StrokeSize,
} from '../utils/canvasUtils'

interface UsePenToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  liveLineRef: React.RefObject<Konva.Line | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onObjectComplete: (object: PenStrokeObject) => void
  /** When symmetry is enabled, pass this ref to render the mirrored live stroke. */
  mirrorLiveLineRef?: React.RefObject<Konva.Line | null>
  /**
   * Returns the normalized axisX (0–1) for a given pixel-space point.
   * Required when mirrorLiveLineRef is provided.
   */
  getAxisX?: (pointPx: Point) => number
}

export function usePenTool({
  stageRef,
  liveLineRef,
  stageSize,
  color,
  strokeSize,
  onObjectComplete,
  mirrorLiveLineRef,
  getAxisX,
}: UsePenToolOptions) {
  const isDrawingRef = useRef(false)
  const currentPointsRef = useRef<number[]>([])
  const mirrorPointsRef = useRef<number[]>([])
  const axisXpxRef = useRef<number>(0)

  const onPointerDown = useCallback(
    () => {
      const point = getStagePoint(stageRef, stageSize)
      if (!point) {
        return
      }

      isDrawingRef.current = true
      currentPointsRef.current = [point.x, point.y]
      liveLineRef.current?.points(currentPointsRef.current)
      liveLineRef.current?.getLayer()?.batchDraw()

      if (mirrorLiveLineRef && getAxisX) {
        const axisX = getAxisX(point)
        axisXpxRef.current = axisX * stageSize.width
        const mx = 2 * axisXpxRef.current - point.x
        mirrorPointsRef.current = [mx, point.y]
        mirrorLiveLineRef.current?.points(mirrorPointsRef.current)
        mirrorLiveLineRef.current?.getLayer()?.batchDraw()
      }
    },
    [liveLineRef, mirrorLiveLineRef, getAxisX, stageRef, stageSize],
  )

  const onPointerMove = useCallback(
    () => {
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

      if (mirrorLiveLineRef?.current) {
        const mx = 2 * axisXpxRef.current - point.x
        mirrorPointsRef.current.push(mx, point.y)
        mirrorLiveLineRef.current.points(mirrorPointsRef.current)
        mirrorLiveLineRef.current.getLayer()?.batchDraw()
      }
    },
    [liveLineRef, mirrorLiveLineRef, stageRef, stageSize],
  )

  const onPointerUp = useCallback(
    () => {
      if (!isDrawingRef.current || currentPointsRef.current.length < 2) {
        isDrawingRef.current = false
        currentPointsRef.current = []
        mirrorPointsRef.current = []
        liveLineRef.current?.points([])
        liveLineRef.current?.getLayer()?.batchDraw()
        mirrorLiveLineRef?.current?.points([])
        mirrorLiveLineRef?.current?.getLayer()?.batchDraw()
        return
      }

      const points =
        currentPointsRef.current.length === 2
          ? [...currentPointsRef.current, ...currentPointsRef.current]
          : currentPointsRef.current

      onObjectComplete({
        type: 'pen',
        id: createStrokeId(),
        color,
        width: strokeSize,
        opacity: 1,
        points: normalizePoints(points, stageSize),
        tension: 0.35,
        createdAt: new Date().toISOString(),
      })

      isDrawingRef.current = false
      currentPointsRef.current = []
      mirrorPointsRef.current = []
      liveLineRef.current?.points([])
      liveLineRef.current?.getLayer()?.batchDraw()
      mirrorLiveLineRef?.current?.points([])
      mirrorLiveLineRef?.current?.getLayer()?.batchDraw()
    },
    [strokeSize, color, liveLineRef, mirrorLiveLineRef, onObjectComplete, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
  }
}
