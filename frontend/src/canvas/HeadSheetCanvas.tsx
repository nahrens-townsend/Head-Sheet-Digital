import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useCanvasStore } from '../stores/canvasStore';
import type { TemplateType } from '../types/headSheet';
import type { CanvasObject } from '../types/canvasObject';
import { useEraserTool } from './tools/useEraserTool';
import { useLineTool } from './tools/useLineTool';
import { useArrowLineTool } from './tools/useArrowLineTool';
import { useDottedLineTool } from './tools/useDottedLineTool';
import { usePenTool } from './tools/usePenTool';
import { useSelectTool } from './tools/useSelectTool';
import { useSnapping } from './utils/snapping';
import { STROKE_SIZES, type StagePointerHandler, type StageSize } from './utils/canvasUtils';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { ObjectsLayer } from './layers/ObjectsLayer';
import { LiveLayer } from './layers/LiveLayer';
import { SelectionLayer } from './layers/SelectionLayer';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export interface HeadSheetCanvasHandle {
  getExportDataUrl: () => Promise<string>;
  getThumbnailDataUrl: () => Promise<string>;
}

interface HeadSheetCanvasProps {
  objects: CanvasObject[];
  templateType: TemplateType;
  onObjectComplete: (object: CanvasObject) => void;
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void;
  onDeleteObjects: (ids: string[]) => void;
}

type TemplateRect = { x: number; y: number; width: number; height: number };

