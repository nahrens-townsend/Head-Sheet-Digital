import { useCallback, useState } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { LineObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoint,
  createStrokeId,
  type Point,
  type StageSize,
  type StagePointerEvent,
  type StrokeSize,
} from '../utils/canvasUtils'
import type { SnapFn } from '../utils/snapping'

export interface UseVectorLineToolOptions {
  type: 'line' | 'arrow' | 'dotted'
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onObjectComplete: (object: LineObject) => void
  snap?: SnapFn
  clearSnap?: () => void
}

export function useVectorLineTool({
  type,
  stageRef,
  stageSize,
  color,
  strokeSize,
  onObjectComplete,
  snap,
  clearSnap,
}: UseVectorLineToolOptions) {
  const [previewPoints, setPreviewPoints] = useState<number[] | null>(null)

  const onPointerDown = useCallback(
    (_event: StagePointerEvent) => {
      const raw = getStagePoint(stageRef, stageSize)
      if (!raw) return
      const { point } = snap ? snap(raw) : { point: raw }
      setPreviewPoints([point.x, point.y, point.x, point.y])
    },
    [snap, stageRef, stageSize],
  )

  const onPointerMove = useCallback(
    (_event: StagePointerEvent) => {
      if (!previewPoints) return
      const raw = getStagePoint(stageRef, stageSize)
      if (!raw) return
      const { point } = snap ? snap(raw) : { point: raw }
      setPreviewPoints([previewPoints[0], previewPoints[1], point.x, point.y])
    },
    [previewPoints, snap, stageRef, stageSize],
  )

  const onPointerUp = useCallback(
    (_event: StagePointerEvent) => {
      if (!previewPoints) return

      const raw = getStagePoint(stageRef, stageSize)
      const [px0 = 0, py0 = 0] = previewPoints
      const rawEnd = raw ?? { x: previewPoints[2] ?? px0, y: previewPoints[3] ?? py0 }
      const endPoint: Point = snap ? snap(rawEnd).point : rawEnd

      const startPx: Point = { x: px0, y: py0 }
      const midPx: Point = { x: (px0 + endPoint.x) / 2, y: (py0 + endPoint.y) / 2 }

      onObjectComplete({
        type,
        id: createStrokeId(),
        color,
        width: strokeSize,
        opacity: 1,
        start: normalizePoint(startPx, stageSize),
        mid: normalizePoint(midPx, stageSize),
        end: normalizePoint(endPoint, stageSize),
        createdAt: new Date().toISOString(),
      })

      setPreviewPoints(null)
      clearSnap?.()
    },
    [type, strokeSize, color, onObjectComplete, previewPoints, snap, clearSnap, stageRef, stageSize],
  )

  return { onPointerDown, onPointerMove, onPointerUp, previewPoints }
}
