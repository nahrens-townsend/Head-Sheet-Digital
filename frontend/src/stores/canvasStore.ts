import { create } from 'zustand'
import type { ToolType } from '../types/stroke'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface CanvasState {
  tool: ToolType
  color: string
  brushSize: number
  saveStatus: SaveStatus
  setTool: (tool: ToolType) => void
  setColor: (color: string) => void
  setBrushSize: (brushSize: number) => void
  setSaveStatus: (status: SaveStatus) => void
}

export const useCanvasStore = create<CanvasState>((set) => ({
  tool: 'pen',
  color: '#1a1a1a',
  brushSize: 4,
  saveStatus: 'idle',
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}))
