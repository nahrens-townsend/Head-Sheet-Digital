import { useCallback } from 'react'
import type { CanvasObject } from '../types/canvasObject'
import { isLineObject } from '../types/canvasObject'
import { mirrorLineAcrossAxis } from './utils/symmetry'

interface UseMirroredObjectsProps {
  objects: CanvasObject[]
  updateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  updateObjectsBatch: (
    updates: Array<{ id: string; updater: (obj: CanvasObject) => CanvasObject }>,
  ) => void
  deleteObjects: (ids: string[]) => void
}

/**
 * Wraps updateObject and deleteObjects so that changes to one half of a
 * symmetric pair automatically propagate to the mirror twin.
 *
 * The axis is reconstructed from the existing pair:
 *   axisX = (original.start.x + mirror.start.x) / 2
 * This avoids needing template layout data at the call site.
 */
export function useMirroredObjects({
  objects,
  updateObject,
  updateObjectsBatch,
  deleteObjects,
}: UseMirroredObjectsProps) {
  const wrappedUpdateObject = useCallback(
    (id: string, updater: (obj: CanvasObject) => CanvasObject) => {
      const obj = objects.find((o) => o.id === id)

      if (!obj || !isLineObject(obj) || !obj.mirrorId) {
        updateObject(id, updater)
        return
      }

      const updated = updater(obj)
      if (!isLineObject(updated)) {
        updateObject(id, updater)
        return
      }

      const mirrorObj = objects.find((o) => o.id === obj.mirrorId)
      if (!mirrorObj || !isLineObject(mirrorObj)) {
        updateObject(id, updater)
        return
      }

      // Reconstruct the axis from the current pair — no layouts needed.
      const axisX = (obj.start.x + mirrorObj.start.x) / 2
      const mirrorId = obj.mirrorId

      const mirrorUpdater = (m: CanvasObject): CanvasObject => {
        if (!isLineObject(m)) return m
        return {
          ...mirrorLineAcrossAxis(updated, axisX),
          id: mirrorId,
          mirrorId: id,
          createdAt: m.createdAt,
        }
      }

      updateObjectsBatch([
        { id, updater },
        { id: mirrorId, updater: mirrorUpdater },
      ])
    },
    [objects, updateObject, updateObjectsBatch],
  )

  const wrappedDeleteObjects = useCallback(
    (ids: string[]) => {
      const expanded = new Set<string>(ids)
      for (const id of ids) {
        const obj = objects.find((o) => o.id === id)
        if (obj && isLineObject(obj) && obj.mirrorId) {
          expanded.add(obj.mirrorId)
        }
      }
      deleteObjects([...expanded])
    },
    [objects, deleteObjects],
  )

  return { wrappedUpdateObject, wrappedDeleteObjects }
}
