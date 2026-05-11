export type TemplateType = 'front' | 'back' | 'side'

export interface HeadSheet {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  strokesJson: string
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface HeadSheetSummary {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  thumbnailUrl: string | null
  updatedAt: string
}

export interface CreateHeadSheetPayload {
  name: string
  clientName?: string
  templateType: TemplateType
  templateId?: string
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
