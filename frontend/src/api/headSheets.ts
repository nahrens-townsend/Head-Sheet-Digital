import type {
  CreateHeadSheetPayload,
  HeadSheet,
  HeadSheetSummary,
  PagedResult,
  UpdateHeadSheetPayload,
} from '../types/headSheet'
import type { CanvasData } from '../types/canvasObject'
import { apiClient } from './client'

type ApiResponse<T> = { success: boolean; data: T; error: string | null }

export const headSheetsApi = {
  list: (params?: { clientName?: string; page?: number; pageSize?: number }) =>
    apiClient
      .get<ApiResponse<PagedResult<HeadSheetSummary>>>('/head-sheets', { params })
      .then((r) => r.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<HeadSheet>>(`/head-sheets/${id}`).then((r) => r.data),

  create: (payload: CreateHeadSheetPayload) =>
    apiClient.post<ApiResponse<HeadSheet>>('/head-sheets', payload).then((r) => r.data),

  update: (id: string, payload: UpdateHeadSheetPayload) =>
    apiClient.put<ApiResponse<HeadSheet>>(`/head-sheets/${id}`, payload).then((r) => r.data),

  saveStrokes: (id: string, data: CanvasData) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}/strokes`, {
        strokesJson: JSON.stringify(data),
      })
      .then((r) => r.data),

  saveThumbnail: (id: string, thumbnailDataUrl: string, expectedUpdatedAt: string) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}/thumbnail`, {
        thumbnailDataUrl,
        expectedUpdatedAt,
      })
      .then((r) => r.data),

  saveImage: (id: string, imageDataUrl: string) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}/image`, { imageDataUrl }, { timeout: 30_000 })
      .then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/head-sheets/${id}`),
}
