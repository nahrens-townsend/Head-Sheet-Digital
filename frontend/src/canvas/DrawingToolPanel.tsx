import type { DrawingTool } from '../types/stroke'

interface DrawingToolPanelProps {
  activeDrawingTool: DrawingTool
  symmetryEnabled: boolean
  onSelectDrawingTool: (tool: DrawingTool) => void
  onToggleSymmetry: () => void
}

export function DrawingToolPanel({
  activeDrawingTool,
  symmetryEnabled,
  onSelectDrawingTool,
  onToggleSymmetry,
}: DrawingToolPanelProps) {
  return (
    <div className="drawing-tool-panel" role="toolbar" aria-label="Drawing sub-tools">
      <button
        type="button"
        className={`toolbar-btn ${activeDrawingTool === 'line' ? 'toolbar-btn--active' : ''}`}
        onClick={() => onSelectDrawingTool('line')}
        aria-label="Line tool"
        title="Line"
      >
        ／
      </button>
      <button
        type="button"
        className={`toolbar-btn ${activeDrawingTool === 'arrow' ? 'toolbar-btn--active' : ''}`}
        onClick={() => onSelectDrawingTool('arrow')}
        aria-label="Arrow tool"
        title="Arrow"
      >
        →
      </button>
      <button
        type="button"
        className={`toolbar-btn ${activeDrawingTool === 'dotted' ? 'toolbar-btn--active' : ''}`}
        onClick={() => onSelectDrawingTool('dotted')}
        aria-label="Dotted line tool"
        title="Dotted line"
      >
        ⋯
      </button>

      <span className="toolbar-sep drawing-tool-panel__sep" aria-hidden="true" />

      <button
        type="button"
        className={`toolbar-btn ${symmetryEnabled ? 'toolbar-btn--active' : ''}`}
        onClick={onToggleSymmetry}
        aria-label="Toggle symmetry"
        aria-pressed={symmetryEnabled}
        title="Symmetry (mirrors line, arrow, dotted)"
      >
        ⇔
      </button>

      <button
        type="button"
        className={`toolbar-btn ${activeDrawingTool === 'eraser' ? 'toolbar-btn--active' : ''}`}
        onClick={() => onSelectDrawingTool('eraser')}
        aria-label="Eraser tool"
        title="Eraser"
      >
        ⌫
      </button>
    </div>
  )
}
