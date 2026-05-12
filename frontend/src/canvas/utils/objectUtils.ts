import type { CanvasObject } from '../../types/canvasObject'
import { createStrokeId } from './canvasUtils'

export const DUPLICATE_OFFSET = 0.02

export function duplicateObject(obj: CanvasObject): CanvasObject {
  const id = createStrokeId()
  const createdAt = new Date().toISOString()

  switch (obj.type) {
    case 'line':
    case 'arrow':
    case 'dotted':
      return {
        ...obj,
        id,
        createdAt,
        start: { x: obj.start.x + DUPLICATE_OFFSET, y: obj.start.y + DUPLICATE_OFFSET },
        mid: { x: obj.mid.x + DUPLICATE_OFFSET, y: obj.mid.y + DUPLICATE_OFFSET },
        end: { x: obj.end.x + DUPLICATE_OFFSET, y: obj.end.y + DUPLICATE_OFFSET },
      }
    case 'pen':
    case 'eraser':
      return {
        ...obj,
        id,
        createdAt,
        points: obj.points.map((v) => v + DUPLICATE_OFFSET),
      }
    case 'note':
      return {
        ...obj,
        id,
        createdAt,
        x: obj.x + DUPLICATE_OFFSET,
        y: obj.y + DUPLICATE_OFFSET,
      }
  }
}
