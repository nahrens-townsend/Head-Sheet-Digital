import { useCanvasStore } from '../stores/canvasStore'
import type { CanvasObject, NoteObject } from '../types/canvasObject'
import { isNoteObject } from '../types/canvasObject'
import type { StrokeSize } from './utils/canvasUtils'
import { duplicateObject } from './utils/objectUtils'
import { ColorPicker } from '../components/ColorPicker/ColorPicker'
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker'

type NoteColorKey = NoteObject['noteColor']

const NOTE_COLOR_OPTIONS: Array<{ value: NoteColorKey; bg: string; border: string }> = [
  { value: 'yellow', bg: '#fde047', border: '#facc15' },
  { value: 'pink',   bg: '#f9a8d4', border: '#f472b6' },
  { value: 'green',  bg: '#86efac', border: '#4ade80' },
  { value: 'blue',   bg: '#93c5fd', border: '#60a5fa' },
]

interface SelectionPanelProps {
  objects: CanvasObject[]
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  onDeleteObjects: (ids: string[]) => void
  onDuplicateObject: (obj: CanvasObject) => void
}

export function SelectionPanel({
  objects,
  onUpdateObject,
  onDeleteObjects,
  onDuplicateObject,
}: SelectionPanelProps) {
  const { selectedObjectIds, setSelectedObjectIds } = useCanvasStore()

  if (selectedObjectIds.length === 0) return null

  const selectedObjects = selectedObjectIds
    .map((id) => objects.find((o) => o.id === id))
    .filter(Boolean) as CanvasObject[]

  if (selectedObjects.length === 0) return null

  const representative = selectedObjects[0]
  const allNotes = selectedObjects.every(isNoteObject)

  const handleColorChange = (color: string) => {
    for (const id of selectedObjectIds) {
      onUpdateObject(id, (o) => ({ ...o, color }))
    }
  }

  const handleSizeChange = (width: StrokeSize) => {
    for (const id of selectedObjectIds) {
      onUpdateObject(id, (o) => ({ ...o, width }))
    }
  }

  const handleDelete = () => {
    onDeleteObjects([...selectedObjectIds])
    setSelectedObjectIds([])
  }

  const handleDuplicate = () => {
    for (const o of selectedObjects) {
      onDuplicateObject(duplicateObject(o))
    }
  }

  const handleNoteColorChange = (noteColor: NoteColorKey) => {
    for (const id of selectedObjectIds) {
      onUpdateObject(id, (o) =>
        isNoteObject(o) ? ({ ...o, noteColor } as CanvasObject) : o,
      )
    }
  }

  return (
    <div className="selection-panel" role="toolbar" aria-label="Object properties">
      <span className="selection-panel__label">
        {selectedObjects.length === 1 ? '1 object' : `${selectedObjects.length} objects`}
      </span>

      <span className="toolbar-sep" aria-hidden="true" />

      {allNotes ? (
        <div className="note-color-picker" role="group" aria-label="Note colour">
          {NOTE_COLOR_OPTIONS.map(({ value, bg, border }) => {
            const noteRep = representative as NoteObject
            return (
              <button
                key={value}
                type="button"
                className={`note-color-picker__btn${noteRep.noteColor === value ? ' note-color-picker__btn--active' : ''}`}
                style={{ background: bg, borderColor: noteRep.noteColor === value ? border : 'transparent' }}
                onClick={() => handleNoteColorChange(value)}
                aria-label={`Note colour: ${value}`}
                title={value}
              />
            )
          })}
        </div>
      ) : (
        <>
          <ColorPicker value={representative.color} onChange={handleColorChange} />
          <StrokeSizePicker value={representative.width} onChange={handleSizeChange} />
        </>
      )}

      <span className="toolbar-sep" aria-hidden="true" />

      <button
        type="button"
        className="toolbar-btn"
        onClick={handleDuplicate}
        title="Duplicate"
        aria-label="Duplicate selected"
      >
        ⎘
      </button>

      <button
        type="button"
        className="toolbar-btn toolbar-btn--danger"
        onClick={handleDelete}
        title="Delete"
        aria-label="Delete selected"
      >
        ✕
      </button>
    </div>
  )
}
