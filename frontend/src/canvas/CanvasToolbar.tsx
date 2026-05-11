import { useCanvasStore } from '../stores/canvasStore'

interface CanvasToolbarProps {
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
  saveStatus: 'idle' | 'saving' | 'saved' | 'error'
  sheetName: string
  onBack: () => void
}

const SAVE_STATUS_LABELS: Record<CanvasToolbarProps['saveStatus'], string> = {
  idle: 'Idle',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Error',
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  saveStatus,
  sheetName,
  onBack,
}: CanvasToolbarProps) {
  const { tool, color, brushSize, setTool, setColor, setBrushSize } = useCanvasStore()

  return (
    <div className="canvas-toolbar">
      <button type="button" className="btn btn--ghost canvas-toolbar__back" onClick={onBack}>
        ← Back
      </button>

      <div className="canvas-toolbar__title" title={sheetName}>
        {sheetName}
      </div>

      <div className="canvas-toolbar__right">
        <button
          type="button"
          className={`toolbar-btn ${tool === 'pen' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('pen')}
          aria-label="Pen tool"
          title="Pen"
        >
          ✎
        </button>
        <button
          type="button"
          className={`toolbar-btn ${tool === 'line' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('line')}
          aria-label="Line tool"
          title="Line"
        >
          ／
        </button>
        <button
          type="button"
          className={`toolbar-btn ${tool === 'eraser' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('eraser')}
          aria-label="Eraser tool"
          title="Eraser"
        >
          ⌫
        </button>

        <span className="toolbar-sep" aria-hidden="true" />

        <input
          type="color"
          className="toolbar-color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          aria-label="Brush color"
          title="Brush color"
        />

        <input
          type="range"
          min={1}
          max={20}
          className="toolbar-size"
          value={brushSize}
          onChange={(event) => setBrushSize(Number(event.target.value))}
          aria-label="Brush size"
          title="Brush size"
        />

        <span className="toolbar-sep" aria-hidden="true" />

        <button
          type="button"
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
          title="Undo"
        >
          ↶
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
        >
          ↷
        </button>

        <div className={`toolbar-save-status toolbar-save-status--${saveStatus}`}>
          {SAVE_STATUS_LABELS[saveStatus]}
        </div>
      </div>
    </div>
  )
}
