import type { CanvasMode, HeadSheet, HeadSheetSummary, TemplateType } from '../types/headSheet'
import { apiClient } from './client'

type ApiResponse<T> = { success: boolean; data: T; error: string | null }

interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreateHeadSheetPayload {
  name: string
  clientName?: string | null
  templateType: TemplateType
  templateId?: string
  templateTypes?: TemplateType[]
  canvasMode?: CanvasMode
  imageDataUrl?: string | null
}

export interface UpdateHeadSheetPayload {
  name: string
  clientName?: string | null
}

export const headSheetsApi = {
  list: () =>
    apiClient
      .get<ApiResponse<PagedResult<HeadSheetSummary>>>('/head-sheets')
      .then((r) => r.data.data.items),

  get: (id: string) =>
    apiClient.get<ApiResponse<HeadSheet>>(`/head-sheets/${id}`).then((r) => r.data.data),

  create: (payload: CreateHeadSheetPayload) =>
    apiClient
      .post<ApiResponse<HeadSheet>>('/head-sheets', payload)
      .then((r) => r.data.data),

  update: (id: string, payload: UpdateHeadSheetPayload) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}`, payload)
      .then((r) => r.data.data),

  saveStrokes: (id: string, strokesJson: string) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}/strokes`, { strokesJson })
      .then((r) => r.data.data),

  saveThumbnail: (id: string, thumbnailDataUrl: string, expectedUpdatedAt: string) =>
    apiClient
      .put<ApiResponse<HeadSheet>>(`/head-sheets/${id}/thumbnail`, {
        thumbnailDataUrl,
        expectedUpdatedAt,
      })
      .then((r) => r.data.data),

  delete: (id: string) => apiClient.delete(`/head-sheets/${id}`),
}
