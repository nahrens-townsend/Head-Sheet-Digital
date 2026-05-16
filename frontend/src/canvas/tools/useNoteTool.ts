import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { NoteObject } from '../../types/canvasObject'
import {
  getStagePoint,
  createStrokeId,
} from '../utils/canvasUtils'

interface UseNoteToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  onObjectComplete: (object: NoteObject) => void
}

export function useNoteTool({ stageRef, onObjectComplete }: UseNoteToolOptions) {
  const onPointerDown = useCallback(() => {
    const raw = getStagePoint(stageRef)
    if (!raw) return
    // Coordinates stored in world pixels [0..WORLD_SIZE] — no normalization needed.
    onObjectComplete({
      type: 'note',
      id: createStrokeId(),
      createdAt: new Date().toISOString(),
      color: '#1a1a1a',
      width: 'md',
      opacity: 1,
      x: raw.x,
      y: raw.y,
      text: '',
      noteColor: 'yellow',
    })
  }, [stageRef, onObjectComplete])

  // Notes are placed on click only — no preview during move.
  const onPointerMove = useCallback(() => {}, [])
  const onPointerUp = useCallback(() => {}, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
