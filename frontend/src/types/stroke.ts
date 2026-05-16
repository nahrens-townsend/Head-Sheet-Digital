export type ToolType = 'select' | 'pencil' | 'note' | 'hand'

// Sub-tools active while tool === 'pencil'
export type DrawingTool = 'line' | 'arrow' | 'dotted' | 'eraser'

// Legacy tool type used only in the v1 → v2 Stroke migration path
export type LegacyToolType = DrawingTool | 'pen' | 'select' | 'hand' | 'note'

export interface Stroke {
  id: string
  tool: LegacyToolType
  color: string
  width: number
  opacity: number
  points: number[]
  tension?: number
  lineCap?: 'round' | 'butt' | 'square'
  lineJoin?: 'round' | 'miter' | 'bevel'
  createdAt: string
}
