import type { CanvasData } from '../types/canvasObject'
import type { HeadSheetSummary, TemplateType } from '../types/headSheet'
import { apiClient } from './client'

type ApiResponse<T> = { success: boolean; data: T; error: string | null }

export interface CreateTemplatePayload {
  name: string
  templateType: TemplateType
  canvasData: CanvasData
  thumbnailDataUrl?: string
}

export const templatesApi = {
  list: () => apiClient.get<ApiResponse<HeadSheetSummary[]>>('/templates').then((r) => r.data),

  create: (payload: CreateTemplatePayload) =>
    apiClient
      .post<ApiResponse<HeadSheetSummary>>('/templates', {
        name: payload.name,
        templateType: payload.templateType,
        strokesJson: JSON.stringify(payload.canvasData),
        thumbnailDataUrl: payload.thumbnailDataUrl,
      })
      .then((r) => r.data),

  delete: (id: string) => apiClient.delete(`/templates/${id}`),
}
