import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CanvasToolbar } from '../../canvas/CanvasToolbar';
import { HeadSheetCanvas } from '../../canvas/HeadSheetCanvas';
import { SelectionPanel } from '../../canvas/SelectionPanel';
import { useCanvasHistory } from '../../canvas/useCanvasHistory';
import { useMirroredObjects } from '../../canvas/useMirroredObjects';
import { useCanvasStore } from '../../stores/canvasStore';
import { duplicateObject } from '../../canvas/utils/objectUtils';
import type { HeadSheetCanvasHandle } from '../../canvas/HeadSheetCanvas';
import { SaveTemplateModal } from './SaveTemplateModal';
import { useCreateTemplate } from './useHeadSheets';
import type { CanvasMode, TemplateType } from '../../types/headSheet';

const SHEET_NAME = 'Head Sheet';
const TEMPLATE_TYPES: TemplateType[] = ['front'];
const CANVAS_MODE: CanvasMode = 'templates';
const IMAGE_DATA_URL: string | null = null;

export function HeadSheetEditor() {
  const navigate = useNavigate();
  const canvasRef = useRef<HeadSheetCanvasHandle | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const {
    addObject,
    addObjects,
    updateObject,
    updateObjectsBatch,
    deleteObjects: rawDeleteObjects,
    undo,
    redo,
    canUndo,
    canRedo,
    objects,
  } = useCanvasHistory();
  const { selectedObjectIds, setSelectedObjectIds, setZoom, setPanOffset } = useCanvasStore();

  const { wrappedUpdateObject, wrappedDeleteObjects } = useMirroredObjects({
    objects,
    updateObject,
    updateObjectsBatch,
    deleteObjects: rawDeleteObjects,
  });
  const createTemplateMutation = useCreateTemplate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((event.ctrlKey || event.metaKey) && key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (key === 'y' || (key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
        return;
      }

      if (inInput) return;

      if ((event.ctrlKey || event.metaKey) && key === 'a') {
        event.preventDefault();
        setSelectedObjectIds(objects.map((o) => o.id));
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === '0') {
        event.preventDefault();
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }

      if (key === 'escape') {
        setSelectedObjectIds([]);
        return;
      }

      if ((key === 'delete' || key === 'backspace') && selectedObjectIds.length > 0) {
        event.preventDefault();
        wrappedDeleteObjects([...selectedObjectIds]);
        setSelectedObjectIds([]);
        return;
      }

      if (key === 'd' && !event.ctrlKey && !event.metaKey && selectedObjectIds.length > 0) {
        event.preventDefault();
        const newIds: string[] = [];
        for (const id of selectedObjectIds) {
          const obj = objects.find((o) => o.id === id);
          if (obj) {
            const dup = duplicateObject(obj);
            addObject(dup);
            newIds.push(dup.id);
          }
        }
        if (newIds.length > 0) setSelectedObjectIds(newIds);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [
    redo,
    undo,
    selectedObjectIds,
    objects,
    wrappedDeleteObjects,
    addObject,
    setSelectedObjectIds,
    setZoom,
    setPanOffset,
  ]);

  async function handleExport() {
    try {
      const dataUrl = await canvasRef.current?.getExportDataUrl();
      if (!dataUrl) return;

      const filename = `${
        SHEET_NAME.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') || 'head-sheet'
      }.png`;
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Failed to export canvas.', error);
    }
  }

  async function handleSaveTemplate(name: string) {
    try {
      const thumbnailDataUrl = await canvasRef.current?.getThumbnailDataUrl();
      await createTemplateMutation.mutateAsync({
        name,
        templateType: TEMPLATE_TYPES[0] ?? 'front',
        canvasData: { version: 5, objects },
        thumbnailDataUrl: thumbnailDataUrl ?? undefined,
      });
      setShowSaveTemplate(false);
    } catch (error) {
      console.error('Failed to save template.', error);
    }
  }

  return (
    <div className="editor">
      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canSaveTemplate={objects.length > 0}
        canvasMode={CANVAS_MODE}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onSaveTemplate={() => setShowSaveTemplate(true)}
        onReplaceImage={() => undefined}
        sheetName={SHEET_NAME}
        onBack={() => navigate('/sheets')}
      />
      <div className="editor__canvas-wrap">
        <HeadSheetCanvas
          ref={canvasRef}
          objects={objects}
          templateTypes={TEMPLATE_TYPES}
          canvasMode={CANVAS_MODE}
          imageDataUrl={IMAGE_DATA_URL}
          onObjectComplete={addObject}
          onObjectsComplete={addObjects}
          onUpdateObject={wrappedUpdateObject}
          onDeleteObjects={wrappedDeleteObjects}
        />
        <SelectionPanel
          objects={objects}
          onUpdateObject={wrappedUpdateObject}
          onDeleteObjects={wrappedDeleteObjects}
          onDuplicateObject={addObject}
        />
      </div>
      {showSaveTemplate && (
        <SaveTemplateModal
          defaultName={`${SHEET_NAME} Template`}
          errorMessage={
            createTemplateMutation.isError ? 'Failed to save template. Please try again.' : null
          }
          isSaving={createTemplateMutation.isPending}
          onClose={() => setShowSaveTemplate(false)}
          onSave={handleSaveTemplate}
        />
      )}
    </div>
  );
}
