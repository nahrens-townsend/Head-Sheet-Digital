import { useCallback, useMemo, useState } from 'react'
import type { Stroke } from '../types/stroke'

interface CanvasHistoryState {
  past: Stroke[][]
  present: Stroke[]
  future: Stroke[][]
}

const MAX_HISTORY_ENTRIES = 50

export function useCanvasHistory() {
  const [history, setHistory] = useState<CanvasHistoryState>({
    past: [],
    present: [],
    future: [],
  })

  const addStroke = useCallback((stroke: Stroke) => {
    setHistory((current) => ({
      past: [...current.past, current.present].slice(-MAX_HISTORY_ENTRIES),
      present: [...current.present, stroke],
      future: [],
    }))
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

  const setStrokes = useCallback((strokes: Stroke[]) => {
    setHistory({
      past: [],
      present: strokes,
      future: [],
    })
  }, [])

  const canUndo = useMemo(() => history.past.length > 0, [history.past.length])
  const canRedo = useMemo(() => history.future.length > 0, [history.future.length])

  return {
    strokes: history.present,
    canUndo,
    canRedo,
    addStroke,
    undo,
    redo,
    setStrokes,
  }
}
