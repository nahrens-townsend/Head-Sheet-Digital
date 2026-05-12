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
  /** Id of the symmetry-mirrored twin, if created by the symmetry tool. */
  mirrorId?: string
}

export interface NoteObject extends BaseCanvasObject {
  type: 'note'
  /** Normalized canvas-space position [0, 1]. */
  x: number
  y: number
  text: string
  /** Background color token. */
  noteColor: string
}

export type CanvasObject = PenStrokeObject | EraserStrokeObject | LineObject | NoteObject

/** Narrows to the line family (line / arrow / dotted). */
export function isLineObject(obj: CanvasObject): obj is LineObject {
  return obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted'
}

/** Narrows to NoteObject. */
export function isNoteObject(obj: CanvasObject): obj is NoteObject {
  return obj.type === 'note'
}

export interface CanvasData {
  version: 3
  objects: CanvasObject[]
}

// ---------------------------------------------------------------------------
// Migration helpers
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
    // Undo the doubling before mapping to a logical size so the v3 renderer reproduces the original visual width.
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

/** Parse server JSON (v1 Stroke[], v2 CanvasData, or v3 CanvasData) into a v3 CanvasData object. */
export function parseCanvasData(json: string): CanvasData {
  try {
    const parsed = JSON.parse(json) as unknown

    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed)
    ) {
      const obj = parsed as { version?: unknown; objects?: unknown }
      const version = obj.version
      const objects = Array.isArray(obj.objects) ? (obj.objects as CanvasObject[]) : []

      // v3: return directly
      if (version === 3) {
        return { version: 3, objects }
      }

      // v2: only optional fields added in v3 — no data transformation needed
      if (version === 2) {
        return { version: 3, objects }
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
