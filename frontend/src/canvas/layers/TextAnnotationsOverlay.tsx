import { useCallback, useRef, useState } from 'react'
import type React from 'react'
import { useCanvasStore } from '../../stores/canvasStore'
import type { CanvasObject, NoteObject, TextObject } from '../../types/canvasObject'
import { isTextObject, isNoteObject } from '../../types/canvasObject'
import { WORLD_SIZE, type Point } from '../utils/canvasUtils'

interface TextAnnotationsOverlayProps {
  objects: CanvasObject[]
  fitScale: number
  fitOffset: Point
  zoom: number
  panOffset: Point
  isExporting: boolean
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  onDeleteObjects: (ids: string[]) => void
}

type TextLikeObject = TextObject | NoteObject

const DRAG_THRESHOLD_PX = 4

export function TextAnnotationsOverlay({
  objects,
  fitScale,
  fitOffset,
  zoom,
  panOffset,
  isExporting,
  onUpdateObject,
  onDeleteObjects,
}: TextAnnotationsOverlayProps) {
  const { selectedObjectIds, setSelectedObjectIds, tool } = useCanvasStore()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftText, setDraftText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const dragRef = useRef<{
    objId: string
    startClientX: number
    startClientY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)

  const textObjects = objects.filter(
    (o): o is TextLikeObject => isTextObject(o) || isNoteObject(o),
  )

  const startEditing = useCallback((id: string, text: string) => {
    setEditingId(id)
    setDraftText(text)
    requestAnimationFrame(() => textareaRef.current?.focus())
  }, [])

  const commitEdit = useCallback(
    (id: string, text: string) => {
      onUpdateObject(id, (obj) => ({ ...obj, text }) as CanvasObject)
      setEditingId(null)
    },
    [onUpdateObject],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, obj: TextLikeObject) => {
      if (e.button !== 0) return
      e.stopPropagation()
      // Only select+drag when using the select tool; other tools interact with canvas below.
      if (tool !== 'select') return
      e.preventDefault()
      setSelectedObjectIds([obj.id])
      dragRef.current = {
        objId: obj.id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: obj.x,
        startY: obj.y,
        moved: false,
      }
      setDraggingId(obj.id)
      setDragPos({ x: obj.x, y: obj.y })
      ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    },
    [tool, setSelectedObjectIds],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr) return
      const dx = e.clientX - dr.startClientX
      const dy = e.clientY - dr.startClientY
      if (!dr.moved && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        dr.moved = true
      }
      if (!dr.moved) return
      // Convert screen delta to world pixels: divide by (fitScale * zoom).
      const newX = Math.max(0, Math.min(WORLD_SIZE.width,  dr.startX + dx / (fitScale * zoom)))
      const newY = Math.max(0, Math.min(WORLD_SIZE.height, dr.startY + dy / (fitScale * zoom)))
      setDragPos({ x: newX, y: newY })
    },
    [fitScale, zoom],
  )

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const dr = dragRef.current
      if (!dr) return
      if (dr.moved) {
        const dx = e.clientX - dr.startClientX
        const dy = e.clientY - dr.startClientY
        const newX = Math.max(0, Math.min(WORLD_SIZE.width,  dr.startX + dx / (fitScale * zoom)))
        const newY = Math.max(0, Math.min(WORLD_SIZE.height, dr.startY + dy / (fitScale * zoom)))
        onUpdateObject(dr.objId, (obj) => ({ ...obj, x: newX, y: newY }) as CanvasObject)
      }
      dragRef.current = null
      setDraggingId(null)
      setDragPos(null)
    },
    [fitScale, zoom, onUpdateObject],
  )

  if (textObjects.length === 0 || isExporting) return null

  return (
    <div className="text-annotations-overlay">
      {textObjects.map((obj) => {
        const posX = draggingId === obj.id && dragPos ? dragPos.x : obj.x
        const posY = draggingId === obj.id && dragPos ? dragPos.y : obj.y
        // World → screen: multiply by (fitScale * zoom) then add fitOffset + panOffset.
        const screenX = posX * fitScale * zoom + fitOffset.x + panOffset.x
        const screenY = posY * fitScale * zoom + fitOffset.y + panOffset.y
        const isSelected = selectedObjectIds.includes(obj.id)
        const isEditing = editingId === obj.id
        const isDragging = draggingId === obj.id
        const showBorder = isSelected && tool === 'select'

        return (
          <div
            key={obj.id}
            className={[
              'text-annotation',
              showBorder ? 'text-annotation--selected' : '',
              isDragging ? 'text-annotation--dragging' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={{
              left: screenX,
              top: screenY,
              color: obj.color,
              cursor: isEditing
                ? 'text'
                : isDragging
                  ? 'grabbing'
                  : tool === 'select'
                    ? 'grab'
                    : 'default',
            }}
            onPointerDown={(e) => {
              if (isEditing) return
              handlePointerDown(e, obj)
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onDoubleClick={(e) => {
              e.stopPropagation()
              if (!isEditing) startEditing(obj.id, obj.text)
            }}
          >
            {isEditing ? (
              <textarea
                ref={isEditing ? textareaRef : undefined}
                className="text-annotation__textarea"
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={() => commitEdit(obj.id, draftText)}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              />
            ) : (
              <div className="text-annotation__text">
                {obj.text || (
                  <span className="text-annotation__placeholder">Double-click to edit…</span>
                )}
              </div>
            )}
            <button
              type="button"
              className="text-annotation__delete"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onDeleteObjects([obj.id])
                if (selectedObjectIds.includes(obj.id)) setSelectedObjectIds([])
              }}
              aria-label="Delete text"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
