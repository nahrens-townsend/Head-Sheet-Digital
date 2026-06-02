import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { HeadSheetSummary } from '../../types/headSheet'
import { useDeleteHeadSheet, useHeadSheetList } from './useHeadSheets'
import { CreateSheetModal } from './CreateSheetModal'

export function HeadSheetList() {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const { data: sheets, isLoading, isError } = useHeadSheetList()
  const deleteMutation = useDeleteHeadSheet()

  function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation()
    if (deleteMutation.isPending) return
    deleteMutation.mutate(id)
  }

  let content: React.ReactNode

  if (isLoading) {
    content = <p className="sheets-page__status">Loading…</p>
  } else if (isError) {
    content = (
      <p className="sheets-page__status sheets-page__status--error">
        Failed to load head sheets. Please refresh and try again.
      </p>
    )
  } else if (!sheets || sheets.length === 0) {
    content = (
      <div className="sheets-page__empty">
        <p>No head sheets yet. Create your first one to get started.</p>
        <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
          New Head Sheet
        </button>
      </div>
    )
  } else {
    content = (
      <>
        <p className="sheets-page__count">{sheets.length} head sheet{sheets.length !== 1 ? 's' : ''}</p>
        <div className="sheets-grid">
          {sheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              isDeleting={deleteMutation.isPending && deleteMutation.variables === sheet.id}
              onClick={() => navigate(`/sheets/${sheet.id}`)}
              onDelete={(e) => handleDelete(e, sheet.id)}
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <div className="sheets-page">
      <div className="sheets-page__header">
        <h1 className="sheets-page__title">Head Sheets</h1>
        <div className="sheets-page__controls">
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            + New Head Sheet
          </button>
        </div>
      </div>
      {content}
      {showCreate && <CreateSheetModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

interface SheetCardProps {
  sheet: HeadSheetSummary
  isDeleting: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

function SheetCard({ sheet, isDeleting, onClick, onDelete }: SheetCardProps) {
  return (
    <div className="sheet-card">
      <div className="sheet-card__preview">
        {sheet.thumbnailUrl ? (
          <img
            className="sheet-card__preview-image"
            src={sheet.thumbnailUrl}
            alt={`${sheet.name} preview`}
          />
        ) : (
          <div className="sheet-card__preview-empty">
            <span>No preview</span>
            <small>{sheet.name}</small>
          </div>
        )}
      </div>
      <button className="sheet-card__body" onClick={onClick} type="button">
        <div className="sheet-card__name">{sheet.name}</div>
        <div className="sheet-card__meta">
          {sheet.clientName && <span>{sheet.clientName}</span>}
          <span>Updated {formatDate(sheet.updatedAt)}</span>
        </div>
      </button>
      <div className="sheet-card__actions">
        <button
          className="btn btn--danger"
          type="button"
          disabled={isDeleting}
          onClick={onDelete}
          aria-label={`Delete ${sheet.name}`}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

