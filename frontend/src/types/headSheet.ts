export type TemplateType = 'front' | 'back' | 'side' | 'top'

export type CanvasMode = 'templates' | 'image'

export interface HeadSheet {
  id: string
  name: string
  clientName: string | null
  templateTypes: TemplateType[]
  canvasMode: CanvasMode
  imageDataUrl: string | null
  strokesJson: string
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface HeadSheetSummary {
  id: string
  name: string
  clientName: string | null
  /** Legacy single-template field — kept for backward compat; equals templateTypes[0]. */
  templateType: TemplateType
  thumbnailUrl: string | null
  updatedAt: string
}

export interface CreateHeadSheetPayload {
  name: string
  clientName?: string
  templateType: TemplateType
  templateTypes?: TemplateType[]
  canvasMode?: CanvasMode
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
