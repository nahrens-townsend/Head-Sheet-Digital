import { useCanvasStore } from '../stores/canvasStore';
import { ColorPicker } from '../components/ColorPicker/ColorPicker';
import { StrokeSizePicker } from '../components/BrushSizeSlider/StrokeSizePicker';
import { DrawingToolPanel } from './DrawingToolPanel';
import type { CanvasMode } from '../types/headSheet';

interface CanvasToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  canSaveTemplate: boolean;
  canvasMode: CanvasMode;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onSaveTemplate: () => void;
  onReplaceImage: () => void;
  sheetName: string;
  onBack: () => void;
}

export function CanvasToolbar({
  canUndo,
  canRedo,
  canSaveTemplate,
  canvasMode,
  saveStatus,
  onUndo,
  onRedo,
  onExport,
  onSaveTemplate,
  onReplaceImage,
  sheetName,
  onBack,
}: CanvasToolbarProps) {
  const {
    tool,
    activeDrawingTool,
    color,
    strokeSize,
    setTool,
    setActiveDrawingTool,
    setColor,
    setStrokeSize,
    showGuides,
    setShowGuides,
    symmetryEnabled,
    setSymmetryEnabled,
    zoom,
    panOffset,
    setZoom,
    setPanOffset,
  } = useCanvasStore();

  const isViewportDefault = zoom === 1.0 && panOffset.x === 0 && panOffset.y === 0;
  const resetViewport = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <div className="canvas-toolbar">
      <button type="button" className="btn btn--ghost canvas-toolbar__back" onClick={onBack}>
        Back
      </button>

      <div className="canvas-toolbar__right">
        <button
          type="button"
          className={`toolbar-btn ${tool === 'select' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('select')}
          aria-label="Select tool"
          title="Select"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M173.3 66.5C181.4 62.4 191.2 63.3 198.4 68.8L518.4 308.7C526.7 314.9 530 325.7 526.8 335.5C523.6 345.3 514.4 351.9 504 351.9L351.7 351.9L440.6 529.6C448.5 545.4 442.1 564.6 426.3 572.5C410.5 580.4 391.3 574 383.4 558.2L294.5 380.5L203.2 502.3C197 510.6 186.2 513.9 176.4 510.7C166.6 507.5 160 498.3 160 488L160 88C160 78.9 165.1 70.6 173.3 66.5z" />
          </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <path d="M416.9 85.2L372 130.1L509.9 268L554.8 223.1C568.4 209.6 576 191.2 576 172C576 152.8 568.4 134.4 554.8 120.9L519.1 85.2C505.6 71.6 487.2 64 468 64C448.8 64 430.4 71.6 416.9 85.2zM338.1 164L122.9 379.1C112.2 389.8 104.4 403.2 100.3 417.8L64.9 545.6C62.6 553.9 64.9 562.9 71.1 569C77.3 575.1 86.2 577.5 94.5 575.2L222.3 539.7C236.9 535.6 250.2 527.9 261 517.1L476 301.9L338.1 164z" />
            </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M160 96C142.3 96 128 110.3 128 128C128 145.7 142.3 160 160 160L288 160L288 512C288 529.7 302.3 544 320 544C337.7 544 352 529.7 352 512L352 160L480 160C497.7 160 512 145.7 512 128C512 110.3 497.7 96 480 96L160 96z" />
          </svg>
        </button>

        <button
          type="button"
          className={`toolbar-btn ${tool === 'hand' ? 'toolbar-btn--active' : ''}`}
          onClick={() => setTool('hand')}
          aria-label="Pan tool"
          title="Pan (Hand)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M320.5 64C295.2 64 273.3 78.7 262.9 100C255.9 97.4 248.4 96 240.5 96C205.2 96 176.5 124.7 176.5 160L176.5 325.5L173.8 322.8C148.8 297.8 108.3 297.8 83.3 322.8C58.3 347.8 58.3 388.3 83.3 413.3L171 501C219 549 284.1 576 352 576L368.5 576C370 576 371.5 575.9 373 575.6C464.7 569.4 538 496.2 544.1 404.5C544.4 403 544.5 401.5 544.5 400L544.5 224C544.5 188.7 515.8 160 480.5 160C475 160 469.6 160.7 464.5 162L464.5 160C464.5 124.7 435.8 96 400.5 96C392.6 96 385.1 97.4 378.1 100C367.7 78.7 345.8 64 320.5 64zM304.5 160.1L304.5 160L304.5 128C304.5 119.2 311.7 112 320.5 112C329.3 112 336.5 119.2 336.5 128L336.5 296C336.5 309.3 347.2 320 360.5 320C373.8 320 384.5 309.3 384.5 296L384.5 160C384.5 151.2 391.7 144 400.5 144C409.3 144 416.5 151.2 416.5 160L416.5 296C416.5 309.3 427.2 320 440.5 320C453.8 320 464.5 309.3 464.5 296L464.5 224C464.5 215.2 471.7 208 480.5 208C489.3 208 496.5 215.2 496.5 224L496.5 396.9C496.4 397.5 496.4 398.2 496.3 398.8C492.9 468.5 437 524.4 367.3 527.8C366.7 527.8 366 527.9 365.4 528L352 528C296.9 528 244 506.1 205 467.1L117.2 379.3C111 373.1 111 362.9 117.2 356.7C123.4 350.5 133.6 350.5 139.8 356.7L183.5 400.4C190.4 407.3 200.7 409.3 209.7 405.6C218.7 401.9 224.5 393.1 224.5 383.4L224.5 160C224.5 151.2 231.7 144 240.5 144C249.3 144 256.5 151.1 256.5 159.9L256.5 296C256.5 309.3 267.2 320 280.5 320C293.8 320 304.5 309.3 304.5 296L304.5 160.1z" />
          </svg>
        </button>

        <button
          type="button"
          className={'toolbar-btn'}
          onClick={resetViewport}
          aria-label="Reset viewport"
          title="Reset viewport (zoom 1:1, center page)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M320 48C337.7 48 352 62.3 352 80L352 98.3C450.1 112.3 527.7 189.9 541.7 288L560 288C577.7 288 592 302.3 592 320C592 337.7 577.7 352 560 352L541.7 352C527.7 450.1 450.1 527.7 352 541.7L352 560C352 577.7 337.7 592 320 592C302.3 592 288 577.7 288 560L288 541.7C189.9 527.7 112.3 450.1 98.3 352L80 352C62.3 352 48 337.7 48 320C48 302.3 62.3 288 80 288L98.3 288C112.3 189.9 189.9 112.3 288 98.3L288 80C288 62.3 302.3 48 320 48zM163.2 352C175.9 414.7 225.3 464.1 288 476.8L288 464C288 446.3 302.3 432 320 432C337.7 432 352 446.3 352 464L352 476.8C414.7 464.1 464.1 414.7 476.8 352L464 352C446.3 352 432 337.7 432 320C432 302.3 446.3 288 464 288L476.8 288C464.1 225.3 414.7 175.9 352 163.2L352 176C352 193.7 337.7 208 320 208C302.3 208 288 193.7 288 176L288 163.2C225.3 175.9 175.9 225.3 163.2 288L176 288C193.7 288 208 302.3 208 320C208 337.7 193.7 352 176 352L163.2 352zM320 272C346.5 272 368 293.5 368 320C368 346.5 346.5 368 320 368C293.5 368 272 346.5 272 320C272 293.5 293.5 272 320 272z" />
          </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M482.4 221.9C517.7 213.6 544 181.9 544 144C544 99.8 508.2 64 464 64C420.6 64 385.3 98.5 384 141.5L200.2 215.1C185.7 200.8 165.9 192 144 192C99.8 192 64 227.8 64 272C64 316.2 99.8 352 144 352C156.2 352 167.8 349.3 178.1 344.4L323.7 471.8C321.3 479.4 320 487.6 320 496C320 540.2 355.8 576 400 576C444.2 576 480 540.2 480 496C480 468.3 466 443.9 444.6 429.6L482.4 221.9zM220.3 296.2C222.5 289.3 223.8 282 224 274.5L407.8 201C411.4 204.5 415.2 207.7 419.4 210.5L381.6 418.1C376.1 419.4 370.8 421.2 365.8 423.6L220.3 296.2z" />
          </svg>
        </button>

        {canvasMode === 'image' && (
          <button
            type="button"
            className="toolbar-btn"
            onClick={onReplaceImage}
            aria-label="Replace image"
            title="Replace image"
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M352 96C352 78.3 337.7 64 320 64C302.3 64 288 78.3 288 96L288 306.7L246.6 265.3C234.1 252.8 213.8 252.8 201.3 265.3C188.8 277.8 188.8 298.1 201.3 310.6L297.3 406.6C309.8 419.1 330.1 419.1 342.6 406.6L438.6 310.6C451.1 298.1 451.1 277.8 438.6 265.3C426.1 252.8 405.8 252.8 393.3 265.3L352 306.7L352 96zM160 384C124.7 384 96 412.7 96 448L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 448C544 412.7 515.3 384 480 384L433.1 384L376.5 440.6C345.3 471.8 294.6 471.8 263.4 440.6L206.9 384L160 384zM464 440C477.3 440 488 450.7 488 464C488 477.3 477.3 488 464 488C450.7 488 440 477.3 440 464C440 450.7 450.7 440 464 440z" />
          </svg>
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
              <path d="M320.1 32C329.1 32 337.4 37.1 341.5 45.1L415 189.3L574.9 214.7C583.8 216.1 591.2 222.4 594 231C596.8 239.6 594.5 249 588.2 255.4L473.7 369.9L499 529.8C500.4 538.7 496.7 547.7 489.4 553C482.1 558.3 472.4 559.1 464.4 555L320.1 481.6L175.8 555C167.8 559.1 158.1 558.3 150.8 553C143.5 547.7 139.8 538.8 141.2 529.8L166.4 369.9L52 255.4C45.6 249 43.4 239.6 46.2 231C49 222.4 56.3 216.1 65.3 214.7L225.2 189.3L298.8 45.1C302.9 37.1 311.2 32 320.2 32zM320.1 108.8L262.3 222C258.8 228.8 252.3 233.6 244.7 234.8L119.2 254.8L209 344.7C214.4 350.1 216.9 357.8 215.7 365.4L195.9 490.9L309.2 433.3C316 429.8 324.1 429.8 331 433.3L444.3 490.9L424.5 365.4C423.3 357.8 425.8 350.1 431.2 344.7L521 254.8L395.5 234.8C387.9 233.6 381.4 228.8 377.9 222L320.1 108.8z" />
            </svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M88 256L232 256C241.7 256 250.5 250.2 254.2 241.2C257.9 232.2 255.9 221.9 249 215L202.3 168.3C277.6 109.7 386.6 115 455.8 184.2C530.8 259.2 530.8 380.7 455.8 455.7C380.8 530.7 259.3 530.7 184.3 455.7C174.1 445.5 165.3 434.4 157.9 422.7C148.4 407.8 128.6 403.4 113.7 412.9C98.8 422.4 94.4 442.2 103.9 457.1C113.7 472.7 125.4 487.5 139 501C239 601 401 601 501 501C601 401 601 239 501 139C406.8 44.7 257.3 39.3 156.7 122.8L105 71C98.1 64.2 87.8 62.1 78.8 65.8C69.8 69.5 64 78.3 64 88L64 232C64 245.3 74.7 256 88 256z" />
          </svg>
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
          title="Redo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640">
            <path d="M552 256L408 256C398.3 256 389.5 250.2 385.8 241.2C382.1 232.2 384.1 221.9 391 215L437.7 168.3C362.4 109.7 253.4 115 184.2 184.2C109.2 259.2 109.2 380.7 184.2 455.7C259.2 530.7 380.7 530.7 455.7 455.7C463.9 447.5 471.2 438.8 477.6 429.6C487.7 415.1 507.7 411.6 522.2 421.7C536.7 431.8 540.2 451.8 530.1 466.3C521.6 478.5 511.9 490.1 501 501C401 601 238.9 601 139 501C39.1 401 39 239 139 139C233.3 44.7 382.7 39.4 483.3 122.8L535 71C541.9 64.1 552.2 62.1 561.2 65.8C570.2 69.5 576 78.3 576 88L576 232C576 245.3 565.3 256 552 256z" />
          </svg>
        </button>
      </div>

      {saveStatus && saveStatus !== 'idle' && (
        <span className={`toolbar-save-status toolbar-save-status--${saveStatus}`}>
          {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : 'Save error'}
        </span>
      )}
    </div>
  );
}
