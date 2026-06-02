// Full implementation in Todo 5 — this stub renders a dismissible shell.

export interface CreateSheetModalProps {
  onClose: () => void
}

export function CreateSheetModal({ onClose }: CreateSheetModalProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="modal modal--narrow" role="dialog" aria-modal="true">
        <div className="modal__header">
          <h2>New Head Sheet</h2>
          <button className="modal__close btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal__body">
          <p style={{ color: 'var(--text)' }}>Coming soon…</p>
        </div>
        <div className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
