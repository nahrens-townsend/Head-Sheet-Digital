import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useCanvasStore } from '../stores/canvasStore';
import type { TemplateType } from '../types/headSheet';
import type { Stroke } from '../types/stroke';
import { useEraserTool } from './tools/useEraserTool';
import { useLineTool } from './tools/useLineTool';
import { usePenTool } from './tools/usePenTool';
import { STROKE_SIZES, type StagePointerHandler, type StageSize } from './utils/canvasUtils';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { ObjectsLayer } from './layers/ObjectsLayer';
import { LiveLayer } from './layers/LiveLayer';

interface HeadSheetCanvasProps {
  strokes: Stroke[];
  templateType: TemplateType;
  onStrokeComplete: (stroke: Stroke) => void;
}

type TemplateRect = { x: number; y: number; width: number; height: number };

export function HeadSheetCanvas({ strokes, templateType, onStrokeComplete }: HeadSheetCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const liveLineRef = useRef<Konva.Line | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 1, height: 1 });
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const { tool, color, strokeSize } = useCanvasStore();

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

  const templateRect = useMemo<TemplateRect | null>(() => {
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

  const strokePixelWidth = STROKE_SIZES[strokeSize];

  const penTool = usePenTool({
    stageRef,
    liveLineRef,
    stageSize,
    color,
    strokeSize,
    onStrokeComplete,
  });

  const lineTool = useLineTool({
    stageRef,
    stageSize,
    color,
    strokeSize,
    onStrokeComplete,
  });

  const eraserTool = useEraserTool({
    stageRef,
    liveLineRef,
    stageSize,
    strokeSize,
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
        <BackgroundLayer
          stageSize={stageSize}
          templateImage={templateImage}
          templateRect={templateRect}
        />
        <ObjectsLayer strokes={strokes} stageSize={stageSize} />
        <LiveLayer
          liveLineRef={liveLineRef}
          tool={tool}
          color={color}
          strokePixelWidth={strokePixelWidth}
          previewPoints={lineTool.previewPoints}
        />
      </Stage>
    </div>
  );
}
