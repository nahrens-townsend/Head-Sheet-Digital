import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { headSheetsApi } from '../../api/headSheets'
import type { CreateHeadSheetPayload } from '../../types/headSheet'

export const SHEETS_KEY = ['head-sheets'] as const

export function useHeadSheets(params?: { clientName?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [...SHEETS_KEY, params],
    queryFn: () => headSheetsApi.list(params),
    staleTime: 60_000,
  })
}

export function useCreateHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateHeadSheetPayload) => headSheetsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHEETS_KEY }),
  })
}

export function useDeleteHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => headSheetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHEETS_KEY }),
  })
}
