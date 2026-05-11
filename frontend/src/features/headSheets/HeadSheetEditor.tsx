import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CanvasToolbar } from '../../canvas/CanvasToolbar'
import { HeadSheetCanvas } from '../../canvas/HeadSheetCanvas'
import { SelectionPanel } from '../../canvas/SelectionPanel'
import { useAutoSave } from '../../canvas/useAutoSave'
import { useCanvasHistory } from '../../canvas/useCanvasHistory'
import { useCanvasStore } from '../../stores/canvasStore'
import { parseCanvasData } from '../../types/canvasObject'
import { duplicateObject } from '../../canvas/utils/objectUtils'
import { useGetHeadSheet, useSaveStrokes } from './useHeadSheets'

export function HeadSheetEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sheetId = id ?? ''
  const initializedSheetIdRef = useRef<string | null>(null)
  const { data, isLoading, isError } = useGetHeadSheet(sheetId)
  const { addObject, updateObject, deleteObjects, undo, redo, canUndo, canRedo, objects, setObjects } =
    useCanvasHistory()
  const saveStatus = useCanvasStore((state) => state.saveStatus)
  const { selectedObjectIds, setSelectedObjectIds, setZoom, setPanOffset } = useCanvasStore()
  const saveMutation = useSaveStrokes(sheetId)

  useEffect(() => {
    initializedSheetIdRef.current = null
  }, [sheetId])

  useEffect(() => {
    const sheet = data?.data
    if (!sheet || initializedSheetIdRef.current === sheet.id) {
      return
    }

    setObjects(parseCanvasData(sheet.strokesJson).objects)
    initializedSheetIdRef.current = sheet.id
    // Reset zoom/pan when opening a sheet so each session starts at 1:1.
    setZoom(1)
    setPanOffset({ x: 0, y: 0 })
  }, [data?.data, setObjects, setZoom, setPanOffset])

  useAutoSave(sheetId, { version: 2, objects }, async (canvasData) => {
    await saveMutation.mutateAsync(canvasData)
  }, data?.data?.strokesJson)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      // Don't fire canvas shortcuts when a text input is focused.
      const tag = (document.activeElement as HTMLElement | null)?.tagName
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'

      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
        return
      }

      if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
        return
      }

      if (inInput) return

      // Ctrl+A — select all objects
      if ((event.ctrlKey || event.metaKey) && key === 'a') {
        event.preventDefault()
        setSelectedObjectIds(objects.map((o) => o.id))
        return
      }

      // Ctrl+0 — reset zoom and pan
      if ((event.ctrlKey || event.metaKey) && key === '0') {
        event.preventDefault()
        setZoom(1)
        setPanOffset({ x: 0, y: 0 })
        return
      }

      // Escape — deselect
      if (key === 'escape') {
        setSelectedObjectIds([])
        return
      }

      // Delete / Backspace — delete selected objects
      if ((key === 'delete' || key === 'backspace') && selectedObjectIds.length > 0) {
        event.preventDefault()
        deleteObjects([...selectedObjectIds])
        setSelectedObjectIds([])
        return
      }

      // D — duplicate selected objects (selects the new copies)
      if (key === 'd' && !event.ctrlKey && !event.metaKey && selectedObjectIds.length > 0) {
        event.preventDefault()
        const newIds: string[] = []
        for (const id of selectedObjectIds) {
          const obj = objects.find((o) => o.id === id)
          if (obj) {
            const dup = duplicateObject(obj)
            addObject(dup)
            newIds.push(dup.id)
          }
        }
        if (newIds.length > 0) setSelectedObjectIds(newIds)
        return
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [redo, undo, selectedObjectIds, objects, deleteObjects, addObject, setSelectedObjectIds, setZoom, setPanOffset])

  if (isLoading) {
    return <div className="editor-loading">Loading…</div>
  }

  if (isError || !data?.data) {
    return <div className="editor-error">Sheet not found.</div>
  }

  const sheet = data.data

  return (
    <div className="editor">
      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        saveStatus={saveStatus}
        sheetName={sheet.name}
        onBack={() => navigate('/sheets')}
      />
      <div className="editor__canvas-wrap">
        <HeadSheetCanvas
          objects={objects}
          templateType={sheet.templateType}
          onObjectComplete={addObject}
          onUpdateObject={updateObject}
          onDeleteObjects={deleteObjects}
        />
        <SelectionPanel
          objects={objects}
          onUpdateObject={updateObject}
          onDeleteObjects={deleteObjects}
          onDuplicateObject={addObject}
        />
      </div>
    </div>
  )
}
