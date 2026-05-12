import { useState, useEffect, useRef } from 'react'
import { Circle, Group, Layer, Line, Shape } from 'react-konva'
import type { CanvasObject } from '../../types/canvasObject'
import { isLineObject } from '../../types/canvasObject'
import type { SnapFn, SnapIndicator } from '../utils/snapping'
import {
  denormalizePoint,
  denormalizePoints,
  normalizePoint,
  normalizePoints,
  STROKE_SIZES,
  type Point,
  type StageSize,
} from '../utils/canvasUtils'

const HANDLE_RADIUS = 7
const HANDLE_FILL = '#ffffff'
const HANDLE_STROKE = '#aa3bff'
const SELECTION_HIGHLIGHT = '#aa3bff'
const BODY_HIT_WIDTH = 22

// ── Draft state types ─────────────────────────────────────────────────────────

interface LineDraft {
  kind: 'line'
  id: string
  start: Point // px (content-space)
  mid: Point
  end: Point
}

interface PenDraft {
  kind: 'pen'
  id: string
  points: number[] // flat [x0,y0,x1,y1,...] in px
}

type DraftState = LineDraft | PenDraft | null

interface LineBodyDrag {
  kind: 'line'
  id: string
  snapStart: Point
  snapMid: Point
  snapEnd: Point
  pointerStart: Point
  lastDx: number
  lastDy: number
}

interface PenBodyDrag {
  kind: 'pen'
  id: string
  snapPoints: number[]
  pointerStart: Point
  lastDx: number
  lastDy: number
}

type BodyDragSnap = LineBodyDrag | PenBodyDrag | null

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Recompute the mid control-point when an endpoint moves, preserving the
 * curve shape by working in chord-local (tangent/normal) coordinates and
 * scaling both components proportionally with the new chord length.
 *
 * This avoids the world-space delta shortcut which produces wrong results
 * when the chord rotates (e.g. a 90° pivot of one endpoint).
 */
function recomputeMid(
  newStart: Point,
  newEnd: Point,
  origStart: Point,
  origMid: Point,
  origEnd: Point,
): Point {
  const origDx = origEnd.x - origStart.x
  const origDy = origEnd.y - origStart.y
  const origLen = Math.hypot(origDx, origDy)
  if (origLen < 1) return origMid // degenerate original chord — keep mid

  // Original chord frame (unit tangent + unit normal)
  const origTx = origDx / origLen;  const origTy = origDy / origLen
  const origNx = -origTy;           const origNy = origTx

  // Decompose origMid's offset from the chord midpoint into the chord frame
  const offX = origMid.x - (origStart.x + origEnd.x) / 2
  const offY = origMid.y - (origStart.y + origEnd.y) / 2
  const tComp = offX * origTx + offY * origTy // along-chord
  const nComp = offX * origNx + offY * origNy // cross-chord (curvature strength)

  // New chord frame
  const newDx = newEnd.x - newStart.x
  const newDy = newEnd.y - newStart.y
  const newLen = Math.hypot(newDx, newDy)
  if (newLen < 1) {
    return { x: (newStart.x + newEnd.x) / 2, y: (newStart.y + newEnd.y) / 2 }
  }

  const newTx = newDx / newLen;  const newTy = newDy / newLen
  const newNx = -newTy;          const newNy = newTx

  // Scale proportionally with new chord length — keeps curve self-similar
  const scale = newLen / origLen
  return {
    x: (newStart.x + newEnd.x) / 2 + tComp * scale * newTx + nComp * scale * newNx,
    y: (newStart.y + newEnd.y) / 2 + tComp * scale * newTy + nComp * scale * newNy,
  }
}

/** Point on the quadratic Bézier at t=0.5, given start, control, and end. */
function onCurveAtHalf(start: Point, ctrl: Point, end: Point): Point {
  return {
    x: 0.25 * start.x + 0.5 * ctrl.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * ctrl.y + 0.25 * end.y,
  }
}

