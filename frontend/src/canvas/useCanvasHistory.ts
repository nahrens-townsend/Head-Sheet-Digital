import { useCallback, useEffect, useRef, useState } from 'react'
import type { CanvasObject } from '../types/canvasObject'

// ── Operation types ──────────────────────────────────────────────────────────

export type AddOperation = { type: 'add'; object: CanvasObject }
export type UpdateOperation = {
  type: 'update'
  id: string
  before: CanvasObject
  after: CanvasObject
}
// Each deleted object is stored with its original index so undo can re-insert
// at the exact position (important for destination-out eraser compositing order).
export type DeleteOperation = {
  type: 'delete'
  deletions: Array<{ index: number; object: CanvasObject }>
}
// Multiple pen/eraser strokes drawn in quick succession are grouped so a single
// Ctrl+Z undoes the whole gesture sequence.
export type BatchOperation = { type: 'batch'; ops: AddOperation[] }

export type CanvasOperation =
  | AddOperation
  | UpdateOperation
  | DeleteOperation
  | BatchOperation

// ── Forward / backward application ──────────────────────────────────────────

function applyForward(objects: CanvasObject[], op: CanvasOperation): CanvasObject[] {
  switch (op.type) {
    case 'add':
      return [...objects, op.object]
    case 'update': {
      const idx = objects.findIndex((o) => o.id === op.id)
      if (idx === -1) return objects
      const next = [...objects]
      next[idx] = op.after
      return next
    }
    case 'delete': {
      const ids = new Set(op.deletions.map((d) => d.object.id))
      return objects.filter((o) => !ids.has(o.id))
    }
    case 'batch':
      return op.ops.reduce<CanvasObject[]>((acc, sub) => applyForward(acc, sub), objects)
  }
}

function applyBackward(objects: CanvasObject[], op: CanvasOperation): CanvasObject[] {
  switch (op.type) {
    case 'add':
      return objects.filter((o) => o.id !== op.object.id)
    case 'update': {
      const idx = objects.findIndex((o) => o.id === op.id)
      if (idx === -1) return objects
      const prev = [...objects]
      prev[idx] = op.before
      return prev
    }
    case 'delete': {
      // Re-insert in ascending index order so each splice lands at the right position.
      const result = [...objects]
      const sorted = [...op.deletions].sort((a, b) => a.index - b.index)
      for (const { index, object } of sorted) {
        result.splice(Math.min(index, result.length), 0, object)
      }
      return result
    }
    case 'batch':
      return [...op.ops]
        .reverse()
        .reduce<CanvasObject[]>((acc, sub) => applyBackward(acc, sub), objects)
  }
}

// ── State ────────────────────────────────────────────────────────────────────

interface HistoryState {
  objects: CanvasObject[]
  undoStack: CanvasOperation[]
  redoStack: CanvasOperation[]
  // True while pen strokes are in the pending batch (not yet on undoStack).
  // Drives the toolbar "can undo" indicator correctly without polling a ref.
  hasPendingBatch: boolean
}

const MAX_HISTORY_ENTRIES = 50
// Pen/eraser strokes added within this window (ms) are grouped into a single undo entry.
const PEN_BATCH_WINDOW_MS = 750

