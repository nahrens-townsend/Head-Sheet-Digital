import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { TextObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoint,
  createStrokeId,
  type StageSize,
} from '../utils/canvasUtils'

interface UseTextToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  onObjectComplete: (object: TextObject) => void
}

export function useTextTool({ stageRef, stageSize, color, onObjectComplete }: UseTextToolOptions) {
  const onPointerDown = useCallback(() => {
    const raw = getStagePoint(stageRef, stageSize)
    if (!raw) return
    const norm = normalizePoint(raw, stageSize)
    onObjectComplete({
      type: 'text',
      id: createStrokeId(),
      createdAt: new Date().toISOString(),
      color,
      width: 'md',
      opacity: 1,
      x: norm.x,
      y: norm.y,
      text: '',
    })
  }, [stageRef, stageSize, color, onObjectComplete])

  // Text is placed on click only — no preview during move.
  const onPointerMove = useCallback(() => {}, [])
  const onPointerUp = useCallback(() => {}, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
