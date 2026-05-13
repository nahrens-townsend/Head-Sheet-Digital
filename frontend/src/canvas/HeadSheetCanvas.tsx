import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Konva from 'konva';
import { Stage } from 'react-konva';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasMode, TemplateType } from '../types/headSheet';
import type { CanvasObject } from '../types/canvasObject';
import { isNoteObject } from '../types/canvasObject';
import { useEraserTool } from './tools/useEraserTool';
import { useLineTool } from './tools/useLineTool';
import { useArrowLineTool } from './tools/useArrowLineTool';
import { useDottedLineTool } from './tools/useDottedLineTool';
import { useNoteTool } from './tools/useNoteTool';
import { useSymmetryLineTool } from './tools/useSymmetryLineTool';
import { usePenTool } from './tools/usePenTool';
import { useSelectTool } from './tools/useSelectTool';
import { useSnapping } from './utils/snapping';
import { resolveGuidePoints } from './utils/guidePoints';
import { STROKE_SIZES, type StagePointerHandler, type StageSize } from './utils/canvasUtils';
import { BackgroundLayer } from './layers/BackgroundLayer';
import { ImageCanvasLayer } from './layers/ImageCanvasLayer';
import { GuideLayer } from './layers/GuideLayer';
import { NotesExportLayer } from './layers/NotesExportLayer';
import { NotesOverlay } from './layers/NotesOverlay';
import { ObjectsLayer } from './layers/ObjectsLayer';
import { LiveLayer } from './layers/LiveLayer';
import { SelectionLayer } from './layers/SelectionLayer';
import { computeTemplateLayouts } from './utils/layoutEngine';

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

