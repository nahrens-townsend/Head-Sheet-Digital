import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { headSheetsApi } from '../../api/headSheets'
import { useCanvasStore } from '../../stores/canvasStore'
import type { CreateHeadSheetPayload } from '../../types/headSheet'
import type { CanvasData } from '../../types/canvasObject'
import { templatesApi } from '../../api/templates'
import type { CreateTemplatePayload } from '../../api/templates'

export const SHEETS_KEY = ['head-sheets'] as const
export const TEMPLATES_KEY = ['templates'] as const

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
    mutationFn: (data: CanvasData) => headSheetsApi.saveStrokes(id, data),
    onMutate: () => setSaveStatus('saving'),
    onSuccess: () => setSaveStatus('saved'),
    onError: () => setSaveStatus('error'),
  })
}

export function useSaveThumbnail(id: string) {
  return useMutation({
    mutationFn: (payload: { thumbnailDataUrl: string; expectedUpdatedAt: string }) =>
      headSheetsApi.saveThumbnail(id, payload.thumbnailDataUrl, payload.expectedUpdatedAt),
  })
}

export function useDeleteHeadSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => headSheetsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: SHEETS_KEY }),
  })
}

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
