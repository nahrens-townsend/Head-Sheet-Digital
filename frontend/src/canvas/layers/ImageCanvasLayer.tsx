import { useEffect, useMemo, useState } from 'react';
import { Image as KonvaImage, Layer, Rect, Shape } from 'react-konva';
import type { StageSize } from '../utils/canvasUtils';

const GRID_SPACING = 30;
const GRID_STROKE = 'rgba(0,0,0,0.25)';
const GRID_STROKE_WIDTH = 0.5;
const OUTER_PAD = 60;

interface ImageCanvasLayerProps {
  dataUrl: string;
  stageSize: StageSize;
}

export function ImageCanvasLayer({ dataUrl, stageSize }: ImageCanvasLayerProps) {
  const [loaded, setLoaded] = useState<{ url: string; image: HTMLImageElement } | null>(null);

  useEffect(() => {
    if (!dataUrl) return;
    let mounted = true;
    const currentUrl = dataUrl;
    const img = new window.Image();
    img.onload = () => { if (mounted) setLoaded({ url: currentUrl, image: img }); };
    img.onerror = () => { if (mounted) setLoaded((prev) => (prev?.url === currentUrl ? null : prev)); };
    img.src = dataUrl;
    return () => { mounted = false; };
  }, [dataUrl]);

  const effectiveImage = loaded?.url === dataUrl ? loaded.image : null;

  const imageRect = useMemo(() => {
    if (!effectiveImage) return null;
    const naturalWidth = effectiveImage.naturalWidth || 800;
    const naturalHeight = effectiveImage.naturalHeight || 600;
    const availW = stageSize.width - 2 * OUTER_PAD;
    const availH = stageSize.height - 2 * OUTER_PAD;
    const scale = Math.min(availW / naturalWidth, availH / naturalHeight);
    const width = naturalWidth * scale;
    const height = naturalHeight * scale;
    return {
      x: OUTER_PAD + (availW - width) / 2,
      y: OUTER_PAD + (availH - height) / 2,
      width,
      height,
    };
  }, [effectiveImage, stageSize.width, stageSize.height]);

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
      {effectiveImage && imageRect && (
        <KonvaImage
          image={effectiveImage}
          x={imageRect.x}
          y={imageRect.y}
          width={imageRect.width}
          height={imageRect.height}
          opacity={1}
        />
      )}
    </Layer>
  );
}
