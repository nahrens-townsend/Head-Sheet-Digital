import { create } from 'zustand'
import type { ToolType, DrawingTool } from '../types/stroke'
import { PALETTE, type Point, type StrokeSize } from '../canvas/utils/canvasUtils'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface CanvasState {
  tool: ToolType
  activeDrawingTool: DrawingTool
  color: string
  strokeSize: StrokeSize
  saveStatus: SaveStatus
  selectedObjectIds: string[]
  zoom: number
  panOffset: Point
  showGuides: boolean
  symmetryEnabled: boolean
  setTool: (tool: ToolType) => void
  setActiveDrawingTool: (tool: DrawingTool) => void
  setColor: (color: string) => void
  setStrokeSize: (strokeSize: StrokeSize) => void
  setSaveStatus: (status: SaveStatus) => void
  setSelectedObjectIds: (ids: string[]) => void
  setZoom: (zoom: number) => void
  setPanOffset: (offset: Point) => void
  setShowGuides: (show: boolean) => void
  setSymmetryEnabled: (enabled: boolean) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: 'pencil',
  activeDrawingTool: 'line',
  color: '#1a1a1a',
  strokeSize: 'md',
  saveStatus: 'idle',
  selectedObjectIds: [],
  zoom: 1.0,
  panOffset: { x: 0, y: 0 },
  showGuides: true,
  symmetryEnabled: false,
  setTool: (tool) => set({ tool }),
  setActiveDrawingTool: (activeDrawingTool) => set({ activeDrawingTool }),
  setColor: (color) => set({ color: PALETTE.includes(color) ? color : PALETTE[0] }),
  setStrokeSize: (strokeSize) => set({ strokeSize }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setSelectedObjectIds: (selectedObjectIds) => set({ selectedObjectIds }),
  setZoom: (zoom) => set({ zoom }),
  setPanOffset: (panOffset) => set({ panOffset }),
  setShowGuides: (showGuides) => set({ showGuides }),
  setSymmetryEnabled: (symmetryEnabled) => set({ symmetryEnabled }),
}))
