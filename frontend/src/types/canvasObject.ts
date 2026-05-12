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
  /** Id of the mirrored twin, present only when created by the symmetry tool. */
  mirrorId?: string
}

export interface NoteObject extends BaseCanvasObject {
  type: 'note'
  /** Normalized [0, 1] horizontal position in canvas space. */
  x: number
  /** Normalized [0, 1] vertical position in canvas space. */
  y: number
  text: string
  noteColor: 'yellow' | 'pink' | 'green' | 'blue'
}

export type CanvasObject = PenStrokeObject | EraserStrokeObject | LineObject | NoteObject

/** Narrows any CanvasObject to the LineObject family (line / arrow / dotted). */
export function isLineObject(obj: CanvasObject): obj is LineObject {
  return obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted'
}

/** Narrows any CanvasObject to NoteObject. */
export function isNoteObject(obj: CanvasObject): obj is NoteObject {
  return obj.type === 'note'
}

export interface CanvasData {
  version: 3
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

/** Parse server JSON (v1 Stroke[] or v2/v3 CanvasData) into a CanvasData object. */
export function parseCanvasData(json: string): CanvasData {
  try {
    const parsed = JSON.parse(json) as unknown

    // v3: current version
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { version?: unknown }).version === 3 &&
      Array.isArray((parsed as { objects?: unknown }).objects)
    ) {
      return parsed as CanvasData
    }

    // v2: upgrade to v3 (no-op — NoteObject and mirrorId are both optional additions)
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { version?: unknown }).version === 2 &&
      Array.isArray((parsed as { objects?: unknown }).objects)
    ) {
      return {
        version: 3,
        objects: (parsed as { objects: CanvasObject[] }).objects,
      }
    }

    // v1: flat Stroke array
    if (Array.isArray(parsed)) {
      return {
        version: 3,
        objects: (parsed as Stroke[]).map(migrateStroke),
      }
    }
  } catch {
    // fall through
  }

  return { version: 3, objects: [] }
}
