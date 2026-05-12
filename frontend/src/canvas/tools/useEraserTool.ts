import { useCallback, useRef } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { CanvasObject } from '../../types/canvasObject'
import {
  getStagePoint,
  type StageSize,
} from '../utils/canvasUtils'
import { hitTestCanvasObject, eraserThreshold } from '../utils/hitTest'

interface UseEraserToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  objects: CanvasObject[]
  onDeleteObjects: (ids: string[]) => void
}

export function useEraserTool({
  stageRef,
  stageSize,
  objects,
  onDeleteObjects,
}: UseEraserToolOptions) {
  const isActiveRef = useRef(false)
  // IDs collected during the current gesture — committed as one undo entry on pointerUp
  const pendingRef = useRef<Set<string>>(new Set())

  const collectHits = useCallback(
    (px: { x: number; y: number }) => {
      objects
        .filter(
          (obj) =>
            // never delete legacy raster-eraser masks (destination-out objects)
            obj.type !== 'eraser' &&
            !pendingRef.current.has(obj.id) &&
            hitTestCanvasObject(obj, px, stageSize, eraserThreshold(obj)),
        )
        .forEach((obj) => pendingRef.current.add(obj.id))
    },
    [objects, stageSize],
  )

  const onPointerDown = useCallback(
    () => {
      const px = getStagePoint(stageRef, stageSize)
      if (!px) return
      isActiveRef.current = true
      pendingRef.current = new Set()
      collectHits(px)
    },
    [collectHits, stageRef, stageSize],
  )

  const onPointerMove = useCallback(
    () => {
      if (!isActiveRef.current) return
      const px = getStagePoint(stageRef, stageSize)
      if (!px) return
      collectHits(px)
    },
    [collectHits, stageRef, stageSize],
  )

  // Commit the whole gesture as a single undo step on pointer-up
  const onPointerUp = useCallback(
    () => {
      isActiveRef.current = false
      const ids = [...pendingRef.current]
      pendingRef.current = new Set()
      if (ids.length > 0) onDeleteObjects(ids)
    },
    [onDeleteObjects],
  )

  return { onPointerDown, onPointerMove, onPointerUp }
}
