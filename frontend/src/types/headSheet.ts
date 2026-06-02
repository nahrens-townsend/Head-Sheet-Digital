export type TemplateType = 'front' | 'back' | 'side' | 'top'

export type CanvasMode = 'templates' | 'image'

// HeadSheetSummary is used by the TemplatesController API (api/templates.ts).
export interface HeadSheetSummary {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  thumbnailUrl: string | null
  updatedAt: string
}

// HeadSheet is the full response from GET /head-sheets/:id (matches HeadSheetResponseDto).
export interface HeadSheet {
  id: string
  name: string
  clientName: string | null
  templateType: TemplateType
  templateTypes: TemplateType[]
  canvasMode: CanvasMode
  imageDataUrl: string | null
  strokesJson: string
  thumbnailUrl: string | null
  createdAt: string
  updatedAt: string
}
