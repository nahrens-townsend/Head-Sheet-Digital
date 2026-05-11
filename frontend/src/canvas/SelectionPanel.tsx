import { useCanvasStore } from '../stores/canvasStore'
import type { CanvasObject } from '../types/canvasObject'
import type { StrokeSize } from './utils/canvasUtils'
import { createStrokeId } from './utils/canvasUtils'
import { ColorPicker } from '../components/ColorPicker/ColorPicker'
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker'

const DUPLICATE_OFFSET = 0.02

function duplicateObject(obj: CanvasObject): CanvasObject {
  const id = createStrokeId()
  const createdAt = new Date().toISOString()

  switch (obj.type) {
    case 'line':
    case 'arrow':
    case 'dotted':
      return {
        ...obj,
        id,
        createdAt,
        start: { x: obj.start.x + DUPLICATE_OFFSET, y: obj.start.y + DUPLICATE_OFFSET },
        mid: { x: obj.mid.x + DUPLICATE_OFFSET, y: obj.mid.y + DUPLICATE_OFFSET },
        end: { x: obj.end.x + DUPLICATE_OFFSET, y: obj.end.y + DUPLICATE_OFFSET },
      }
    case 'pen':
    case 'eraser':
      return {
        ...obj,
        id,
        createdAt,
        points: obj.points.map((v) => v + DUPLICATE_OFFSET),
      }
  }
}

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

  return (
    <div className="selection-panel" role="toolbar" aria-label="Object properties">
      <span className="selection-panel__label">
        {selectedObjects.length === 1 ? '1 object' : `${selectedObjects.length} objects`}
      </span>

      <span className="toolbar-sep" aria-hidden="true" />

      <ColorPicker value={representative.color} onChange={handleColorChange} />

      <StrokeSizePicker value={representative.width} onChange={handleSizeChange} />

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
