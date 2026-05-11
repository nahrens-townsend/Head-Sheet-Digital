import type { StrokeSize } from '../canvas/utils/canvasUtils'
import type { Stroke } from './stroke'

export interface BaseCanvasObject {
  id: string
  createdAt: string
  color: string
  width: StrokeSize
  opacity: number
}

export interface PenStrokeObject extends BaseCanvasObject {
  type: 'pen'
  points: number[]
  tension: number
}

export interface EraserStrokeObject extends BaseCanvasObject {
  type: 'eraser'
  points: number[]
  tension: number
}

export interface LineObject extends BaseCanvasObject {
  type: 'line' | 'arrow' | 'dotted'
  start: { x: number; y: number }
  mid: { x: number; y: number }
  end: { x: number; y: number }
}

export type CanvasObject = PenStrokeObject | EraserStrokeObject | LineObject

/** Narrows any CanvasObject to the LineObject family (line / arrow / dotted). */
export function isLineObject(obj: CanvasObject): obj is LineObject {
  return obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted'
}

export interface CanvasData {
  version: 2
  objects: CanvasObject[]
}

// ---------------------------------------------------------------------------
// v1 → v2 migration
// ---------------------------------------------------------------------------

function strokeWidthToSize(width: number): StrokeSize {
  if (width <= 2) return 'sm'
  if (width <= 4) return 'md'
  if (width <= 8) return 'lg'
  return 'xl'
}

function migrateStroke(stroke: Stroke): CanvasObject {
  if (stroke.tool === 'line') {
    const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = stroke.points
    return {
      type: 'line',
      id: stroke.id,
      createdAt: stroke.createdAt,
      color: stroke.color,
      width: strokeWidthToSize(stroke.width),
      opacity: stroke.opacity,
      start: { x: x0, y: y0 },
      mid: { x: (x0 + x1) / 2, y: (y0 + y1) / 2 },
      end: { x: x1, y: y1 },
    } satisfies LineObject
  }

  if (stroke.tool === 'eraser') {
    // v1 eraser strokes stored the already-doubled pixel width (STROKE_SIZES[size] * 2).
    // Undo the doubling before mapping to a logical size so the v2 renderer
    // (which re-applies * 2 in ObjectsLayer) reproduces the original visual width.
    return {
      type: 'eraser',
      id: stroke.id,
      createdAt: stroke.createdAt,
      color: stroke.color,
      width: strokeWidthToSize(stroke.width / 2),
      opacity: stroke.opacity,
      points: stroke.points,
      tension: stroke.tension ?? 0.35,
    } satisfies EraserStrokeObject
  }

  return {
    type: 'pen',
    id: stroke.id,
    createdAt: stroke.createdAt,
    color: stroke.color,
    width: strokeWidthToSize(stroke.width),
    opacity: stroke.opacity,
    points: stroke.points,
    tension: stroke.tension ?? 0.35,
  } satisfies PenStrokeObject
}

/** Parse server JSON (v1 Stroke[] or v2 CanvasData) into a CanvasData object. */
export function parseCanvasData(json: string): CanvasData {
  try {
    const parsed = JSON.parse(json) as unknown

    // v2: has version + a valid objects array
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { version?: unknown }).version === 2 &&
      Array.isArray((parsed as { objects?: unknown }).objects)
    ) {
      return parsed as CanvasData
    }

    // v1: flat Stroke array
    if (Array.isArray(parsed)) {
      return {
        version: 2,
        objects: (parsed as Stroke[]).map(migrateStroke),
      }
    }
  } catch {
    // fall through
  }

  return { version: 2, objects: [] }
}
