import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva';
import type { TemplateLayout } from '../utils/layoutEngine';
import { WORLD_SIZE } from '../utils/canvasUtils';

const GRID_SPACING = 30;
const GRID_STROKE = 'rgba(0,0,0,0.25)';
const GRID_STROKE_WIDTH = 0.5;

interface BackgroundLayerProps {
  /** Template SVG layouts (templates canvas mode). */
  layouts: TemplateLayout[];
}

export function BackgroundLayer({ layouts }: BackgroundLayerProps) {
  return (
    <Layer listening={false}>
      <Rect x={0} y={0} width={WORLD_SIZE.width} height={WORLD_SIZE.height} fill="#ffffff" />
      <Shape
        stroke={GRID_STROKE}
        strokeWidth={GRID_STROKE_WIDTH}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          for (let x = GRID_SPACING; x < WORLD_SIZE.width; x += GRID_SPACING) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, WORLD_SIZE.height);
          }
          for (let y = GRID_SPACING; y < WORLD_SIZE.height; y += GRID_SPACING) {
            ctx.moveTo(0, y);
            ctx.lineTo(WORLD_SIZE.width, y);
          }
          ctx.strokeShape(shape);
        }}
      />
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
