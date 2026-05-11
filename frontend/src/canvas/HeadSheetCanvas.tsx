import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Image as KonvaImage, Layer, Line, Rect, Stage } from 'react-konva';
import { useCanvasStore } from '../stores/canvasStore';
import type { TemplateType } from '../types/headSheet';
import type { Stroke } from '../types/stroke';
import { useEraserTool } from './tools/useEraserTool';
import { useLineTool } from './tools/useLineTool';
import { usePenTool } from './tools/usePenTool';

interface HeadSheetCanvasProps {
  strokes: Stroke[];
  templateType: TemplateType;
  onStrokeComplete: (stroke: Stroke) => void;
}

interface StageSize {
  width: number;
  height: number;
}

type StagePointerHandler = (
  event: Konva.KonvaEventObject<PointerEvent | MouseEvent | TouchEvent>,
) => void;

function denormalizePoints(points: number[], stageSize: StageSize) {
  return points.map((value, index) =>
    index % 2 === 0 ? value * stageSize.width : value * stageSize.height,
  );
}

export function HeadSheetCanvas({ strokes, templateType, onStrokeComplete }: HeadSheetCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const liveLineRef = useRef<Konva.Line | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 1, height: 1 });
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const { tool, color, brushSize } = useCanvasStore();

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setStageSize({
        width: Math.max(1, Math.floor(rect.width)),
        height: Math.max(1, Math.floor(rect.height)),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });

    observer.observe(container);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const image = new window.Image();

    image.onload = () => {
      if (mounted) {
        setTemplateImage(image);
      }
    };

    image.onerror = () => {
      if (mounted) {
        setTemplateImage(null);
      }
    };

    image.src = `/templates/head-${templateType}.svg`;

    return () => {
      mounted = false;
    };
  }, [templateType]);

  const templateRect = useMemo(() => {
    if (!templateImage) {
      return null;
    }

    const sourceWidth = templateImage.naturalWidth || 400;
    const sourceHeight = templateImage.naturalHeight || 500;
    const scale = Math.min(stageSize.width / sourceWidth, stageSize.height / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;

    return {
      width,
      height,
      x: (stageSize.width - width) / 2,
      y: (stageSize.height - height) / 2,
    };
  }, [stageSize.height, stageSize.width, templateImage]);

  const penTool = usePenTool({
    stageRef,
    liveLineRef,
    stageSize,
    color,
    brushSize,
    onStrokeComplete,
  });

  const lineTool = useLineTool({
    stageRef,
    stageSize,
    color,
    brushSize,
    onStrokeComplete,
  });

  const eraserTool = useEraserTool({
    stageRef,
    liveLineRef,
    stageSize,
    brushSize,
    onStrokeComplete,
  });

  const pointerHandlers = useMemo(() => {
    switch (tool) {
      case 'line':
        return lineTool;
      case 'eraser':
        return eraserTool;
      case 'pen':
      default:
        return penTool;
    }
  }, [eraserTool, lineTool, penTool, tool]);

  const liveStrokeColor = tool === 'eraser' ? '#ffffff' : color;
  const liveStrokeWidth = tool === 'eraser' ? brushSize * 2 : brushSize;

  return (
    <div ref={containerRef} className="head-sheet-canvas">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onPointerDown={pointerHandlers.onPointerDown as StagePointerHandler}
        onPointerMove={pointerHandlers.onPointerMove as StagePointerHandler}
        onPointerUp={pointerHandlers.onPointerUp as StagePointerHandler}
        onPointerLeave={pointerHandlers.onPointerUp as StagePointerHandler}
      >
        <Layer listening={false}>
          <Rect x={0} y={0} width={stageSize.width} height={stageSize.height} fill="#ffffff" />
          {templateRect && templateImage && (
            <KonvaImage
              image={templateImage}
              x={templateRect.x}
              y={templateRect.y}
              width={templateRect.width}
              height={templateRect.height}
              opacity={0.9}
            />
          )}
        </Layer>

        <Layer listening={false}>
          {strokes.map((stroke) => (
            <Line
              key={stroke.id}
              points={denormalizePoints(stroke.points, stageSize)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              opacity={stroke.opacity}
              tension={stroke.tension ?? 0}
              lineCap={stroke.lineCap ?? 'round'}
              lineJoin={stroke.lineJoin ?? 'round'}
              strokeScaleEnabled={false}
              globalCompositeOperation={
                stroke.tool === 'eraser' ? 'destination-out' : 'source-over'
              }
            />
          ))}
        </Layer>

        <Layer listening={false}>
          <Line
            ref={liveLineRef}
            points={[]}
            stroke={liveStrokeColor}
            strokeWidth={liveStrokeWidth}
            opacity={1}
            tension={tool === 'line' ? 0 : 0.35}
            lineCap="round"
            lineJoin="round"
            strokeScaleEnabled={false}
            visible={tool !== 'line'}
          />
          {lineTool.previewPoints && tool === 'line' && (
            <Line
              points={lineTool.previewPoints}
              stroke={color}
              strokeWidth={brushSize}
              opacity={1}
              tension={0}
              lineCap="round"
              lineJoin="round"
              strokeScaleEnabled={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}