/** Loads one SVG per TemplateType and returns a Map keyed by type. */
function useTemplateImages(types: TemplateType[]): Map<TemplateType, HTMLImageElement> {
  const [images, setImages] = useState<Map<TemplateType, HTMLImageElement>>(new Map());
  // Use a joined string as the effect key so the effect is stable when the
  // array values haven't changed (even if the array reference has).
  const typesKey = types.join(',');

  useEffect(() => {
    let cancelled = false;
    const newMap = new Map<TemplateType, HTMLImageElement>();

    if (types.length === 0) {
      return;
    }

    let remaining = types.length;
    const imgs: HTMLImageElement[] = [];
    for (const type of types) {
      const img = new window.Image();
      imgs.push(img);
      img.onload = () => {
        if (cancelled) return;
        newMap.set(type, img);
        remaining--;
        if (remaining === 0) setImages(new Map(newMap));
      };
      img.onerror = () => {
        if (cancelled) return;
        remaining--;
        if (remaining === 0) setImages(new Map(newMap));
      };
      img.src = `/templates/head-${type}.svg`;
    }

    return () => {
      cancelled = true;
      imgs.forEach((img) => {
        img.onload = null;
        img.onerror = null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesKey]);

  return images;
}

export interface HeadSheetCanvasHandle {
  getExportDataUrl: () => Promise<string>;
  getThumbnailDataUrl: () => Promise<string>;
}

interface HeadSheetCanvasProps {
  objects: CanvasObject[];
  templateTypes: TemplateType[];
  canvasMode: CanvasMode;
  imageDataUrl?: string | null;
  onObjectComplete: (object: CanvasObject) => void;
  onObjectsComplete: (objects: CanvasObject[]) => void;
  onUpdateObject: (id: string, updater: (obj: CanvasObject) => CanvasObject) => void;
  onDeleteObjects: (ids: string[]) => void;
}

export const HeadSheetCanvas = forwardRef<HeadSheetCanvasHandle, HeadSheetCanvasProps>(
  function HeadSheetCanvas(
    {
      objects,
      templateTypes,
      canvasMode,
      imageDataUrl,
      onObjectComplete,
      onObjectsComplete,
      onUpdateObject,
      onDeleteObjects,
    },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const stageRef = useRef<Konva.Stage | null>(null);
    const liveLineRef = useRef<Konva.Line | null>(null);
    const [stageSize, setStageSize] = useState<StageSize>({ width: 1, height: 1 });
    const [isExporting, setIsExporting] = useState(false);
    const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
    const exportQueueRef = useRef(Promise.resolve() as Promise<void>);
    const {
      tool,
      color,
      strokeSize,
      selectedObjectIds,
      zoom,
      panOffset,
      setZoom,
      setPanOffset,
      showGuides,
    } = useCanvasStore();

    // Mutable refs so native event handlers always see the latest values without
    // needing to be re-registered on every render.
    const zoomRef = useRef(zoom);
    // eslint-disable-next-line react-hooks/refs
    zoomRef.current = zoom;
    const panOffsetRef = useRef(panOffset);
    // eslint-disable-next-line react-hooks/refs
    panOffsetRef.current = panOffset;
    const toolRef = useRef(tool);
    // eslint-disable-next-line react-hooks/refs
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

        const isHandToolPan =
          e.button === 0 && e.pointerType === 'mouse' && toolRef.current === 'hand';
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

    // Clear any in-progress edit when switching away from select tool or during export.
    // Prevents the object from staying hidden if the drag is interrupted before onDragEnd fires.
    useEffect(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (isExporting || tool !== 'select') setEditingObjectId(null);
    }, [isExporting, tool]);

    // Load template SVG images for templates mode.
    const templateImages = useTemplateImages(canvasMode === 'templates' ? templateTypes : []);

    // Compute layout rects for all templates in the current stage.
    const layouts = useMemo(
      () =>
        canvasMode === 'templates'
          ? computeTemplateLayouts(templateTypes, templateImages, stageSize)
          : [],
      [canvasMode, templateTypes, templateImages, stageSize],
    );

    const resolvedGuidePoints = useMemo(
      () => (canvasMode === 'templates' && showGuides ? resolveGuidePoints(layouts) : []),
      [canvasMode, layouts, showGuides],
    );

    const { snap, clearSnap, snapIndicator } = useSnapping(
      objects,
      stageSize,
      zoom,
      12,
      resolvedGuidePoints,
    );

    const strokePixelWidth = STROKE_SIZES[strokeSize];

    const exportStage = useCallback(
      (maxDimension?: number) => {
        const task = async () => {
          const stage = stageRef.current;
          if (!stage) {
            throw new Error('Canvas stage is not ready.');
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
        exportQueueRef.current = next.then(
          () => undefined,
          () => undefined,
        );
        return next;
      },
      [stageSize.width, stageSize.height],
    );

    useImperativeHandle(
      ref,
      () => ({
        getExportDataUrl: () => exportStage(),
        getThumbnailDataUrl: () => exportStage(320),
      }),
      [exportStage],
    );

    const commonVectorOpts = {
      stageRef,
      stageSize,
      color,
      strokeSize,
      onObjectComplete,
      snap,
      clearSnap,
    };

    const penTool = usePenTool({
      stageRef,
      liveLineRef,
      stageSize,
      color,
      strokeSize,
      onObjectComplete,
    });

    const symmetryTool = useSymmetryLineTool({
      ...commonVectorOpts,
      layouts,
      onObjectsComplete,
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

    const noteTool = useNoteTool({
      stageRef,
      stageSize,
      onObjectComplete,
    });

    const rawHandlers = useMemo(() => {
      switch (tool) {
        case 'select':
          return selectTool;
        case 'note':
          return noteTool;
        case 'line':
          return lineTool;
        case 'symmetry-line':
          return symmetryTool;
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
    }, [arrowTool, dottedTool, eraserTool, lineTool, noteTool, penTool, selectTool, symmetryTool, tool]);

    const activePreviewPoints =
      tool === 'line' || tool === 'symmetry-line'
        ? (tool === 'line' ? lineTool : symmetryTool).previewPoints
        : tool === 'arrow'
          ? arrowTool.previewPoints
          : tool === 'dotted'
            ? dottedTool.previewPoints
            : null;

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
          onPointerDown={(e) => {
            if (!isPinchingRef.current) (rawHandlers.onPointerDown as StagePointerHandler)(e);
          }}
          onPointerMove={(e) => {
            if (!isPinchingRef.current) (rawHandlers.onPointerMove as StagePointerHandler)(e);
          }}
          onPointerUp={(e) => {
            if (!isPinchingRef.current) (rawHandlers.onPointerUp as StagePointerHandler)(e);
          }}
          onPointerLeave={(e) => {
            if (!isPinchingRef.current) (rawHandlers.onPointerUp as StagePointerHandler)(e);
          }}
        >
          {canvasMode === 'templates' ? (
            <BackgroundLayer stageSize={stageSize} layouts={layouts} />
          ) : (
            <ImageCanvasLayer dataUrl={imageDataUrl ?? ''} stageSize={stageSize} />
          )}
          <GuideLayer layouts={layouts} showGuides={showGuides} isExporting={isExporting} />
          <ObjectsLayer
            objects={objects}
            stageSize={stageSize}
            zoom={zoom}
            panOffset={panOffset}
            hiddenObjectIds={editingObjectId ? new Set([editingObjectId]) : undefined}
          />
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
            onDraftStart={setEditingObjectId}
            onDraftEnd={() => setEditingObjectId(null)}
          />
          {isExporting && (
            <NotesExportLayer notes={objects.filter(isNoteObject)} stageSize={stageSize} />
          )}
        </Stage>
        <NotesOverlay
          objects={objects}
          stageSize={stageSize}
          zoom={zoom}
          panOffset={panOffset}
          isExporting={isExporting}
          onUpdateObject={onUpdateObject}
          onDeleteObjects={onDeleteObjects}
        />
      </div>
    );
  },
);
