import { useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CanvasToolbar } from '../../canvas/CanvasToolbar'
import { HeadSheetCanvas } from '../../canvas/HeadSheetCanvas'
import { useAutoSave } from '../../canvas/useAutoSave'
import { useCanvasHistory } from '../../canvas/useCanvasHistory'
import { useCanvasStore } from '../../stores/canvasStore'
import { parseCanvasData } from '../../types/canvasObject'
import { useGetHeadSheet, useSaveStrokes } from './useHeadSheets'

export function HeadSheetEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const sheetId = id ?? ''
  const initializedSheetIdRef = useRef<string | null>(null)
  const { data, isLoading, isError } = useGetHeadSheet(sheetId)
  const { addObject, undo, redo, canUndo, canRedo, objects, setObjects } = useCanvasHistory()
  const saveStatus = useCanvasStore((state) => state.saveStatus)
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
  }, [data?.data, setObjects])

  useAutoSave(sheetId, { version: 2, objects }, async (canvasData) => {
    await saveMutation.mutateAsync(canvasData)
  }, data?.data?.strokesJson)

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()

      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }

      if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [redo, undo])

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
        />
      </div>
    </div>
  )
}