function isPenLike(obj: CanvasObject): boolean {
  return obj.type === 'pen' || obj.type === 'eraser'
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCanvasHistory() {
  const [history, setHistory] = useState<HistoryState>({
    objects: [],
    undoStack: [],
    redoStack: [],
    hasPendingBatch: false,
  })

  // Pending pen-stroke batch — refs avoid triggering re-renders on every stroke.
  const pendingBatchRef = useRef<AddOperation[]>([])
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Consume the pending batch and return the composed operation (or null).
  // Clears both the ref array and the timer. Safe to call before setState updaters
  // since ref reads are synchronous and happen before the state update is enqueued.
  const consumePendingBatch = useCallback((): CanvasOperation | null => {
    if (batchTimerRef.current !== null) {
      clearTimeout(batchTimerRef.current)
      batchTimerRef.current = null
    }
    const ops = pendingBatchRef.current
    pendingBatchRef.current = []
    if (ops.length === 0) return null
    return ops.length === 1 ? ops[0] : { type: 'batch', ops }
  }, [])

  // ── addObject ─────────────────────────────────────────────────────────────

  const addObject = useCallback(
    (object: CanvasObject) => {
      if (isPenLike(object)) {
        // Objects land in `present` immediately for rendering. The undo entry is
        // deferred so rapid strokes within PEN_BATCH_WINDOW_MS are grouped together.
        const addOp: AddOperation = { type: 'add', object }
        pendingBatchRef.current = [...pendingBatchRef.current, addOp]

        if (batchTimerRef.current !== null) clearTimeout(batchTimerRef.current)
        batchTimerRef.current = setTimeout(() => {
          batchTimerRef.current = null
          const ops = pendingBatchRef.current
          if (ops.length === 0) return
          pendingBatchRef.current = []
          const op: CanvasOperation = ops.length === 1 ? ops[0] : { type: 'batch', ops }
          setHistory((cur) => ({
            ...cur,
            undoStack: [...cur.undoStack, op].slice(-MAX_HISTORY_ENTRIES),
            hasPendingBatch: false,
          }))
        }, PEN_BATCH_WINDOW_MS)

        setHistory((cur) => ({
          ...cur,
          objects: [...cur.objects, object],
          redoStack: [],
          hasPendingBatch: true,
        }))
      } else {
        // Vector objects: flush any pending pen batch first, then add immediately.
        const pendingOp = consumePendingBatch()
        setHistory((cur) => {
          const addOp: AddOperation = { type: 'add', object }
          let undoStack = cur.undoStack
          if (pendingOp) undoStack = [...undoStack, pendingOp]
          return {
            objects: [...cur.objects, object],
            undoStack: [...undoStack, addOp].slice(-MAX_HISTORY_ENTRIES),
            redoStack: [],
            hasPendingBatch: false,
          }
        })
      }
    },
    [consumePendingBatch],
  )

  // ── updateObject ──────────────────────────────────────────────────────────

  const updateObject = useCallback(
    (id: string, updater: (obj: CanvasObject) => CanvasObject) => {
      const pendingOp = consumePendingBatch()
      setHistory((cur) => {
        const idx = cur.objects.findIndex((o) => o.id === id)
        if (idx === -1) return cur
        const before = cur.objects[idx]
        const after = updater(before)
        const updated = [...cur.objects]
        updated[idx] = after
        const updateOp: UpdateOperation = { type: 'update', id, before, after }
        let undoStack = cur.undoStack
        if (pendingOp) undoStack = [...undoStack, pendingOp]
        return {
          objects: updated,
          undoStack: [...undoStack, updateOp].slice(-MAX_HISTORY_ENTRIES),
          redoStack: [],
          hasPendingBatch: false,
        }
      })
    },
    [consumePendingBatch],
  )

  // ── deleteObjects ─────────────────────────────────────────────────────────

  const deleteObjects = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      const pendingOp = consumePendingBatch()
      setHistory((cur) => {
        const idSet = new Set(ids)
        const deletions: Array<{ index: number; object: CanvasObject }> = []
        const newObjects: CanvasObject[] = []
        cur.objects.forEach((obj, index) => {
          if (idSet.has(obj.id)) {
            deletions.push({ index, object: obj })
          } else {
            newObjects.push(obj)
          }
        })
        if (deletions.length === 0) return cur
        const deleteOp: DeleteOperation = { type: 'delete', deletions }
        let undoStack = cur.undoStack
        if (pendingOp) undoStack = [...undoStack, pendingOp]
        return {
          objects: newObjects,
          undoStack: [...undoStack, deleteOp].slice(-MAX_HISTORY_ENTRIES),
          redoStack: [],
          hasPendingBatch: false,
        }
      })
    },
    [consumePendingBatch],
  )

  // ── undo ──────────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    // Flush any pending pen batch before undoing so it appears as one step.
    const pendingOp = consumePendingBatch()
    setHistory((cur) => {
      let undoStack = cur.undoStack
      if (pendingOp) undoStack = [...undoStack, pendingOp]
      if (undoStack.length === 0) return { ...cur, undoStack, hasPendingBatch: false }
      const op = undoStack[undoStack.length - 1]
      return {
        objects: applyBackward(cur.objects, op),
        undoStack: undoStack.slice(0, -1),
        redoStack: [...cur.redoStack, op].slice(-MAX_HISTORY_ENTRIES),
        hasPendingBatch: false,
      }
    })
  }, [consumePendingBatch])

  // ── redo ──────────────────────────────────────────────────────────────────

  const redo = useCallback(() => {
    setHistory((cur) => {
      if (cur.redoStack.length === 0) return cur
      const op = cur.redoStack[cur.redoStack.length - 1]
      return {
        objects: applyForward(cur.objects, op),
        undoStack: [...cur.undoStack, op].slice(-MAX_HISTORY_ENTRIES),
        redoStack: cur.redoStack.slice(0, -1),
        hasPendingBatch: false,
      }
    })
  }, [])

  // ── setObjects (initial load / replace) ───────────────────────────────────

  const setObjects = useCallback((objects: CanvasObject[]) => {
    // Cancel any in-flight batch timer — history is being replaced wholesale.
    if (batchTimerRef.current !== null) {
      clearTimeout(batchTimerRef.current)
      batchTimerRef.current = null
    }
    pendingBatchRef.current = []
    setHistory({ objects, undoStack: [], redoStack: [], hasPendingBatch: false })
  }, [])

  // Clear the batch timer on unmount so the deferred setState never fires after
  // the component tree is torn down (e.g., navigating away immediately after drawing).
  useEffect(() => {
    return () => {
      if (batchTimerRef.current !== null) {
        clearTimeout(batchTimerRef.current)
        batchTimerRef.current = null
      }
      pendingBatchRef.current = []
    }
  }, [])

  return {
    objects: history.objects,
    canUndo: history.undoStack.length > 0 || history.hasPendingBatch,
    canRedo: history.redoStack.length > 0,
    addObject,
    updateObject,
    deleteObjects,
    undo,
    redo,
    setObjects,
  }
}
