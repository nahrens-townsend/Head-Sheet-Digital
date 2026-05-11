import { useEffect, useMemo, useRef } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { useCanvasStore } from '../stores/canvasStore'
import type { Stroke } from '../types/stroke'

export function useAutoSave(
  headSheetId: string,
  strokes: Stroke[],
  saveFn: (strokes: Stroke[]) => Promise<void>,
  // Server-provided JSON for the current sheet. Used to seed the baseline so
  // loading a sheet doesn't immediately trigger a phantom save.
  initialStrokesJson?: string,
): void {
  const setSaveStatus = useCanvasStore((state) => state.setSaveStatus)
  const serializedStrokes = useMemo(() => JSON.stringify(strokes), [strokes])
  const debouncedStrokes = useDebounce(serializedStrokes, 1500)
  const lastSavedRef = useRef<string | null>(null)
  // Sequence counter: only the latest save request updates state.
  const saveSeqRef = useRef(0)
  // Keep saveFn in a ref so it never appears in effect deps, preventing
  // spurious re-runs (and duplicate network requests) on every render.
  const saveFnRef = useRef(saveFn)
  useEffect(() => {
    saveFnRef.current = saveFn
  }, [saveFn])

  // Reset all state when the sheet changes.
  useEffect(() => {
    lastSavedRef.current = null
    saveSeqRef.current = 0
    setSaveStatus('idle')
  }, [headSheetId, setSaveStatus])

  // Seed the last-saved baseline from the server JSON the moment it arrives.
  // Normalize via parse→stringify so the string matches our own serialization.
  useEffect(() => {
    if (initialStrokesJson === undefined || lastSavedRef.current !== null) return
    try {
      lastSavedRef.current = JSON.stringify(JSON.parse(initialStrokesJson))
    } catch {
      lastSavedRef.current = '[]'
    }
  }, [initialStrokesJson])

  // Fire a save when debounced strokes diverge from last persisted state.
  useEffect(() => {
    if (!headSheetId || lastSavedRef.current === null) return
    if (debouncedStrokes === lastSavedRef.current) return

    const seq = ++saveSeqRef.current

    const persist = async () => {
      setSaveStatus('saving')
      try {
        await saveFnRef.current(JSON.parse(debouncedStrokes) as Stroke[])
        if (seq === saveSeqRef.current) {
          lastSavedRef.current = debouncedStrokes
          setSaveStatus('saved')
        }
      } catch {
        if (seq === saveSeqRef.current) {
          setSaveStatus('error')
        }
      }
    }

    void persist()
  }, [debouncedStrokes, headSheetId, setSaveStatus])

  // Show 'idle' indicator while strokes are ahead of the last debounce tick.
  useEffect(() => {
    if (!headSheetId || lastSavedRef.current === null) return
    if (serializedStrokes !== lastSavedRef.current) {
      setSaveStatus('idle')
    }
  }, [headSheetId, serializedStrokes, setSaveStatus])
}