/** Inverse: given the desired on-curve point q at t=0.5, derive the bezier ctrl. */
function ctrlFromOnCurve(q: Point, start: Point, end: Point): Point {
  return {
    x: 2 * q.x - 0.5 * (start.x + end.x),
    y: 2 * q.y - 0.5 * (start.y + end.y),
  }
}

// ── ControlHandle ─────────────────────────────────────────────────────────────

function ControlHandle({
  x,
  y,
  radius,
  zoom,
  onDragStart,
  onDragMove,
  onDragEnd,
  onDblClick,
}: {
  x: number
  y: number
  radius: number
  zoom: number
  onDragStart?: () => void
  onDragMove: (p: Point) => void
  onDragEnd: (p: Point) => void
  onDblClick?: () => void
}) {
  return (
    <Circle
      x={x}
      y={y}
      radius={radius}
      fill={HANDLE_FILL}
      stroke={HANDLE_STROKE}
      strokeWidth={2 / zoom}
      draggable
      onDragStart={() => onDragStart?.()}
      onDragMove={(e) => onDragMove({ x: e.target.x(), y: e.target.y() })}
      onDragEnd={(e) => onDragEnd({ x: e.target.x(), y: e.target.y() })}
      onDblClick={onDblClick}
    />
  )
}

// ── SelectionLayer ────────────────────────────────────────────────────────────

interface SelectionLayerProps {
  objects: CanvasObject[]
  selectedObjectIds: string[]
  stageSize: StageSize
  zoom: number
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void
  snapIndicator?: SnapIndicator | null
  snap?: SnapFn
  clearSnap?: () => void
  isExporting?: boolean
  onDraftStart?: (id: string) => void
  onDraftEnd?: () => void
}

