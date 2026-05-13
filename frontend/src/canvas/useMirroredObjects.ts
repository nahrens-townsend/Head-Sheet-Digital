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

      // --- Pen stroke symmetric pairs: propagate style-only changes to twin ---
      if (obj && obj.type === 'pen' && obj.mirrorId) {
        const updated = updater(obj)
        const mirrorObj = objects.find((o) => o.id === obj.mirrorId)
        if (updated.type === 'pen' && mirrorObj && mirrorObj.type === 'pen') {
          const mirrorId = obj.mirrorId
          const mirrorUpdater = (m: CanvasObject): CanvasObject => {
            if (m.type !== 'pen') return m
            return { ...m, color: updated.color, width: updated.width, opacity: updated.opacity }
          }
          updateObjectsBatch([
            { id, updater },
            { id: mirrorId, updater: mirrorUpdater },
          ])
          return
        }
        updateObject(id, updater)
        return
      }

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
        const mirrorId = obj && 'mirrorId' in obj ? (obj as { mirrorId?: string }).mirrorId : undefined
        if (mirrorId) expanded.add(mirrorId)
      }
      deleteObjects([...expanded])
    },
    [objects, deleteObjects],
  )

  return { wrappedUpdateObject, wrappedDeleteObjects }
}
