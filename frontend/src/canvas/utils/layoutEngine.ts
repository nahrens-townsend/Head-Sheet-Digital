import type { TemplateType } from '../../types/headSheet';
import { WORLD_SIZE } from './canvasUtils';

export interface TemplateLayout {
  type: TemplateType;
  rect: { x: number; y: number; width: number; height: number };
  image: HTMLImageElement;
}

interface CellBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function fitImageInCell(
  img: HTMLImageElement,
  cell: CellBounds,
): { x: number; y: number; width: number; height: number } {
  const naturalWidth = img.naturalWidth || 400;
  const naturalHeight = img.naturalHeight || 500;
  const scale = Math.min(cell.width / naturalWidth, cell.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return {
    x: cell.x + (cell.width - width) / 2,
    y: cell.y + (cell.height - height) / 2,
    width,
    height,
  };
}

/**
 * Computes pixel rects for each template image within the world canvas.
 *
 * Grid rules:
 *   1 template  — centred, fills world canvas minus outerPad on all sides
 *   2 templates — side by side, equal widths, padding between
 *   3 templates — 2 top + 1 centred bottom
 *   4 templates — 2×2 grid, equal cells
 */
export function computeTemplateLayouts(
  types: TemplateType[],
  images: Map<TemplateType, HTMLImageElement>,
  padding = 150,
  outerPad = 150,
): TemplateLayout[] {
  const availW = WORLD_SIZE.width - 2 * outerPad;
  const availH = WORLD_SIZE.height - 2 * outerPad;

  const cells = ((): CellBounds[] => {
    switch (types.length) {
      case 0:
        return [];
      case 1:
        return [{ x: outerPad, y: outerPad, width: availW, height: availH }];
      case 2: {
        const cellW = (availW - padding) / 2;
        return [
          { x: outerPad, y: outerPad, width: cellW, height: availH },
          { x: outerPad + cellW + padding, y: outerPad, width: cellW, height: availH },
        ];
      }
      case 3: {
        const cellW = (availW - padding) / 2;
        const cellH = (availH - padding) / 2;
        // Bottom cell centred below the two top cells
        const bottomX = outerPad + (availW - cellW) / 2;
        return [
          { x: outerPad, y: outerPad, width: cellW, height: cellH },
          { x: outerPad + cellW + padding, y: outerPad, width: cellW, height: cellH },
          { x: bottomX, y: outerPad + cellH + padding, width: cellW, height: cellH },
        ];
      }
      default: {
        const cellW = (availW - padding) / 2;
        const cellH = (availH - padding) / 2;
        return [
          { x: outerPad, y: outerPad, width: cellW, height: cellH },
          { x: outerPad + cellW + padding, y: outerPad, width: cellW, height: cellH },
          { x: outerPad, y: outerPad + cellH + padding, width: cellW, height: cellH },
          {
            x: outerPad + cellW + padding,
            y: outerPad + cellH + padding,
            width: cellW,
            height: cellH,
          },
        ];
      }
    }
  })();

  const layouts: TemplateLayout[] = [];
  for (let i = 0; i < types.length; i++) {
    const type = types[i];
    const image = images.get(type);
    const cell = cells[i];
    if (!image || !cell) continue;
    layouts.push({ type, rect: fitImageInCell(image, cell), image });
  }
  return layouts;
}
