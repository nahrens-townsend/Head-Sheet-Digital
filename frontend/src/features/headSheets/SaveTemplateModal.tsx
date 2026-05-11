import { type FormEvent, useEffect, useRef, useState } from 'react'

interface Props {
  defaultName: string
  errorMessage?: string | null
  isSaving: boolean
  onClose: () => void
  onSave: (name: string) => Promise<void>
}

export function SaveTemplateModal({ defaultName, errorMessage, isSaving, onClose, onSave }: Props) {
  const [name, setName] = useState(defaultName)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isSaving) return
    await onSave(name.trim() || defaultName)
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div className="modal modal--narrow" role="dialog" aria-modal="true" aria-labelledby="save-template-title">
        <div className="modal__header">
          <h2 id="save-template-title">Save as template</h2>
          <button className="modal__close btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="field">
              <label htmlFor="template-name">Template name</label>
              <input
                id="template-name"
                ref={nameRef}
                type="text"
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            {errorMessage && (
              <p className="field-error" role="alert">
                {errorMessage}
              </p>
            )}
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
