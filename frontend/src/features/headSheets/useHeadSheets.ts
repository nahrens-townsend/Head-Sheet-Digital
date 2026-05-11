import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { headSheetsApi } from '../../api/headSheets'
import { useCanvasStore } from '../../stores/canvasStore'
import type { CreateHeadSheetPayload } from '../../types/headSheet'
import type { Stroke } from '../../types/stroke'

export const SHEETS_KEY = ['head-sheets'] as const

export function useHeadSheets(params?: { clientName?: string; page?: number; pageSize?: number }) {
  return useQuery({
    queryKey: [...SHEETS_KEY, params],
    queryFn: () => headSheetsApi.list(params),
    staleTime: 60_000,
  })
}

export function useGetHeadSheet(id: string) {
  return useQuery({
    queryKey: [...SHEETS_KEY, id],
    queryFn: () => headSheetsApi.get(id),
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useCreateHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateHeadSheetPayload) => headSheetsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHEETS_KEY }),
  })
}

export function useSaveStrokes(id: string) {
  const setSaveStatus = useCanvasStore((state) => state.setSaveStatus)

  return useMutation({
    mutationFn: (strokes: Stroke[]) => headSheetsApi.saveStrokes(id, strokes),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => setSaveStatus('error'),
  })
}

export function useDeleteHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => headSheetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHEETS_KEY }),
  })
}
