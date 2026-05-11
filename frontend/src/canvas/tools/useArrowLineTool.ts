import type React from 'react'
import Konva from 'konva'
import type { LineObject } from '../../types/canvasObject'
import { useVectorLineTool } from './useVectorLineTool'
import type { StageSize, StrokeSize } from '../utils/canvasUtils'
import type { SnapFn } from '../utils/snapping'

interface UseArrowLineToolOptions {
  stageRef: React.RefObject<Konva.Stage | null>
  stageSize: StageSize
  color: string
  strokeSize: StrokeSize
  onObjectComplete: (object: LineObject) => void
  snap?: SnapFn
  clearSnap?: () => void
}

export function useArrowLineTool(options: UseArrowLineToolOptions) {
  return useVectorLineTool({ ...options, type: 'arrow' })
}
