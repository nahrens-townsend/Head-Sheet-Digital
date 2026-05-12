import { useState } from 'react'
import type { HeadSheetSummary } from '../../types/headSheet'

interface Props {
  sheet: HeadSheetSummary
  onOpen: (id: string) => void
  onDelete: (id: string) => void
}

const TEMPLATE_LABELS: Record<string, string> = {
  front: 'Front view',
  back: 'Back view',
  side: 'Side view',
  top: 'Top view',
}

export function HeadSheetCard({ sheet, onOpen, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(sheet.updatedAt))

  return (
    <div className="sheet-card">
      <div className="sheet-card__preview">
        {sheet.thumbnailUrl ? (
          <img src={sheet.thumbnailUrl} alt="" className="sheet-card__preview-image" loading="lazy" />
        ) : (
          <div className="sheet-card__preview-empty">
            <span>Head sheet</span>
            <small>{TEMPLATE_LABELS[sheet.templateType] ?? sheet.templateType}</small>
          </div>
        )}
      </div>
      <button className="sheet-card__body" onClick={() => onOpen(sheet.id)} aria-label={`Open ${sheet.name}`}>
        <p className="sheet-card__name">{sheet.name}</p>
        <div className="sheet-card__meta">
          {sheet.clientName && <span className="sheet-card__client">{sheet.clientName}</span>}
          <span className="sheet-card__template">{TEMPLATE_LABELS[sheet.templateType] ?? sheet.templateType}</span>
          <span className="sheet-card__date">{formattedDate}</span>
        </div>
      </button>
      <div className="sheet-card__actions">
        {confirming ? (
          <>
            <button
              className="btn btn--ghost btn--danger"
              onClick={() => { onDelete(sheet.id); setConfirming(false) }}
            >
              Confirm delete
            </button>
            <button className="btn btn--ghost" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button
            className="btn btn--ghost btn--danger"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${sheet.name}`}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}
