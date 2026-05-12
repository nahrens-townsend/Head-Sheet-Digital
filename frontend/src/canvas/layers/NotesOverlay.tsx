import { useCallback, useRef, useState } from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import type { CanvasObject, NoteObject } from '../../types/canvasObject'
import { isNoteObject } from '../../types/canvasObject'
import type { Point, StageSize } from '../utils/canvasUtils'

interface NotesOverlayProps {
  objects: CanvasObject[]
  stageSize: StageSize
  zoom: number
  panOffset: Point
  isExporting: boolean
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  onDeleteObjects: (ids: string[]) => void
}

type NoteColorKey = NoteObject['noteColor']

const NOTE_COLORS: Record<NoteColorKey, { bg: string; header: string; border: string }> = {
  yellow: { bg: '#fef9c3', header: '#fde047', border: '#facc15' },
  pink:   { bg: '#fce7f3', header: '#f9a8d4', border: '#f472b6' },
  green:  { bg: '#dcfce7', header: '#86efac', border: '#4ade80' },
  blue:   { bg: '#dbeafe', header: '#93c5fd', border: '#60a5fa' },
}

const NOTE_WIDTH_PX = 200

export function NotesOverlay({
  objects,
  stageSize,
  zoom,
  panOffset,
  isExporting,
  onUpdateObject,
  onDeleteObjects,
}: NotesOverlayProps) {
  const { selectedObjectIds, setSelectedObjectIds, tool } = useCanvasStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Drag state — refs avoid setState churn during rapid pointer moves.
  const dragRef = useRef<{
    noteId: string
    startClientX: number
    startClientY: number
    startNoteX: number
    startNoteY: number
  } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  const notes = objects.filter(isNoteObject)

  const startEditing = useCallback((note: NoteObject) => {
    setEditingId(note.id)
    setDraftText(note.text)
    // Focus via rAF so the element is visible first.
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  const commitEdit = useCallback(
    (noteId: string, text: string) => {
      onUpdateObject(noteId, (obj) => ({ ...(obj as NoteObject), text }) as CanvasObject)
      setEditingId(null)
    },
    [onUpdateObject],
  )

  const handleHeaderPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, note: NoteObject) => {
      if (e.button !== 0 || tool !== 'select') return
      e.preventDefault()
      e.stopPropagation()
      setSelectedObjectIds([note.id])
      dragRef.current = {
        noteId: note.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startNoteX: note.x,
        startNoteY: note.y,
      }
      setDraggingId(note.id)
      setDragPos({ x: note.x, y: note.y })
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    },
    [tool, setSelectedObjectIds],
  )

  const handleHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr) return
      const newX = Math.max(0, Math.min(1, dr.startNoteX + (e.clientX - dr.startClientX) / (stageSize.width * zoom)))
      const newY = Math.max(0, Math.min(1, dr.startNoteY + (e.clientY - dr.startClientY) / (stageSize.height * zoom)))
      setDragPos({ x: newX, y: newY })
    },
    [stageSize, zoom],
  )

  const handleHeaderPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr) return
      const newX = Math.max(0, Math.min(1, dr.startNoteX + (e.clientX - dr.startClientX) / (stageSize.width * zoom)))
      const newY = Math.max(0, Math.min(1, dr.startNoteY + (e.clientY - dr.startClientY) / (stageSize.height * zoom)))
      dragRef.current = null
      setDraggingId(null)
      setDragPos(null)
      onUpdateObject(dr.noteId, (obj) => ({ ...(obj as NoteObject), x: newX, y: newY }) as CanvasObject)
    },
    [stageSize, zoom, onUpdateObject],
  )

  if (notes.length === 0 || isExporting) return null

  return (
    <div className="notes-overlay">
      {notes.map((note) => {
        const posX = draggingId === note.id && dragPos ? dragPos.x : note.x
        const posY = draggingId === note.id && dragPos ? dragPos.y : note.y
        const screenX = posX * stageSize.width * zoom + panOffset.x
        const screenY = posY * stageSize.height * zoom + panOffset.y
        const isSelected = selectedObjectIds.includes(note.id)
        const isEditing = editingId === note.id
        const colors = NOTE_COLORS[note.noteColor]
        const isDragging = draggingId === note.id

        return (
          <div
            key={note.id}
            className={`note-card${isSelected ? ' note-card--selected' : ''}`}
            style={{
              left: screenX,
              top: screenY,
              width: NOTE_WIDTH_PX,
              backgroundColor: colors.bg,
              borderColor: isSelected ? '#aa3bff' : colors.border,
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (!isEditing) setSelectedObjectIds([note.id])
            }}
          >
            <div
              className="note-card__header"
              style={{
                backgroundColor: colors.header,
                cursor: isDragging ? 'grabbing' : tool === 'select' ? 'grab' : 'default',
              }}
              onPointerDown={(e) => handleHeaderPointerDown(e, note)}
              onPointerMove={handleHeaderPointerMove}
              onPointerUp={handleHeaderPointerUp}
            >
              <span className="note-card__drag-hint" aria-hidden="true">
                ⋮⋮
              </span>
              <button
                type="button"
                className="note-card__delete"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteObjects([note.id])
                  if (selectedObjectIds.includes(note.id)) setSelectedObjectIds([])
                }}
                aria-label="Delete note"
              >
                ×
              </button>
            </div>

            <div className="note-card__body">
              {isEditing ? (
                <textarea
                  ref={isEditing ? textareaRef : undefined}
                  className="note-card__textarea"
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  onBlur={() => commitEdit(note.id, draftText)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  className="note-card__text"
                  onDoubleClick={(e) => {
                    e.stopPropagation()
                    startEditing(note)
                  }}
                >
                  {note.text || (
                    <span className="note-card__placeholder">Double-click to edit…</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
