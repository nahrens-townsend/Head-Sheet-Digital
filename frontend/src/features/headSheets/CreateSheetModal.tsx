import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CanvasMode, TemplateType } from '../../types/headSheet'
import { useCreateHeadSheet } from './useHeadSheets'

export interface CreateSheetModalProps {
  onClose: () => void
}

const TEMPLATE_TYPES: { value: TemplateType; label: string }[] = [
  { value: 'front', label: 'Front' },
  { value: 'back', label: 'Back' },
  { value: 'side', label: 'Side' },
  { value: 'top', label: 'Top' },
]

export function CreateSheetModal({ onClose }: CreateSheetModalProps) {
  const navigate = useNavigate()
  const createMutation = useCreateHeadSheet()
  const nameRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState('Untitled Head Sheet')
  const [clientName, setClientName] = useState('')
  const [canvasMode, setCanvasMode] = useState<CanvasMode>('templates')
  const [templateTypes, setTemplateTypes] = useState<TemplateType[]>(['front'])
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  function handleModeChange(mode: CanvasMode) {
    setCanvasMode(mode)
    if (mode === 'templates') {
      setImageDataUrl(null)
      setImageError(null)
    }
  }

  function toggleTemplateType(type: TemplateType) {
    setTemplateTypes((prev) => {
      if (prev.includes(type)) {
        // prevent deselecting the last selected type
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== type)
      }
      return [...prev, type]
    })
  }

  function handleImageChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setImageError(null)
    setImageDataUrl(null)
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      if (!result.startsWith('data:image/')) {
        setImageError('File must be an image.')
        return
      }
      setImageDataUrl(result)
    }
    reader.onerror = () => setImageError('Failed to read file.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (createMutation.isPending) return

    if (canvasMode === 'image' && !imageDataUrl) {
      setImageError('Please select an image.')
      return
    }

    try {
      const sheet = await createMutation.mutateAsync({
        name: name.trim() || 'Untitled Head Sheet',
        clientName: clientName.trim() || null,
        templateType: templateTypes[0] ?? 'front',
        templateTypes: canvasMode === 'templates' ? templateTypes : undefined,
        canvasMode,
        imageDataUrl: canvasMode === 'image' ? imageDataUrl : null,
      })
      navigate(`/sheets/${sheet.id}`)
    } catch {
      // createMutation.isError is set by TanStack Query — error displayed below
    }
  }

  const isSaving = createMutation.isPending
  const submitDisabled =
    isSaving ||
    (canvasMode === 'templates' && templateTypes.length === 0) ||
    (canvasMode === 'image' && !imageDataUrl)

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => !isSaving && e.target === e.currentTarget && onClose()}
      role="presentation"
    >
      <div className="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="create-sheet-title">
        <div className="modal__header">
          <h2 id="create-sheet-title">New Head Sheet</h2>
          <button
            type="button"
            className="modal__close btn btn--ghost"
            onClick={onClose}
            aria-label="Close"
            disabled={isSaving}
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal__body">
            <div className="field">
              <label htmlFor="sheet-name">Name</label>
              <input
                id="sheet-name"
                ref={nameRef}
                type="text"
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="sheet-client-name">
                Client Name{' '}
                <span style={{ fontWeight: 400, color: 'var(--text)' }}>(optional)</span>
              </label>
              <input
                id="sheet-client-name"
                type="text"
                value={clientName}
                maxLength={200}
                placeholder="e.g. Jane Smith"
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Canvas Mode</label>
              <div className="canvas-mode-toggle">
                {(['templates', 'image'] as CanvasMode[]).map((mode) => (
                  <label
                    key={mode}
                    className={`canvas-mode-toggle__option${canvasMode === mode ? ' canvas-mode-toggle__option--active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="canvasMode"
                      value={mode}
                      checked={canvasMode === mode}
                      onChange={() => handleModeChange(mode)}
                    />
                    {mode === 'templates' ? '📐 Templates' : '🖼 Image'}
                  </label>
                ))}
              </div>
            </div>

            {canvasMode === 'templates' && (
              <div className="field">
                <label>Views</label>
                <div className="template-type-grid">
                  {TEMPLATE_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`template-type-card${templateTypes.includes(value) ? ' template-type-card--active' : ''}`}
                      onClick={() => toggleTemplateType(value)}
                      aria-pressed={templateTypes.includes(value)}
                    >
                      <div className="template-type-card__preview">
                        <img src={`/templates/head-${value}.svg`} alt={`${label} view`} />
                      </div>
                      <span className="template-type-card__label">{label}</span>
                    </button>
                  ))}
                </div>
                <p className="field-hint">Select at least one view.</p>
              </div>
            )}

            {canvasMode === 'image' && (
              <div className="field">
                <label htmlFor="sheet-image">Reference Image</label>
                <input
                  id="sheet-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imageError && (
                  <p className="field-error" role="alert">
                    {imageError}
                  </p>
                )}
                {imageDataUrl && (
                  <img
                    src={imageDataUrl}
                    alt="Preview"
                    style={{ marginTop: 8, maxHeight: 120, borderRadius: 6, objectFit: 'contain' }}
                  />
                )}
              </div>
            )}

            {createMutation.isError && (
              <p className="field-error" role="alert">
                Failed to create head sheet. Please try again.
              </p>
            )}
          </div>

          <div className="modal__footer">
            <button
              type="button"
              className="btn btn--ghost"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={submitDisabled}>
              {isSaving ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
