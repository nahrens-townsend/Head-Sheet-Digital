import type React from 'react';
import Konva from 'konva';

/** Fixed world canvas dimensions (pixels). All object coordinates are stored in this space. */
export const WORLD_SIZE = { width: 1200, height: 900 } as const;

export interface StageSize {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export type StagePointerEvent = Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>;

export type StagePointerHandler = (event: StagePointerEvent) => void;

export type StrokeSize = 'sm' | 'md' | 'lg' | 'xl';

export const STROKE_SIZES: Record<StrokeSize, number> = {
  sm: 2,
  md: 4,
  lg: 8,
  xl: 16,
};

export const PALETTE: readonly string[] = [
  '#1a1a1a',
  '#ffffff',
  '#9e9e9e',
  '#e53935',
  '#d81b60',
  '#8e24aa',
  '#3949ab',
  '#1e88e5',
  '#00acc1',
  '#43a047',
  '#f9a825',
  '#ef6c00',
  '#6d4c41',
  '#546e7a',
  '#00897b',
  '#fdd835',
];

/**
 * Returns the pointer position in world-space pixels, or null if the stage is
 * not mounted or getRelativePointerPosition returns nothing.
 * Coordinates may be outside [0..WORLD_SIZE] when the user is working in the
 * infinite canvas area beyond the page boundary — callers should not reject them.
 */
export function getStagePoint(stageRef: React.RefObject<Konva.Stage | null>): Point | null {
  const stage = stageRef.current;
  const point = stage?.getRelativePointerPosition();
  if (!stage || !point) return null;
  return { x: point.x, y: point.y };
}

/**
 * Convert world-space coordinates to DOM screen pixels.
 * Used by DOM overlays (TextAnnotationsOverlay) to position elements.
 */
export function worldToScreen(
  world: Point,
  fitScale: number,
  fitOffset: Point,
  zoom: number,
  panOffset: Point,
): Point {
  return {
    x: world.x * fitScale * zoom + fitOffset.x + panOffset.x,
    y: world.y * fitScale * zoom + fitOffset.y + panOffset.y,
  };
}

/**
 * Convert DOM screen pixels to world-space coordinates.
 * Used when converting pointer drag deltas to world deltas.
 */
export function screenToWorld(
  screen: Point,
  fitScale: number,
  fitOffset: Point,
  zoom: number,
  panOffset: Point,
): Point {
  return {
    x: (screen.x - fitOffset.x - panOffset.x) / (fitScale * zoom),
    y: (screen.y - fitOffset.y - panOffset.y) / (fitScale * zoom),
  };
}

export function createStrokeId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
