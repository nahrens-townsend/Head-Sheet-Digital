import { WORLD_SIZE, type StrokeSize } from '../canvas/utils/canvasUtils'
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
  /** Id of the mirrored twin, present only when created with symmetry enabled. */
  mirrorId?: string
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

/** Legacy sticky-note object. Kept for rendering of pre-v4 data; creation removed. */
export interface NoteObject extends BaseCanvasObject {
  type: 'note'
  /** Normalized [0, 1] horizontal position in canvas space. */
  x: number
  /** Normalized [0, 1] vertical position in canvas space. */
  y: number
  text: string
  noteColor: 'yellow' | 'pink' | 'green' | 'blue'
}

export interface TextObject extends BaseCanvasObject {
  type: 'text'
  /** Normalized [0, 1] horizontal position in canvas space. */
  x: number
  /** Normalized [0, 1] vertical position in canvas space. */
  y: number
  text: string
}

export type CanvasObject = PenStrokeObject | EraserStrokeObject | LineObject | NoteObject | TextObject

/** Narrows any CanvasObject to the LineObject family (line / arrow / dotted). */
export function isLineObject(obj: CanvasObject): obj is LineObject {
  return obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted'
}

/** Narrows any CanvasObject to NoteObject (legacy — pre-v4 sticky-note data). */
export function isNoteObject(obj: CanvasObject): obj is NoteObject {
  return obj.type === 'note'
}

/** Narrows any CanvasObject to TextObject. */
export function isTextObject(obj: CanvasObject): obj is TextObject {
  return obj.type === 'text'
}

export interface CanvasData {
  version: 5
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

/** Migrate v3 objects to v4: convert legacy NoteObjects → TextObjects. */
function migrateV3ToV4(objects: CanvasObject[]): CanvasObject[] {
  return objects.map((obj): CanvasObject => {
    if (obj.type !== 'note') return obj
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { noteColor: _noteColor, type: _type, ...rest } = obj
    return { ...rest, type: 'text' } satisfies TextObject
  })
}

/**
 * Migrate v4 objects to v5: convert normalized [0,1] coordinates → world pixels.
 * Old: coords relative to unknown container size; New: world pixels [0..WORLD_SIZE].
 * Migration assumes objects were created on a WORLD_SIZE reference viewport.
 */
function migrateV4ToV5(objects: CanvasObject[]): CanvasObject[] {
  return objects.map((obj): CanvasObject => {
    if (obj.type === 'pen' || obj.type === 'eraser') {
      return {
        ...obj,
        points: obj.points.map((v, i) =>
          i % 2 === 0 ? v * WORLD_SIZE.width : v * WORLD_SIZE.height,
        ),
      }
    }
    if (obj.type === 'line' || obj.type === 'arrow' || obj.type === 'dotted') {
      return {
        ...obj,
        start: { x: obj.start.x * WORLD_SIZE.width, y: obj.start.y * WORLD_SIZE.height },
        mid:   { x: obj.mid.x   * WORLD_SIZE.width, y: obj.mid.y   * WORLD_SIZE.height },
        end:   { x: obj.end.x   * WORLD_SIZE.width, y: obj.end.y   * WORLD_SIZE.height },
      }
    }
    if (obj.type === 'note' || obj.type === 'text') {
      return {
        ...obj,
        x: obj.x * WORLD_SIZE.width,
        y: obj.y * WORLD_SIZE.height,
      }
    }
    return obj
  })
}

/** Parse server JSON (v1 Stroke[] or v2/v3/v4/v5 CanvasData) into a v5 CanvasData object. */
export function parseCanvasData(json: string): CanvasData {
  try {
    const parsed = JSON.parse(json) as unknown
    const isVersioned = (_v: unknown, n: number): boolean =>
      parsed !== null &&
      typeof parsed === 'object' &&
      !Array.isArray(parsed) &&
      (parsed as { version?: unknown }).version === n &&
      Array.isArray((parsed as { objects?: unknown }).objects)

    // v5: current version (world-pixel coordinates)
    if (isVersioned(parsed, 5)) return parsed as CanvasData

    // v4: had TextObject + normalized [0,1] coords → upgrade to world pixels
    if (isVersioned(parsed, 4)) {
      return { version: 5, objects: migrateV4ToV5((parsed as { objects: CanvasObject[] }).objects) }
    }

    // v3: NoteObject → TextObject, then → world pixels
    if (isVersioned(parsed, 3)) {
      return { version: 5, objects: migrateV4ToV5(migrateV3ToV4((parsed as { objects: CanvasObject[] }).objects)) }
    }

    // v2: was a no-op upgrade to v3; run same pipeline
    if (isVersioned(parsed, 2)) {
      return { version: 5, objects: migrateV4ToV5(migrateV3ToV4((parsed as { objects: CanvasObject[] }).objects)) }
    }

    // v1: flat Stroke array
    if (Array.isArray(parsed)) {
      return { version: 5, objects: migrateV4ToV5(migrateV3ToV4((parsed as Stroke[]).map(migrateStroke))) }
    }
  } catch {
    // fall through
  }

  return { version: 5, objects: [] }
}
