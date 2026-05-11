import type {
  CreateHeadSheetPayload,
  HeadSheet,
  HeadSheetSummary,
  PagedResult,
  UpdateHeadSheetPayload,
} from '../types/headSheet'
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

  delete: (id: string) => apiClient.delete(`/head-sheets/${id}`),
}
