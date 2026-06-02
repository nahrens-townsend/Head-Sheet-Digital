import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CanvasToolbar } from '../../canvas/CanvasToolbar';
import { HeadSheetCanvas } from '../../canvas/HeadSheetCanvas';
import { SelectionPanel } from '../../canvas/SelectionPanel';
import { useAutoSave } from '../../canvas/useAutoSave';
import { useCanvasHistory } from '../../canvas/useCanvasHistory';
import { useMirroredObjects } from '../../canvas/useMirroredObjects';
import { useCanvasStore } from '../../stores/canvasStore';
import { parseCanvasData } from '../../types/canvasObject';
import { duplicateObject } from '../../canvas/utils/objectUtils';
import type { HeadSheetCanvasHandle } from '../../canvas/HeadSheetCanvas';
import { SaveTemplateModal } from './SaveTemplateModal';
import {
  useCreateTemplate,
  useGetHeadSheet,
  useSaveImage,
  useSaveStrokes,
  useSaveThumbnail,
} from './useHeadSheets';

export function HeadSheetEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const sheetId = id ?? '';
  const initializedSheetIdRef = useRef<string | null>(null);
  const canvasRef = useRef<HeadSheetCanvasHandle | null>(null);
  const replaceImageInputRef = useRef<HTMLInputElement | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [canvasInitialized, setCanvasInitialized] = useState(false);
  const { data, isLoading, isError } = useGetHeadSheet(sheetId);
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
    setObjects,
  } = useCanvasHistory();
  const saveStatus = useCanvasStore((state) => state.saveStatus);
  const { selectedObjectIds, setSelectedObjectIds, setZoom, setPanOffset } = useCanvasStore();

  const { wrappedUpdateObject, wrappedDeleteObjects } = useMirroredObjects({
    objects,
    updateObject,
    updateObjectsBatch,
    deleteObjects: rawDeleteObjects,
  });
  const saveMutation = useSaveStrokes(sheetId);
  const saveThumbnailMutation = useSaveThumbnail(sheetId);
  const saveImageMutation = useSaveImage();
  const createTemplateMutation = useCreateTemplate();

  useEffect(() => {
    const sheet = data?.data;
    if (!sheet) return;

    setObjects(parseCanvasData(sheet.strokesJson).objects);
    setCanvasInitialized(true);
  }, [data?.data]);

  useEffect(
    () => () => {
      saveImageMutation.reset();
    },
    [],
  );

  useEffect(() => {
    initializedSheetIdRef.current = null;
  }, [sheetId]);

  useEffect(() => {
    const sheet = data?.data;
    if (!sheet || initializedSheetIdRef.current === sheet.id) {
      return;
    }

    setObjects(parseCanvasData(sheet.strokesJson).objects);
    initializedSheetIdRef.current = sheet.id;
    // Reset zoom/pan when opening a sheet so each session starts at 1:1.
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, [data?.data, setObjects, setZoom, setPanOffset]);

  useAutoSave(
    sheetId,
    { version: 5, objects },
    async (canvasData) => {
      console.log('canvasData', canvasData);
      const res = await saveMutation.mutateAsync(canvasData);
      if (!res.success || !res.data) {
        throw new Error(res.error ?? 'Failed to save head sheet.');
      }
      return res.data;
    },
    async (saveResult) => {
      console.log('saveResult', saveResult);
      const thumbnailDataUrl = await canvasRef.current?.getThumbnailDataUrl();
      if (!thumbnailDataUrl) return;

      try {
        await saveThumbnailMutation.mutateAsync({
          thumbnailDataUrl,
          expectedUpdatedAt: saveResult.updatedAt,
        });
      } catch (error) {
        console.error('Failed to save sheet thumbnail.', error);
      }
    },
    data?.data?.strokesJson,
    canvasInitialized,
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      // Don't fire canvas shortcuts when a text input is focused.
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

      // Ctrl+A — select all objects
      if ((event.ctrlKey || event.metaKey) && key === 'a') {
        event.preventDefault();
        setSelectedObjectIds(objects.map((o) => o.id));
        return;
      }

      // Ctrl+0 — reset zoom and pan
      if ((event.ctrlKey || event.metaKey) && key === '0') {
        event.preventDefault();
        setZoom(1);
        setPanOffset({ x: 0, y: 0 });
        return;
      }

      // Escape — deselect
      if (key === 'escape') {
        setSelectedObjectIds([]);
        return;
      }

      // Delete / Backspace — delete selected objects
      if ((key === 'delete' || key === 'backspace') && selectedObjectIds.length > 0) {
        event.preventDefault();
        wrappedDeleteObjects([...selectedObjectIds]);
        setSelectedObjectIds([]);
        return;
      }

      // D — duplicate selected objects (selects the new copies)
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
        sheet.name
          .trim()
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
        templateType: sheet.templateType,
        canvasData: { version: 5, objects },
        thumbnailDataUrl: thumbnailDataUrl ?? undefined,
      });
      setShowSaveTemplate(false);
    } catch (error) {
      console.error('Failed to save template.', error);
    }
  }

  async function readAsDataUrl(file: File): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          resolve(result);
          return;
        }
        reject(new Error('Failed to read image file.'));
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(file);
    });
  }

  async function handleReplaceImageFile(file: File) {
    try {
      const imageDataUrl = await readAsDataUrl(file);
      const res = await saveImageMutation.mutateAsync({ id: sheetId, imageDataUrl });
      if (!res.success) {
        throw new Error(res.error ?? 'Failed to save image.');
      }
    } catch (error) {
      console.error('Failed to replace image.', error);
    }
  }

  if (isLoading) {
    return <div className="editor-loading">Loading…</div>;
  }

  if (isError || !data?.data) {
    return <div className="editor-error">Sheet not found.</div>;
  }

  const sheet = data.data;

  return (
    <div className="editor">
      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canSaveTemplate={objects.length > 0}
        canvasMode={sheet.canvasMode}
        imageUploadStatus={
          saveImageMutation.isPending ? 'uploading' : saveImageMutation.isError ? 'error' : 'idle'
        }
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onSaveTemplate={() => setShowSaveTemplate(true)}
        onReplaceImage={() => {
          if (sheet.canvasMode !== 'image') return;
          replaceImageInputRef.current?.click();
        }}
        saveStatus={saveStatus}
        sheetName={sheet.name}
        onBack={() => navigate('/sheets')}
      />
      <input
        ref={replaceImageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            await handleReplaceImageFile(file);
          } finally {
            e.currentTarget.value = '';
          }
        }}
      />
      <div className="editor__canvas-wrap">
        <HeadSheetCanvas
          ref={canvasRef}
          objects={objects}
          templateTypes={
            sheet.templateTypes.length > 0 ? sheet.templateTypes : [sheet.templateType]
          }
          canvasMode={sheet.canvasMode}
          imageDataUrl={sheet.imageDataUrl}
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
          defaultName={`${sheet.name} Template`}
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
