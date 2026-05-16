import { Layer, Text } from 'react-konva'
import type { CanvasObject, NoteObject, TextObject } from '../../types/canvasObject'
import { isTextObject, isNoteObject } from '../../types/canvasObject'
import { WORLD_SIZE } from '../utils/canvasUtils'

interface TextAnnotationsExportLayerProps {
  objects: CanvasObject[]
}

type TextLikeObject = TextObject | NoteObject

const FONT_SIZE = 14

export function TextAnnotationsExportLayer({ objects }: TextAnnotationsExportLayerProps) {
  const textObjects = objects.filter(
    (o): o is TextLikeObject => isTextObject(o) || isNoteObject(o),
  )

  if (textObjects.length === 0) return null

  return (
    <Layer listening={false}>
      {textObjects.map((obj) => {
        // Coordinates are already in world pixels — no multiplication needed.
        const fill = isNoteObject(obj) ? '#1a1a1a' : obj.color

        return (
          <Text
            key={obj.id}
            x={obj.x}
            y={obj.y}
            text={obj.text || ''}
            fontSize={FONT_SIZE}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={fill}
            lineHeight={1.5}
            wrap="word"
            width={Math.min(240, WORLD_SIZE.width - obj.x)}
          />
        )
      })}
    </Layer>
  )
}
