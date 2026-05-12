import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva';
import type { TemplateLayout } from '../utils/layoutEngine';
import type { StageSize } from '../utils/canvasUtils';

const GRID_SPACING = 30;
const GRID_STROKE = 'rgba(0,0,0,0.25)';
const GRID_STROKE_WIDTH = 0.5;

interface BackgroundLayerProps {
  stageSize: StageSize;
  /** Template SVG layouts (templates canvas mode). */
  layouts: TemplateLayout[];
  /** Uploaded image for image-mode canvases. */
  canvasImage?: HTMLImageElement | null;
  canvasImageRect?: { x: number; y: number; width: number; height: number } | null;
}

export function BackgroundLayer({ stageSize, layouts, canvasImage, canvasImageRect }: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#ffffff" />
      <Shape
        stroke={GRID_STROKE}
        strokeWidth={GRID_STROKE_WIDTH}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          for (let x = GRID_SPACING; x < stageSize.width; x += GRID_SPACING) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, stageSize.height);
          }
          for (let y = GRID_SPACING; y < stageSize.height; y += GRID_SPACING) {
            ctx.moveTo(0, y);
            ctx.lineTo(stageSize.width, y);
          }
          ctx.strokeShape(shape);
        }}
      />
      {canvasImage && canvasImageRect && (
        <KonvaImage
          image={canvasImage}
          x={canvasImageRect.x}
          y={canvasImageRect.y}
          width={canvasImageRect.width}
          height={canvasImageRect.height}
          opacity={0.9}
        />
      )}
      {layouts.map((layout) => (
        <KonvaImage
          key={layout.type}
          image={layout.image}
          x={layout.rect.x}
          y={layout.rect.y}
          width={layout.rect.width}
          height={layout.rect.height}
          opacity={0.9}
        />
      ))}
    </Layer>
  );
}
