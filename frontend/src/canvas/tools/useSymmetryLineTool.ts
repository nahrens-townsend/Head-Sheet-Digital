import { useCallback } from 'react'
import type React from 'react'
import Konva from 'konva'
import type { LineObject } from '../../types/canvasObject'
import { createStrokeId, type StageSize, type StrokeSize } from '../utils/canvasUtils'
import type { SnapFn } from '../utils/snapping'
import type { TemplateLayout } from '../utils/layoutEngine'
import { mirrorLineAcrossAxis, findAxisXForPoint } from '../utils/symmetry'
import { useVectorLineTool } from './useVectorLineTool'

export interface UseSymmetryLineToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  layouts: TemplateLayout[]
  onObjectsComplete: (objects: LineObject[]) => void
  snap?: SnapFn
  clearSnap?: () => void
}

/**
 * Wraps useVectorLineTool to produce a symmetrical pair of lines.
 * On completion the original and its mirror are emitted together so they can
 * be batched into a single undo entry.
 */
export function useSymmetryLineTool({
  stageRef,
  stageSize,
  color,
  strokeSize,
  layouts,
  onObjectsComplete,
  snap,
  clearSnap,
}: UseSymmetryLineToolOptions) {
  const handleLineComplete = useCallback(
    (line: LineObject) => {
      // Determine the vertical axis from which template the line starts in.
      const startPx = {
        x: line.start.x * stageSize.width,
        y: line.start.y * stageSize.height,
      }
      const axisX = findAxisXForPoint(startPx, layouts, stageSize)

      const mirrorId = createStrokeId()

      const original: LineObject = {
        ...line,
        mirrorId,
      }

      const mirrored: LineObject = {
        ...mirrorLineAcrossAxis(line, axisX),
        id: mirrorId,
        mirrorId: line.id,
        createdAt: new Date().toISOString(),
      }

      onObjectsComplete([original, mirrored])
    },
    [stageSize, layouts, onObjectsComplete],
  )

  return useVectorLineTool({
    type: 'line',
    stageRef,
    stageSize,
    color,
    strokeSize,
    onObjectComplete: handleLineComplete,
    snap,
    clearSnap,
  })
}
