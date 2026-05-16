import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { TextObject } from '../../types/canvasObject'
import {
  getStagePoint,
  createStrokeId,
} from '../utils/canvasUtils'

interface UseTextToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  color: string
  onObjectComplete: (object: TextObject) => void
}

export function useTextTool({ stageRef, color, onObjectComplete }: UseTextToolOptions) {
  const onPointerDown = useCallback(() => {
    const raw = getStagePoint(stageRef)
    if (!raw) return
    // Coordinates stored in world pixels [0..WORLD_SIZE] — no normalization needed.
    onObjectComplete({
      type: 'text',
      id: createStrokeId(),
      createdAt: new Date().toISOString(),
      color,
      width: 'md',
      opacity: 1,
      x: raw.x,
      y: raw.y,
      text: '',
    })
  }, [stageRef, color, onObjectComplete])

  // Text is placed on click only — no preview during move.
  const onPointerMove = useCallback(() => {}, [])
  const onPointerUp = useCallback(() => {}, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
