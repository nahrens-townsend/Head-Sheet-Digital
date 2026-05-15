import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { CanvasObject } from '../../types/canvasObject'
import { getStagePoint, type StageSize, type StagePointerEvent } from '../utils/canvasUtils'
import { hitTestCanvasObject, selectThreshold } from '../utils/hitTest'
import { useCanvasStore } from '../../stores/canvasStore'

interface UseSelectToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  objects: CanvasObject[]
}

export function useSelectTool({ stageRef, stageSize, objects }: UseSelectToolOptions) {
  const { setSelectedObjectIds } = useCanvasStore()

  const onPointerDown = useCallback(
    (event: StagePointerEvent) => {
      // If the pointer landed on a draggable node (e.g. a control handle), let
      // Konva handle it and don't change the selection.
      if ((event.target as Konva.Node).draggable?.()) return

      const px = getStagePoint(stageRef, stageSize)
      if (!px) return

      // Find the topmost (last drawn) hittable object.
      for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i]
        if (
          hitTestCanvasObject(obj, px, stageSize, selectThreshold(obj))
        ) {
          const mirrorId = 'mirrorId' in obj ? (obj as { mirrorId?: string }).mirrorId : undefined
          const ids = mirrorId ? [obj.id, mirrorId] : [obj.id]
          setSelectedObjectIds(ids)
          return
        }
      }

      // No hit — clear selection.
      setSelectedObjectIds([])
    },
    [objects, setSelectedObjectIds, stageRef, stageSize],
  )

  return {
    onPointerDown,
    onPointerMove: () => {},
    onPointerUp: () => {},
  }
}
