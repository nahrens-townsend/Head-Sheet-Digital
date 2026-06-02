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
