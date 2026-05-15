import { useCanvasStore } from '../stores/canvasStore'
import { ColorPicker } from '../components/ColorPicker/ColorPicker'
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker'
import type { CanvasMode } from '../types/headSheet'

interface CanvasToolbarProps {
  canUndo: boolean
  canRedo: boolean
  canSaveTemplate: boolean
  canvasMode: CanvasMode
  imageUploadStatus: 'idle' | 'uploading' | 'error'
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onSaveTemplate: () => void
  onReplaceImage: () => void
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
  canSaveTemplate,
  canvasMode,
  imageUploadStatus,
  onUndo,
  onRedo,
  onExport,
  onSaveTemplate,
  onReplaceImage,
  saveStatus,
  sheetName,
  onBack,
}: CanvasToolbarProps) {
  const { tool, color, strokeSize, setTool, setColor, setStrokeSize, showGuides, setShowGuides, symmetryEnabled, setSymmetryEnabled } = useCanvasStore()

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
          className={`toolbar-btn ${tool === 'select' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('select')}
          aria-label="Select tool"
          title="Select"
        >
          ↖
        </button>
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
          className={`toolbar-btn ${symmetryEnabled ? 'toolbar-btn--active' : ''}`}
          onClick={() => setSymmetryEnabled(!symmetryEnabled)}
          aria-label="Toggle symmetry"
          aria-pressed={symmetryEnabled}
          title="Symmetry (mirrors pen, line, arrow, dotted)"
        >
          ⇔
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
          className={`toolbar-btn ${tool === 'arrow' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('arrow')}
          aria-label="Arrow tool"
          title="Arrow"
        >
          →
        </button>
        <button
          type="button"
          className={`toolbar-btn ${tool === 'dotted' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('dotted')}
          aria-label="Dotted line tool"
          title="Dotted line"
        >
          ⋯
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

        <button
          type="button"
          className={`toolbar-btn ${tool === 'note' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('note')}
          aria-label="Note tool"
          title="Note"
        >
          🗒
        </button>

        <button
          type="button"
          className={`toolbar-btn ${tool === 'hand' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('hand')}
          aria-label="Pan tool"
          title="Pan (Hand)"
        >
          ✋
        </button>

        <span className="toolbar-sep" aria-hidden="true" />

        <button
          type="button"
          className={`toolbar-btn ${showGuides ? 'toolbar-btn--active' : ''}`}
          onClick={() => setShowGuides(!showGuides)}
          aria-label="Toggle guides"
          aria-pressed={showGuides}
          title="Toggle guides"
        >
          ⊕
        </button>

        {canvasMode === 'image' && (
          <button
            type="button"
            className={`toolbar-btn${imageUploadStatus === 'error' ? ' toolbar-btn--error' : ''}`}
            onClick={onReplaceImage}
            disabled={imageUploadStatus === 'uploading'}
            aria-label="Replace image"
            title={
              imageUploadStatus === 'uploading' ? 'Uploading…' :
              imageUploadStatus === 'error' ? 'Upload failed — click to retry' :
              'Replace image'
            }
          >
            🖼
          </button>
        )}

        <button
          type="button"
          className="toolbar-btn"
          onClick={onExport}
          aria-label="Export PNG"
          title="Export PNG"
        >
          ⤓
        </button>
        {canvasMode === 'templates' && (
          <button
            type="button"
            className="toolbar-btn"
            onClick={onSaveTemplate}
            disabled={!canSaveTemplate}
            aria-label="Save as template"
            title="Save as template"
          >
            ★
          </button>
        )}

        <span className="toolbar-sep" aria-hidden="true" />

        <ColorPicker value={color} onChange={setColor} />

        <StrokeSizePicker value={strokeSize} onChange={setStrokeSize} />

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
