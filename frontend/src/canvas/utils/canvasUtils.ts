import type React from 'react'
import Konva from 'konva'

export interface StageSize {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

export type StagePointerEvent = Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>

export type StagePointerHandler = (event: StagePointerEvent) => void

export type StrokeSize = 'sm' | 'md' | 'lg' | 'xl'

export const STROKE_SIZES: Record<StrokeSize, number> = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
}

export const PALETTE: readonly string[] = [
  '#1a1a1a', '#ffffff', '#9e9e9e', '#e53935',
  '#d81b60', '#8e24aa', '#3949ab', '#1e88e5',
  '#00acc1', '#43a047', '#f9a825', '#ef6c00',
  '#6d4c41', '#546e7a', '#00897b', '#fdd835',
]

export function getStagePoint(
  stageRef: React.RefObject<Konva.Stage | null>,
  stageSize: StageSize,
): Point | null {
  const stage = stageRef.current
  // getRelativePointerPosition accounts for stage scaleX/scaleY and x/y (zoom + pan),
  // returning the pointer position in canvas content-space rather than screen-space.
  const point = stage?.getRelativePointerPosition()

  if (!stage || !point || stageSize.width <= 0 || stageSize.height <= 0) {
    return null
  }

  return {
    x: Math.min(Math.max(point.x, 0), stageSize.width),
    y: Math.min(Math.max(point.y, 0), stageSize.height),
  }
}

export function normalizePoints(points: number[], stageSize: StageSize): number[] {
  return points.map((value, index) =>
    index % 2 === 0 ? value / stageSize.width : value / stageSize.height,
  )
}

export function denormalizePoints(points: number[], stageSize: StageSize): number[] {
  return points.map((value, index) =>
    index % 2 === 0 ? value * stageSize.width : value * stageSize.height,
  )
}

export function normalizePoint(p: Point, stageSize: StageSize): Point {
  return { x: p.x / stageSize.width, y: p.y / stageSize.height }
}

export function denormalizePoint(p: Point, stageSize: StageSize): Point {
  return { x: p.x * stageSize.width, y: p.y * stageSize.height }
}

export function createStrokeId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}
