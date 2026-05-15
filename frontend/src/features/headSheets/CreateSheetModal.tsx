import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { CanvasMode, TemplateType } from '../../types/headSheet'
import { useCreateHeadSheet, useTemplates } from './useHeadSheets'

const ALL_TEMPLATE_TYPES: TemplateType[] = ['front', 'back', 'side', 'top']

interface Props {
  onClose: () => void
  onCreated: (id: string) => void
}

export function CreateSheetModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [clientName, setClientName] = useState('')
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('templates')
  const [selectedTypes, setSelectedTypes] = useState<TemplateType[]>(['front'])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageFileName, setImageFileName] = useState('')
  const [imageMissing, setImageMissing] = useState(false)
  const [isReading, setIsReading] = useState(false)
  const createSheet = useCreateHeadSheet()
  const templates = useTemplates()
  const nameRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function toggleType(type: TemplateType) {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.length > 1 ? prev.filter((t) => t !== type) : prev
        : [...prev, type],
    )
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (canvasMode === 'image' && !imageDataUrl) {
      setImageMissing(true)
      return
    }
    setImageMissing(false)

    let createdId: string | undefined
    try {
      const res = await createSheet.mutateAsync({
        name: name.trim() || 'Untitled Sheet',
        clientName: clientName.trim() || undefined,
        templateType: selectedTypes[0] ?? 'front',
        templateTypes: canvasMode === 'templates' ? selectedTypes : undefined,
        canvasMode,
        imageDataUrl: canvasMode === 'image' ? (imageDataUrl ?? undefined) : undefined,
        templateId: canvasMode === 'templates' ? (selectedTemplateId ?? undefined) : undefined,
      })
      if (res.success && res.data) {
        createdId = res.data.id
      }
    } catch {
      // createSheet.isError displays the error
      return
    }

    if (!createdId) return

    onCreated(createdId)
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose()
  }

  const isPending = createSheet.isPending || isReading

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="modal-title">
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

            {/* Canvas mode selection */}
            <div className="field">
              <label>Canvas type</label>
              <div className="canvas-mode-toggle">
                <label className={`canvas-mode-toggle__option${canvasMode === 'templates' ? ' canvas-mode-toggle__option--active' : ''}`}>
                  <input
                    type="radio"
                    name="canvas-mode"
                    value="templates"
                    checked={canvasMode === 'templates'}
                    onChange={() => { setCanvasMode('templates'); setImageMissing(false); }}
                  />
                  Head Sheet Templates
                </label>
                <label className={`canvas-mode-toggle__option${canvasMode === 'image' ? ' canvas-mode-toggle__option--active' : ''}`}>
                  <input
                    type="radio"
                    name="canvas-mode"
                    value="image"
                    checked={canvasMode === 'image'}
                    onChange={() => { setCanvasMode('image'); setSelectedTemplateId(null); setImageMissing(false); }}
                  />
                  Upload Image
                </label>
              </div>
            </div>

            {/* Template type multi-select */}
            {canvasMode === 'templates' && (
              <>
                <div className="field">
                  <label>Views</label>
                  <div className="template-type-grid">
                    {ALL_TEMPLATE_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`template-type-card${selectedTypes.includes(type) ? ' template-type-card--active' : ''}`}
                        onClick={() => toggleType(type)}
                        aria-pressed={selectedTypes.includes(type)}
                      >
                        <div className="template-type-card__preview">
                          <img src={`/templates/head-${type}.svg`} alt={`${type} view`} />
                        </div>
                        <span className="template-type-card__label">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="template-picker">
                  <div className="template-picker__header">
                    <label>Start from template</label>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => {
                        setSelectedTemplateId(null)
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
              </>
            )}

            {/* Image upload */}
            {canvasMode === 'image' && (
              <div className="field">
                <label htmlFor="canvas-image">Image</label>
                <input
                  id="canvas-image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setImageMissing(false)
                    setIsReading(true)
                    const reader = new FileReader()
                    reader.onload = (ev) => {
                      setImageDataUrl(ev.target?.result as string)
                      setImageFileName(file.name)
                      setIsReading(false)
                    }
                    reader.onerror = () => {
                      setIsReading(false)
                    }
                    reader.readAsDataURL(file)
                  }}
                />
                {imageFileName && <span className="field-hint">{imageFileName}</span>}
                {imageMissing && <span className="field-error">Please select an image.</span>}
              </div>
            )}

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
            <button type="submit" className="btn btn--primary" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create sheet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
