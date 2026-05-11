import { useCallback, useMemo, useState } from 'react'
import type { CanvasObject } from '../types/canvasObject'

interface CanvasHistoryState {
  past: CanvasObject[][]
  present: CanvasObject[]
  future: CanvasObject[][]
}

const MAX_HISTORY_ENTRIES = 50

export function useCanvasHistory() {
  const [history, setHistory] = useState<CanvasHistoryState>({
    past: [],
    present: [],
    future: [],
  })

  const addObject = useCallback((object: CanvasObject) => {
    setHistory((current) => ({
      past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
      present: [...current.present, object],
      future: [],
    }))
  }, [])

  const updateObject = useCallback(
    (id: string, updater: (obj: CanvasObject) => CanvasObject) => {
      setHistory((current) => {
        const idx = current.present.findIndex((obj) => obj.id === id)
        if (idx === -1) return current
        const updated = [...current.present]
        updated[idx] = updater(updated[idx])
        return {
          past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
          present: updated,
          future: [],
        }
      })
    },
    [],
  )

  const deleteObjects = useCallback((ids: string[]) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setHistory((current) => {
      const newPresent = current.present.filter((obj) => !idSet.has(obj.id))
      // Skip pushing history if nothing was actually removed
      if (newPresent.length === current.present.length) return current
      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
        present: newPresent,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) {
        return current
      }

      const previous = current.past[current.past.length - 1]

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) {
        return current
      }

      const [next, ...future] = current.future

      return {
        past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
        present: next,
        future,
      }
    })
  }, [])

  const setObjects = useCallback((objects: CanvasObject[]) => {
    setHistory({
      past: [],
      present: objects,
      future: [],
    })
  }, [])

  const canUndo = useMemo(() => history.past.length > 0, [history.past.length])
  const canRedo = useMemo(() => history.future.length > 0, [history.future.length])

  return {
    objects: history.present,
    canUndo,
    canRedo,
    addObject,
    updateObject,
    deleteObjects,
    undo,
    redo,
    setObjects,
  }
}