export function SelectionLayer({
  objects,
  selectedObjectIds,
  stageSize,
  zoom,
  onUpdateObject,
  snapIndicator = null,
  snap,
  clearSnap,
  isExporting = false,
  onDraftStart,
  onDraftEnd,
}: SelectionLayerProps) {
  // Ref so drag callbacks always see the latest stageSize even after a window resize
  const stageSizeRef = useRef(stageSize)
  useEffect(() => {
    stageSizeRef.current = stageSize
  }, [stageSize])

  // Keep refs to draft state and onDraftEnd so the unmount cleanup can safely call it.
  const onDraftEndRef = useRef(onDraftEnd)
  useEffect(() => { onDraftEndRef.current = onDraftEnd }, [onDraftEnd])
  const draftActiveRef = useRef(false)

  // Pixel-space draft positions for live visual feedback during any drag
  const [draftState, setDraftState] = useState<DraftState>(null)
  // Snapshot captured at body-drag start (does not drive renders)
  const bodyDragRef = useRef<BodyDragSnap>(null)

  // Track whether a draft is currently active (used by unmount cleanup).
  useEffect(() => { draftActiveRef.current = draftState !== null }, [draftState])

  // If this component unmounts while a drag is in progress, clear the parent's
  // editingObjectId so ObjectsLayer does not permanently hide the object.
  useEffect(() => {
    return () => {
      if (draftActiveRef.current) onDraftEndRef.current?.()
    }
  }, [])

  if (isExporting) {
    return null
  }

  // Scale handle radius inversely with zoom so handles remain the same size on screen.
  const handleRadius = HANDLE_RADIUS / zoom

  const selectedObjects = selectedObjectIds
    .map((id) => objects.find((o) => o.id === id))
    .filter(Boolean) as CanvasObject[]

  return (
    <Layer>
      {selectedObjects.map((obj) => {
        // ── Pen stroke ──────────────────────────────────────────────────────
        if (obj.type === 'pen') {
          const committedPts = denormalizePoints(obj.points, stageSize)
          const draftPen = draftState?.kind === 'pen' && draftState.id === obj.id
            ? draftState
            : null
          const pts = draftPen ? draftPen.points : committedPts

          return (
            <Group key={obj.id}>
              {/* Selection highlight — updates during body drag via draftPen */}
              <Line
                points={pts}
                stroke={SELECTION_HIGHLIGHT}
                strokeWidth={STROKE_SIZES[obj.width] + 6}
                opacity={0.35}
                tension={obj.tension}
                lineCap="round"
                lineJoin="round"
                strokeScaleEnabled={false}
                listening={false}
              />
              {/* Body drag handle — invisible wide hit area */}
              <Line
                points={committedPts}
                stroke="black"
                strokeWidth={STROKE_SIZES[obj.width] + BODY_HIT_WIDTH}
                tension={obj.tension}
                lineCap="round"
                lineJoin="round"
                hitStrokeWidth={STROKE_SIZES[obj.width] + BODY_HIT_WIDTH}
                opacity={0}
                strokeScaleEnabled={false}
                draggable
                dragBoundFunc={() => ({ x: 0, y: 0 })}
                onDragStart={(e) => {
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  if (!ptr) return
                  onDraftStart?.(obj.id)
                  bodyDragRef.current = {
                    kind: 'pen',
                    id: obj.id,
                    snapPoints: denormalizePoints(obj.points, stageSizeRef.current),
                    pointerStart: ptr,
                    lastDx: 0,
                    lastDy: 0,
                  }
                }}
                onDragMove={(e) => {
                  const ref = bodyDragRef.current
                  if (!ref || ref.kind !== 'pen' || ref.id !== obj.id) return
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  if (!ptr) return
                  const dx = ptr.x - ref.pointerStart.x
                  const dy = ptr.y - ref.pointerStart.y
                  ref.lastDx = dx
                  ref.lastDy = dy
                  setDraftState({
                    kind: 'pen',
                    id: obj.id,
                    points: ref.snapPoints.map((v, i) => (i % 2 === 0 ? v + dx : v + dy)),
                  })
                }}
                onDragEnd={(e) => {
                  const ref = bodyDragRef.current
                  bodyDragRef.current = null
                  if (!ref || ref.kind !== 'pen' || ref.id !== obj.id) {
                    setDraftState(null)
                    onDraftEnd?.()
                    return
                  }
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  // Fall back to last known delta if pointer is unavailable on release
                  const dx = ptr ? ptr.x - ref.pointerStart.x : ref.lastDx
                  const dy = ptr ? ptr.y - ref.pointerStart.y : ref.lastDy
                  const ss = stageSizeRef.current
                  const newPts = ref.snapPoints.map((v, i) => (i % 2 === 0 ? v + dx : v + dy))
                  onUpdateObject(obj.id, (o) =>
                    o.type === 'pen' ? { ...o, points: normalizePoints(newPts, ss) } : o,
                  )
                  setDraftState(null)
                  onDraftEnd?.()
                }}
              />
            </Group>
          )
        }

        // ── LineObject (line / arrow / dotted) ──────────────────────────────
        if (isLineObject(obj)) {
          const cStart = denormalizePoint(obj.start, stageSize)
          const cMid   = denormalizePoint(obj.mid,   stageSize)
          const cEnd   = denormalizePoint(obj.end,   stageSize)

          const draftLine = draftState?.kind === 'line' && draftState.id === obj.id
            ? draftState
            : null
          const dStart = draftLine ? draftLine.start : cStart
          const dMid   = draftLine ? draftLine.mid   : cMid
          const dEnd   = draftLine ? draftLine.end   : cEnd

          return (
            <Group key={obj.id}>
              {/* Body drag handle — transparent bezier hit area, lowest priority */}
              <Shape
                opacity={0}
                stroke="black"
                strokeWidth={BODY_HIT_WIDTH}
                hitStrokeWidth={BODY_HIT_WIDTH}
                strokeScaleEnabled={false}
                draggable
                dragBoundFunc={() => ({ x: 0, y: 0 })}
                sceneFunc={(ctx, shape) => {
                  ctx.beginPath()
                  ctx.moveTo(cStart.x, cStart.y)
                  ctx.quadraticCurveTo(cMid.x, cMid.y, cEnd.x, cEnd.y)
                  ctx.strokeShape(shape)
                }}
                onDragStart={(e) => {
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  if (!ptr) return
                  onDraftStart?.(obj.id)
                  bodyDragRef.current = {
                    kind: 'line',
                    id: obj.id,
                    snapStart: cStart,
                    snapMid:   cMid,
                    snapEnd:   cEnd,
                    pointerStart: ptr,
                    lastDx: 0,
                    lastDy: 0,
                  }
                }}
                onDragMove={(e) => {
                  const ref = bodyDragRef.current
                  if (!ref || ref.kind !== 'line' || ref.id !== obj.id) return
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  if (!ptr) return
                  const dx = ptr.x - ref.pointerStart.x
                  const dy = ptr.y - ref.pointerStart.y
                  ref.lastDx = dx
                  ref.lastDy = dy
                  // Update snap indicator during body drag — mirror the start-priority/end-fallback
                  // logic used at onDragEnd so the indicator reflects which endpoint would actually snap.
                  const bsStart = snap?.({ x: ref.snapStart.x + dx, y: ref.snapStart.y + dy }, obj.id)
                  if (!bsStart?.snapped) {
                    snap?.({ x: ref.snapEnd.x + dx, y: ref.snapEnd.y + dy }, obj.id)
                  }
                  setDraftState({
                    kind: 'line',
                    id: obj.id,
                    start: { x: ref.snapStart.x + dx, y: ref.snapStart.y + dy },
                    mid:   { x: ref.snapMid.x   + dx, y: ref.snapMid.y   + dy },
                    end:   { x: ref.snapEnd.x   + dx, y: ref.snapEnd.y   + dy },
                  })
                }}
                onDragEnd={(e) => {
                  const ref = bodyDragRef.current
                  bodyDragRef.current = null
                  if (!ref || ref.kind !== 'line' || ref.id !== obj.id) {
                    setDraftState(null)
                    onDraftEnd?.()
                    return
                  }
                  const ptr = e.target.getStage()?.getRelativePointerPosition()
                  // Fall back to last known delta if pointer is unavailable on release
                  const dx = ptr ? ptr.x - ref.pointerStart.x : ref.lastDx
                  const dy = ptr ? ptr.y - ref.pointerStart.y : ref.lastDy

                  let newStart: Point = { x: ref.snapStart.x + dx, y: ref.snapStart.y + dy }
                  let newEnd:   Point = { x: ref.snapEnd.x   + dx, y: ref.snapEnd.y   + dy }
                  let newMid:   Point = { x: ref.snapMid.x   + dx, y: ref.snapMid.y   + dy }

                  if (snap) {
                    // Rigid translation: snap whichever endpoint is closer to a target,
                    // then apply the same delta to all three points to avoid deforming.
                    const sStart = snap(newStart, obj.id)
                    const sEnd   = snap(newEnd,   obj.id)
                    const snapDelta = sStart.snapped
                      ? { x: sStart.point.x - newStart.x, y: sStart.point.y - newStart.y }
                      : sEnd.snapped
                        ? { x: sEnd.point.x - newEnd.x, y: sEnd.point.y - newEnd.y }
                        : null
                    if (snapDelta) {
                      newStart = { x: newStart.x + snapDelta.x, y: newStart.y + snapDelta.y }
                      newEnd   = { x: newEnd.x   + snapDelta.x, y: newEnd.y   + snapDelta.y }
                      newMid   = { x: newMid.x   + snapDelta.x, y: newMid.y   + snapDelta.y }
                    }
                    clearSnap?.()
                  }

                  const ss = stageSizeRef.current
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? {
                          ...o,
                          start: normalizePoint(newStart, ss),
                          mid:   normalizePoint(newMid,   ss),
                          end:   normalizePoint(newEnd,   ss),
                        }
                      : o,
                  )
                  setDraftState(null)
                  onDraftEnd?.()
                }}
              />

              {/* Live bezier overlay — only rendered during an active drag */}
              {draftLine && (
                <Shape
                  stroke={obj.color}
                  strokeWidth={STROKE_SIZES[obj.width]}
                  opacity={obj.opacity}
                  lineCap="round"
                  lineJoin="round"
                  strokeScaleEnabled={false}
                  listening={false}
                  sceneFunc={(ctx, shape) => {
                    ctx.beginPath()
                    ctx.moveTo(dStart.x, dStart.y)
                    ctx.quadraticCurveTo(dMid.x, dMid.y, dEnd.x, dEnd.y)
                    ctx.strokeShape(shape)
                  }}
                />
              )}

              {/* Control handles — rendered last so they sit above the body drag shape */}
              <ControlHandle
                x={cStart.x}
                y={cStart.y}
                radius={handleRadius}
                zoom={zoom}
                onDragStart={() => onDraftStart?.(obj.id)}
                onDragMove={(p) => {
                  const sr = snap?.(p, obj.id)
                  const sp = sr?.point ?? p
                  const newMid = recomputeMid(sp, cEnd, cStart, cMid, cEnd)
                  setDraftState({ kind: 'line', id: obj.id, start: sp, mid: newMid, end: cEnd })
                }}
                onDragEnd={(p) => {
                  const sr = snap?.(p, obj.id)
                  const sp = sr?.point ?? p
                  clearSnap?.()
                  const newMid = recomputeMid(sp, cEnd, cStart, cMid, cEnd)
                  const ss = stageSizeRef.current
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? { ...o, start: normalizePoint(sp, ss), mid: normalizePoint(newMid, ss) }
                      : o,
                  )
                  setDraftState(null)
                  onDraftEnd?.()
                }}
              />
              <ControlHandle
                x={onCurveAtHalf(dStart, dMid, dEnd).x}
                y={onCurveAtHalf(dStart, dMid, dEnd).y}
                radius={handleRadius}
                zoom={zoom}
                onDragStart={() => onDraftStart?.(obj.id)}
                onDragMove={(p) => {
                  const ctrl = ctrlFromOnCurve(p, cStart, cEnd)
                  setDraftState({ kind: 'line', id: obj.id, start: cStart, mid: ctrl, end: cEnd })
                }}
                onDragEnd={(p) => {
                  const ctrl = ctrlFromOnCurve(p, cStart, cEnd)
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? { ...o, mid: normalizePoint(ctrl, stageSizeRef.current) }
                      : o,
                  )
                  setDraftState(null)
                  onDraftEnd?.()
                }}
                onDblClick={() => {
                  const straightMid = normalizePoint(
                    { x: (cStart.x + cEnd.x) / 2, y: (cStart.y + cEnd.y) / 2 },
                    stageSize,
                  )
                  onUpdateObject(obj.id, (o) => ({ ...o, mid: straightMid }))
                }}
              />
              <ControlHandle
                x={cEnd.x}
                y={cEnd.y}
                radius={handleRadius}
                zoom={zoom}
                onDragStart={() => onDraftStart?.(obj.id)}
                onDragMove={(p) => {
                  const sr = snap?.(p, obj.id)
                  const ep = sr?.point ?? p
                  const newMid = recomputeMid(cStart, ep, cStart, cMid, cEnd)
                  setDraftState({ kind: 'line', id: obj.id, start: cStart, mid: newMid, end: ep })
                }}
                onDragEnd={(p) => {
                  const sr = snap?.(p, obj.id)
                  const ep = sr?.point ?? p
                  clearSnap?.()
                  const newMid = recomputeMid(cStart, ep, cStart, cMid, cEnd)
                  const ss = stageSizeRef.current
                  onUpdateObject(obj.id, (o) =>
                    isLineObject(o)
                      ? { ...o, mid: normalizePoint(newMid, ss), end: normalizePoint(ep, ss) }
                      : o,
                  )
                  setDraftState(null)
                  onDraftEnd?.()
                }}
              />
            </Group>
          )
        }

        return null
      })}

      {/* Snap indicator — shown while drawing a vector line near an endpoint or guide point */}
      {snapIndicator && (
        <Circle
          x={snapIndicator.point.x}
          y={snapIndicator.point.y}
          radius={9 / zoom}
          stroke={snapIndicator.color}
          strokeWidth={2 / zoom}
          fill="transparent"
          listening={false}
        />
      )}
    </Layer>
  )
}
