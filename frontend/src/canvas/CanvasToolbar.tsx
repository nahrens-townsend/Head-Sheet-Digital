import { useCanvasStore } from '../stores/canvasStore'
import { ColorPicker } from '../components/ColorPicker/ColorPicker'
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker'
import { DrawingToolPanel } from './DrawingToolPanel'
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
  const { tool, activeDrawingTool, color, strokeSize, setTool, setActiveDrawingTool, setColor, setStrokeSize, showGuides, setShowGuides, symmetryEnabled, setSymmetryEnabled, zoom, panOffset, setZoom, setPanOffset } = useCanvasStore()

  const isViewportDefault = zoom === 1.0 && panOffset.x === 0 && panOffset.y === 0
  const resetViewport = () => { setZoom(1.0); setPanOffset({ x: 0, y: 0 }) }

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
          ☝
        </button>

        {/* Pencil group — clicking activates pencil mode; sub-panel stays open while active */}
        <div className="toolbar-pencil-group">
          <button
            type="button"
            className={`toolbar-btn ${tool === 'pencil' ? 'toolbar-btn--active' : ''}`}
            onClick={() => setTool('pencil')}
            aria-label="Pencil tools"
            aria-expanded={tool === 'pencil'}
            title="Pencil tools"
          >
            ✏
          </button>
          {tool === 'pencil' && (
            <DrawingToolPanel
              activeDrawingTool={activeDrawingTool}
              symmetryEnabled={symmetryEnabled}
              onSelectDrawingTool={setActiveDrawingTool}
              onToggleSymmetry={() => setSymmetryEnabled(!symmetryEnabled)}
            />
          )}
        </div>

        <button
          type="button"
          className={`toolbar-btn ${tool === 'text' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('text')}
          aria-label="Text tool"
          title="Text"
        >
          T
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

        <button
          type="button"
          className={`toolbar-btn${isViewportDefault ? ' toolbar-btn--dim' : ''}`}
          onClick={resetViewport}
          aria-label="Reset viewport"
          title="Reset viewport (zoom 1:1, center page)"
        >
          ⊙
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
