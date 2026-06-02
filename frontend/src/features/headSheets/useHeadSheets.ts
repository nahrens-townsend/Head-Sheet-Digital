import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { headSheetsApi } from '../../api/headSheets'
import type { CreateHeadSheetPayload, UpdateHeadSheetPayload } from '../../api/headSheets'
import { templatesApi } from '../../api/templates'
import type { CreateTemplatePayload } from '../../api/templates'

export const TEMPLATES_KEY = ['templates'] as const
export const HEAD_SHEETS_KEY = ['head-sheets'] as const

// ─── Template hooks (unchanged) ──────────────────────────────────────────────

export function useTemplates() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: () => templatesApi.list(),
    staleTime: 60_000,
  })
}

export function useCreateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateTemplatePayload) => templatesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  })
}

// ─── Head sheet hooks ─────────────────────────────────────────────────────────

export function useHeadSheetList() {
  return useQuery({
    queryKey: HEAD_SHEETS_KEY,
    queryFn: () => headSheetsApi.list(),
    staleTime: 60_000,
  })
}

export function useHeadSheet(id: string | undefined) {
  return useQuery({
    queryKey: [...HEAD_SHEETS_KEY, id] as const,
    queryFn: () => headSheetsApi.get(id!),
    enabled: !!id,
  })
}

export function useCreateHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateHeadSheetPayload) => headSheetsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: HEAD_SHEETS_KEY }),
  })
}

export function useUpdateHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateHeadSheetPayload) =>
      headSheetsApi.update(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: HEAD_SHEETS_KEY })
      qc.invalidateQueries({ queryKey: [...HEAD_SHEETS_KEY, id] })
    },
  })
}

export function useSaveStrokes() {
  return useMutation({
    mutationFn: ({ id, strokesJson }: { id: string; strokesJson: string }) =>
      headSheetsApi.saveStrokes(id, strokesJson),
  })
}

export function useSaveThumbnail() {
  return useMutation({
    mutationFn: ({
      id,
      thumbnailDataUrl,
      expectedUpdatedAt,
    }: {
      id: string
      thumbnailDataUrl: string
      expectedUpdatedAt: string
    }) => headSheetsApi.saveThumbnail(id, thumbnailDataUrl, expectedUpdatedAt),
  })
}

export function useDeleteHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => headSheetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: HEAD_SHEETS_KEY }),
  })
}
