import { Layer, Text } from 'react-konva'
import type { CanvasObject, NoteObject, TextObject } from '../../types/canvasObject'
import { isTextObject, isNoteObject } from '../../types/canvasObject'
import type { StageSize } from '../utils/canvasUtils'

interface TextAnnotationsExportLayerProps {
  objects: CanvasObject[]
  stageSize: StageSize
}

type TextLikeObject = TextObject | NoteObject

const FONT_SIZE = 14

export function TextAnnotationsExportLayer({ objects, stageSize }: TextAnnotationsExportLayerProps) {
  const textObjects = objects.filter(
    (o): o is TextLikeObject => isTextObject(o) || isNoteObject(o),
  )

  if (textObjects.length === 0) return null

  return (
    <Layer listening={false}>
      {textObjects.map((obj) => {
        const x = obj.x * stageSize.width
        const y = obj.y * stageSize.height
        // Legacy NoteObjects always used dark text; TextObjects use obj.color.
        const fill = isNoteObject(obj) ? '#1a1a1a' : obj.color

        return (
          <Text
            key={obj.id}
            x={x}
            y={y}
            text={obj.text || ''}
            fontSize={FONT_SIZE}
            fontFamily="system-ui, -apple-system, sans-serif"
            fill={fill}
            lineHeight={1.5}
            wrap="word"
            width={Math.min(240, stageSize.width - x)}
          />
        )
      })}
    </Layer>
  )
}
