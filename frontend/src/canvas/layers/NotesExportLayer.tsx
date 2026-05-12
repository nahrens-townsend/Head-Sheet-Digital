import { Group, Layer, Rect, Text } from 'react-konva'
import type { NoteObject } from '../../types/canvasObject'
import type { StageSize } from '../utils/canvasUtils'

interface NotesExportLayerProps {
  notes: NoteObject[]
  stageSize: StageSize
}

const NOTE_BG: Record<NoteObject['noteColor'], string> = {
  yellow: '#fef9c3',
  pink:   '#fce7f3',
  green:  '#dcfce7',
  blue:   '#dbeafe',
}

const NOTE_HEADER: Record<NoteObject['noteColor'], string> = {
  yellow: '#fde047',
  pink:   '#f9a8d4',
  green:  '#86efac',
  blue:   '#93c5fd',
}

const NOTE_BORDER: Record<NoteObject['noteColor'], string> = {
  yellow: '#facc15',
  pink:   '#f472b6',
  green:  '#4ade80',
  blue:   '#60a5fa',
}

/** Width of a note card in canvas pixels (matches NotesOverlay's NOTE_WIDTH_PX). */
const NOTE_W = 200
/** Height of the coloured header strip. */
const HEADER_H = 24
/** Padding inside the body area. */
const BODY_PADDING = 8
/** Font size for note text (matches DOM overlay). */
const FONT_SIZE = 13

export function NotesExportLayer({ notes, stageSize }: NotesExportLayerProps) {
  if (notes.length === 0) return null

  return (
    <Layer listening={false}>
      {notes.map((note) => {
        const x = note.x * stageSize.width
        const y = note.y * stageSize.height
        const textAreaW = NOTE_W - BODY_PADDING * 2
        // Estimate body height to size the background rect.
        const bodyH = Math.max(60, note.text.length * 0.8 + 40)
        const totalH = HEADER_H + bodyH

        return (
          <Group key={note.id} x={x} y={y}>
            {/* Card background */}
            <Rect
              width={NOTE_W}
              height={totalH}
              fill={NOTE_BG[note.noteColor]}
              stroke={NOTE_BORDER[note.noteColor]}
              strokeWidth={1}
              cornerRadius={6}
            />
            {/* Header strip */}
            <Rect
              width={NOTE_W}
              height={HEADER_H}
              fill={NOTE_HEADER[note.noteColor]}
              cornerRadius={[6, 6, 0, 0]}
            />
            {/* Note text */}
            <Text
              x={BODY_PADDING}
              y={HEADER_H + BODY_PADDING}
              text={note.text}
              width={textAreaW}
              fontSize={FONT_SIZE}
              lineHeight={1.5}
              fill="#1a1a1a"
              wrap="word"
            />
          </Group>
        )
      })}
    </Layer>
  )
}
