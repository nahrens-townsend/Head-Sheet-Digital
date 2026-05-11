export type TemplateType = 'front' | 'back' | 'side'

export interface HeadSheet {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  strokesJson: string
  createdAt: string
  updatedAt: string
}

export interface HeadSheetSummary {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  updatedAt: string
}

export interface CreateHeadSheetPayload {
  name: string
  clientName?: string
  templateType: TemplateType
}

export interface UpdateHeadSheetPayload {
  name: string
  clientName?: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
  page: number
  pageSize: number
}
