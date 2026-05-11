import { useCanvasStore } from '../stores/canvasStore'
import type { CanvasObject } from '../types/canvasObject'
import type { StrokeSize } from './utils/canvasUtils'
import { duplicateObject } from './utils/objectUtils'
import { ColorPicker } from '../components/ColorPicker/ColorPicker'
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker'

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
