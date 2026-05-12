import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { NoteObject } from '../../types/canvasObject'
import {
  getStagePoint,
  normalizePoint,
  createStrokeId,
  type StageSize,
} from '../utils/canvasUtils'

interface UseNoteToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  onObjectComplete: (object: NoteObject) => void
}

export function useNoteTool({ stageRef, stageSize, onObjectComplete }: UseNoteToolOptions) {
  const onPointerDown = useCallback(() => {
    const raw = getStagePoint(stageRef, stageSize)
    if (!raw) return
    const norm = normalizePoint(raw, stageSize)
    onObjectComplete({
      type: 'note',
      id: createStrokeId(),
      createdAt: new Date().toISOString(),
      color: '#1a1a1a',
      width: 'md',
      opacity: 1,
      x: norm.x,
      y: norm.y,
      text: '',
      noteColor: 'yellow',
    })
  }, [stageRef, stageSize, onObjectComplete])

  // Notes are placed on click only — no preview during move.
  const onPointerMove = useCallback(() => {}, [])
  const onPointerUp = useCallback(() => {}, [])

  return { onPointerDown, onPointerMove, onPointerUp }
}
