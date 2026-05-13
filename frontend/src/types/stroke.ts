export type ToolType = 'pen' | 'line' | 'arrow' | 'dotted' | 'eraser' | 'select' | 'hand' | 'note'

export interface Stroke {
  id: string
  tool: ToolType
  color: string
  width: number
  opacity: number
  points: number[]
  tension?: number
  lineCap?: 'round' | 'butt' | 'square'
  lineJoin?: 'round' | 'miter' | 'bevel'
  createdAt: string
}
