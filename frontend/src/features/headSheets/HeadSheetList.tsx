import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDebounce } from '../../hooks/useDebounce'
import { CreateSheetModal } from './CreateSheetModal'
import { HeadSheetCard } from './HeadSheetCard'
import { useDeleteHeadSheet, useHeadSheets } from './useHeadSheets'

export function HeadSheetList() {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isError } = useHeadSheets({
    clientName: debouncedSearch || undefined,
  })
  const deleteSheet = useDeleteHeadSheet()

  const sheets = data?.data?.items ?? []
  const totalCount = data?.data?.totalCount ?? 0

  return (
    <div className="sheets-page">
      <div className="sheets-page__header">
        <h1 className="sheets-page__title">Head Sheets</h1>
        <div className="sheets-page__controls">
          <input
            type="search"
            className="sheets-page__search"
            placeholder="Search by client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search by client name"
          />
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            + New sheet
          </button>
        </div>
      </div>

      {isLoading && <p className="sheets-page__status">Loading…</p>}
      {isError && <p className="sheets-page__status sheets-page__status--error">Failed to load sheets.</p>}

      {!isLoading && !isError && sheets.length === 0 && (
        <div className="sheets-page__empty">
          {debouncedSearch ? (
            <p>No sheets found for &ldquo;{debouncedSearch}&rdquo;.</p>
          ) : (
            <>
              <p>You haven&rsquo;t created any head sheets yet.</p>
              <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
                Create your first sheet
              </button>
            </>
          )}
        </div>
      )}

      {sheets.length > 0 && (
        <>
          <p className="sheets-page__count">
            {totalCount} {totalCount === 1 ? 'sheet' : 'sheets'}
          </p>
          <div className="sheets-grid">
            {sheets.map((sheet) => (
              <HeadSheetCard
                key={sheet.id}
                sheet={sheet}
                onOpen={(id) => navigate(`/sheets/${id}`)}
                onDelete={(id) => deleteSheet.mutate(id)}
              />
            ))}
          </div>
        </>
      )}

      {showCreate && (
        <CreateSheetModal
          onClose={() => setShowCreate(false)}
          onCreated={(id) => {
            setShowCreate(false)
            navigate(`/sheets/${id}`)
          }}
        />
      )}
    </div>
  )
}
