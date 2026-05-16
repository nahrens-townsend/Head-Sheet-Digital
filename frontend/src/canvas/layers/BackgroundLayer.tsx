import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva';
import type { TemplateLayout } from '../utils/layoutEngine';
import { WORLD_SIZE } from '../utils/canvasUtils';

const GRID_SPACING = 30;
/** World-pixel extent of the infinite canvas area in each direction beyond the page. */
const OUTER_EXTENT = WORLD_SIZE.width * 2; // 2400 world px — covers max pan range

/** Grid colours */
const PAGE_GRID_STROKE = 'rgba(0,0,0,0.15)';
const OUTER_GRID_STROKE = 'rgba(0,0,0,0.08)';
const OUTER_FILL = '#ebebeb';

const GRID_STROKE_WIDTH = 0.5;

interface BackgroundLayerProps {
  /** Template SVG layouts (templates canvas mode). */
  layouts: TemplateLayout[];
}

export function BackgroundLayer({ layouts }: BackgroundLayerProps) {
  const outerX = -OUTER_EXTENT;
  const outerY = -OUTER_EXTENT;
  const outerW = WORLD_SIZE.width  + 2 * OUTER_EXTENT;
  const outerH = WORLD_SIZE.height + 2 * OUTER_EXTENT;

  return (
    <Layer listening={false}>
      {/* Infinite background */}
      <Rect x={outerX} y={outerY} width={outerW} height={outerH} fill={OUTER_FILL} />

      {/* Outer grid — covers the entire infinite area */}
      <Shape
        stroke={OUTER_GRID_STROKE}
        strokeWidth={GRID_STROKE_WIDTH}
        strokeScaleEnabled={false}
        perfectDrawEnabled={false}
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          // Snap start to grid multiple so lines line up with page grid
          const startX = Math.ceil(outerX / GRID_SPACING) * GRID_SPACING;
          const startY = Math.ceil(outerY / GRID_SPACING) * GRID_SPACING;
          const endX = outerX + outerW;
          const endY = outerY + outerH;
          for (let x = startX; x < endX; x += GRID_SPACING) {
            ctx.moveTo(x, outerY);
            ctx.lineTo(x, outerY + outerH);
          }
          for (let y = startY; y < endY; y += GRID_SPACING) {
            ctx.moveTo(outerX, y);
            ctx.lineTo(outerX + outerW, y);
          }
          ctx.strokeShape(shape);
        }}
      />

      {/* Page shadow — subtle depth cue separating page from infinite area */}
      <Rect
        x={4} y={4}
        width={WORLD_SIZE.width} height={WORLD_SIZE.height}
        fill="rgba(0,0,0,0.12)"
      />

      {/* White page */}
      <Rect x={0} y={0} width={WORLD_SIZE.width} height={WORLD_SIZE.height} fill="#ffffff" />

      {/* Page grid — slightly more visible than outer grid */}
      <Shape
        stroke={PAGE_GRID_STROKE}
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