export const HeadSheetCanvas = forwardRef<HeadSheetCanvasHandle, HeadSheetCanvasProps>(function HeadSheetCanvas({
  objects,
  templateType,
  onObjectComplete,
  onUpdateObject,
  onDeleteObjects,
}, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const liveLineRef = useRef<Konva.Line | null>(null);
  const [stageSize, setStageSize] = useState<StageSize>({ width: 1, height: 1 });
  const [templateImage, setTemplateImage] = useState<HTMLImageElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const exportQueueRef = useRef(Promise.resolve() as Promise<void>)
  const { tool, color, strokeSize, selectedObjectIds, zoom, panOffset, setZoom, setPanOffset } =
    useCanvasStore();

  // Mutable refs so native event handlers always see the latest values without
  // needing to be re-registered on every render.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panOffsetRef = useRef(panOffset);
  panOffsetRef.current = panOffset;
  const toolRef = useRef(tool);
  toolRef.current = tool;

  // Set to true while a two-finger pinch is active so Stage drawing is suppressed.
  const isPinchingRef = useRef(false);

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

  // Zoom / pan via native events on the container div.
  // Pointer capture phase ensures isPinchingRef is set before Konva's handlers check it.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const activePointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;
    let lastPinchCenter = { x: 0, y: 0 };
    let pinchClearTimeout: ReturnType<typeof setTimeout> | null = null;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panOffsetAtStart = { x: 0, y: 0 };

    const applyZoom = (rawZoom: number, pivotCanvas: { x: number; y: number }) => {
      const clamped = Math.min(Math.max(rawZoom, MIN_ZOOM), MAX_ZOOM);
      const oldZoom = zoomRef.current;
      const contentAnchor = {
        x: (pivotCanvas.x - panOffsetRef.current.x) / oldZoom,
        y: (pivotCanvas.y - panOffsetRef.current.y) / oldZoom,
      };
      setZoom(clamped);
      setPanOffset({
        x: pivotCanvas.x - contentAnchor.x * clamped,
        y: pivotCanvas.y - contentAnchor.y * clamped,
      });
      return clamped;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const pivot = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      // Trackpad pinch sends wheel+ctrlKey with small deltas; use finer scale factor.
      const scaleBy = e.ctrlKey ? 1.05 : 1.15;
      const newZoom = e.deltaY < 0 ? zoomRef.current * scaleBy : zoomRef.current / scaleBy;
      applyZoom(newZoom, pivot);
    };

    const onPointerDown = (e: PointerEvent) => {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const isHandToolPan = e.button === 0 && e.pointerType === 'mouse' && toolRef.current === 'hand';
      if ((e.button === 1 && e.pointerType === 'mouse') || isHandToolPan) {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        panOffsetAtStart = { ...panOffsetRef.current };
        el.style.cursor = 'grabbing';
        el.setPointerCapture(e.pointerId);
        e.stopPropagation();
        e.preventDefault();
        return;
      }

      if (activePointers.size === 2) {
        if (pinchClearTimeout !== null) {
          clearTimeout(pinchClearTimeout);
          pinchClearTimeout = null;
        }
        isPinchingRef.current = true;
        const pts = [...activePointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        // Guard against near-zero initial distance to prevent zoom explosion on first move.
        lastPinchDist = dist < 1 ? 1 : dist;
        lastPinchCenter = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        e.stopPropagation();
        return;
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (isPanning) {
        setPanOffset({
          x: panOffsetAtStart.x + (e.clientX - panStart.x),
          y: panOffsetAtStart.y + (e.clientY - panStart.y),
        });
        e.stopPropagation();
        return;
      }

      if (isPinchingRef.current && activePointers.size === 2) {
        const pts = [...activePointers.values()];
        const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
        // Skip update if distance is negligible to avoid jitter.
        if (dist < 1) return;
        const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
        const rect = el.getBoundingClientRect();
        const pivotCanvas = { x: center.x - rect.left, y: center.y - rect.top };

        const newZoom = zoomRef.current * (dist / lastPinchDist);
        const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
        const contentAnchor = {
          x: (pivotCanvas.x - panOffsetRef.current.x) / zoomRef.current,
          y: (pivotCanvas.y - panOffsetRef.current.y) / zoomRef.current,
        };
        setZoom(clamped);
        setPanOffset({
          x: pivotCanvas.x - contentAnchor.x * clamped + (center.x - lastPinchCenter.x),
          y: pivotCanvas.y - contentAnchor.y * clamped + (center.y - lastPinchCenter.y),
        });

        lastPinchDist = dist;
        lastPinchCenter = center;
        e.stopPropagation();
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      activePointers.delete(e.pointerId);

      if (isPanning) {
        isPanning = false;
        el.style.cursor = toolRef.current === 'hand' ? 'grab' : '';
        e.stopPropagation();
        return;
      }

      if (isPinchingRef.current) {
        if (activePointers.size < 2) {
          // Brief grace period prevents a stray draw on finger lift.
          // Store the timeout id so a rapid new pinch can cancel it.
          pinchClearTimeout = setTimeout(() => {
            if (activePointers.size < 2) isPinchingRef.current = false;
            pinchClearTimeout = null;
          }, 60);
        }
        e.stopPropagation();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown, { capture: true });
    el.addEventListener('pointermove', onPointerMove, { capture: true });
    el.addEventListener('pointerup', onPointerUp, { capture: true });
    el.addEventListener('pointercancel', onPointerUp, { capture: true });

    return () => {
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown, { capture: true });
      el.removeEventListener('pointermove', onPointerMove, { capture: true });
      el.removeEventListener('pointerup', onPointerUp, { capture: true });
      el.removeEventListener('pointercancel', onPointerUp, { capture: true });
    };
  }, [setZoom, setPanOffset]); // stable Zustand setters; zoom/pan reads use refs

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

  const { snap, clearSnap, snapIndicator } = useSnapping(objects, stageSize, zoom);

  const exportStage = useCallback(
    (maxDimension?: number) => {
      const task = async () => {
        const stage = stageRef.current;
        if (!stage) {
          throw new Error('Canvas stage is not ready.')
        }

        setIsExporting(true);
        await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

        const previousScale = { x: stage.scaleX(), y: stage.scaleY() };
        const previousPosition = { x: stage.x(), y: stage.y() };

        try {
          stage.scale({ x: 1, y: 1 });
          stage.position({ x: 0, y: 0 });
          stage.batchDraw();

          const pixelRatio = maxDimension
            ? Math.min(1, maxDimension / Math.max(stageSize.width, stageSize.height))
            : 1;

          return stage.toDataURL({ pixelRatio });
        } finally {
          stage.scale(previousScale);
          stage.position(previousPosition);
          stage.batchDraw();
          setIsExporting(false);
        }
      };

      const next = exportQueueRef.current.then(task, task);
      exportQueueRef.current = next.then(() => undefined, () => undefined);
      return next;
    },
    [stageSize.width, stageSize.height],
  );

  useImperativeHandle(ref, () => ({
    getExportDataUrl: () => exportStage(),
    getThumbnailDataUrl: () => exportStage(320),
  }), [exportStage]);

  const commonVectorOpts = { stageRef, stageSize, color, strokeSize, onObjectComplete, snap, clearSnap };

  const penTool = usePenTool({
    stageRef,
    liveLineRef,
    stageSize,
    color,
    strokeSize,
    onObjectComplete,
  });

  const lineTool = useLineTool(commonVectorOpts);
  const arrowTool = useArrowLineTool(commonVectorOpts);
  const dottedTool = useDottedLineTool(commonVectorOpts);

  const eraserTool = useEraserTool({
    stageRef,
    stageSize,
    objects,
    onDeleteObjects,
  });

  const selectTool = useSelectTool({
    stageRef,
    stageSize,
    objects,
  });

  const rawHandlers = useMemo(() => {
    switch (tool) {
      case 'select':
        return selectTool;
      case 'line':
        return lineTool;
      case 'arrow':
        return arrowTool;
      case 'dotted':
        return dottedTool;
      case 'eraser':
        return eraserTool;
      case 'hand':
        return selectTool; // hand uses native pan; Stage handlers receive no meaningful events
      case 'pen':
      default:
        return penTool;
    }
  }, [arrowTool, dottedTool, eraserTool, lineTool, penTool, selectTool, tool]);

  const activePreviewPoints =
    tool === 'line' ? lineTool.previewPoints :
    tool === 'arrow' ? arrowTool.previewPoints :
    tool === 'dotted' ? dottedTool.previewPoints :
    null;

  return (
    <div ref={containerRef} className={`head-sheet-canvas head-sheet-canvas--tool-${tool}`}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onPointerDown={(e) => { if (!isPinchingRef.current) (rawHandlers.onPointerDown as StagePointerHandler)(e); }}
        onPointerMove={(e) => { if (!isPinchingRef.current) (rawHandlers.onPointerMove as StagePointerHandler)(e); }}
        onPointerUp={(e) => { if (!isPinchingRef.current) (rawHandlers.onPointerUp as StagePointerHandler)(e); }}
        onPointerLeave={(e) => { if (!isPinchingRef.current) (rawHandlers.onPointerUp as StagePointerHandler)(e); }}
      >
        <BackgroundLayer
          stageSize={stageSize}
          templateImage={templateImage}
          templateRect={templateRect}
        />
        <ObjectsLayer objects={objects} stageSize={stageSize} zoom={zoom} panOffset={panOffset} />
        <LiveLayer
          liveLineRef={liveLineRef}
          tool={tool}
          color={color}
          strokePixelWidth={strokePixelWidth}
          previewPoints={activePreviewPoints}
          isExporting={isExporting}
        />
        <SelectionLayer
          objects={objects}
          selectedObjectIds={tool === 'select' ? selectedObjectIds : []}
          stageSize={stageSize}
          zoom={zoom}
          onUpdateObject={onUpdateObject}
          snapIndicator={snapIndicator}
          snap={snap}
          clearSnap={clearSnap}
          isExporting={isExporting}
        />
      </Stage>
    </div>
  );
});
