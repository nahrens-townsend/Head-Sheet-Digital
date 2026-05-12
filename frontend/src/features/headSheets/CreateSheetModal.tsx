import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { TemplateType } from '../../types/headSheet'
import { useCreateHeadSheet, useTemplates } from './useHeadSheets'

interface Props {
  onClose: () => void
  onCreated: (id: string) => void
}

export function CreateSheetModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [templateType, setTemplateType] = useState<TemplateType>('front')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const createSheet = useCreateHeadSheet()
  const templates = useTemplates()
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      const res = await createSheet.mutateAsync({
        name: name.trim() || 'Untitled Sheet',
        clientName: clientName.trim() || undefined,
        templateType,
        templateId: selectedTemplateId ?? undefined,
      })
      if (res.success && res.data) {
        onCreated(res.data.id)
      }
    } catch {
      // error state handled by createSheet.isError
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal__header">
          <h2 id="modal-title">New Head Sheet</h2>
          <button className="modal__close btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="field">
              <label htmlFor="sheet-name">Sheet name</label>
              <input
                id="sheet-name"
                ref={nameRef}
                type="text"
                value={name}
                placeholder="Untitled Sheet"
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="client-name">Client name</label>
              <input
                id="client-name"
                type="text"
                value={clientName}
                placeholder="Optional"
                maxLength={200}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="template-type">View</label>
              <select
                id="template-type"
                value={templateType}
                disabled={selectedTemplateId !== null}
                onChange={(e) => setTemplateType(e.target.value as TemplateType)}
              >
                <option value="front">Front</option>
                <option value="back">Back</option>
                <option value="side">Side</option>
                <option value="top">Top</option>
              </select>
            </div>
            <div className="template-picker">
              <div className="template-picker__header">
                <label>Start from template</label>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setSelectedTemplateId(null)
                    setTemplateType('front')
                  }}
                >
                  Blank
                </button>
              </div>
              {templates.isLoading && <p className="template-picker__status">Loading templates…</p>}
              {templates.isError && <p className="template-picker__status template-picker__status--error">Failed to load templates.</p>}
              {!templates.isLoading && !templates.isError && (templates.data?.data ?? []).length === 0 && (
                <p className="template-picker__status">No saved templates yet.</p>
              )}
              <div className="template-picker__grid">
                {(templates.data?.data ?? []).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={`template-picker__card ${selectedTemplateId === template.id ? 'template-picker__card--active' : ''}`}
                    onClick={() => {
                      setSelectedTemplateId(template.id)
                      setTemplateType(template.templateType)
                    }}
                    aria-pressed={selectedTemplateId === template.id}
                  >
                    <div className="template-picker__thumb">
                      {template.thumbnailUrl ? (
                        <img src={template.thumbnailUrl} alt="" loading="lazy" />
                      ) : (
                        <span>Preview</span>
                      )}
                    </div>
                    <div className="template-picker__name">{template.name}</div>
                    <div className="template-picker__meta">
                      {template.templateType} view
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {createSheet.isError && (
              <p className="field-error" role="alert">
                Failed to create sheet. Please try again.
              </p>
            )}
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={createSheet.isPending}>
              {createSheet.isPending ? 'Creating…' : 'Create sheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
