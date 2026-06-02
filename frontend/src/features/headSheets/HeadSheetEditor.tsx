import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CanvasToolbar } from '../../canvas/CanvasToolbar';
import { HeadSheetCanvas } from '../../canvas/HeadSheetCanvas';
import { SelectionPanel } from '../../canvas/SelectionPanel';
import { useCanvasHistory } from '../../canvas/useCanvasHistory';
import { useMirroredObjects } from '../../canvas/useMirroredObjects';
import { useCanvasStore } from '../../stores/canvasStore';
import { duplicateObject } from '../../canvas/utils/objectUtils';
import type { HeadSheetCanvasHandle } from '../../canvas/HeadSheetCanvas';
import type { CanvasObject } from '../../types/canvasObject';
import { SaveTemplateModal } from './SaveTemplateModal';
import { useCreateTemplate, useHeadSheet, useSaveStrokes, useSaveThumbnail } from './useHeadSheets';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

function parseStrokesJson(strokesJson: string | null | undefined): CanvasObject[] {
  if (!strokesJson) return []
  try {
    const parsed = JSON.parse(strokesJson) as { version?: number; objects?: CanvasObject[] }
    return parsed.objects ?? []
  } catch {
    return []
  }
}

export function HeadSheetEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: sheet, isLoading, isError } = useHeadSheet(id);

  const canvasRef = useRef<HeadSheetCanvasHandle | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const {
    addObject: _addObject,
    addObjects: _addObjects,
    updateObject,
    updateObjectsBatch,
    deleteObjects: rawDeleteObjects,
    undo: _undo,
    redo: _redo,
    canUndo,
    canRedo,
    objects,
    setObjects,
  } = useCanvasHistory();
  const { selectedObjectIds, setSelectedObjectIds, setZoom, setPanOffset } = useCanvasStore();

  const { wrappedUpdateObject: _wrappedUpdateObject, wrappedDeleteObjects: _wrappedDeleteObjects } =
    useMirroredObjects({
      objects,
      updateObject,
      updateObjectsBatch,
      deleteObjects: rawDeleteObjects,
    });

  const createTemplateMutation = useCreateTemplate();
  const saveStrokesMutation = useSaveStrokes();
  const saveThumbnailMutation = useSaveThumbnail();

  // Guards auto-save from firing on initial hydration; set by any user mutation.
  const hasUserEditedRef = useRef(false);
  // Stable ref for sheet id — avoids stale closures in the auto-save callback.
  const sheetIdRef = useRef<string | undefined>(id);
  useEffect(() => {
    sheetIdRef.current = sheet?.id ?? id;
  }, [sheet?.id, id]);

  // Wrap history mutations to mark the canvas as dirty before delegating.
  const addObject = useCallback(
    (obj: CanvasObject) => { hasUserEditedRef.current = true; _addObject(obj) },
    [_addObject],
  );
  const addObjects = useCallback(
    (objs: CanvasObject[]) => { hasUserEditedRef.current = true; _addObjects(objs) },
    [_addObjects],
  );
  const wrappedUpdateObject = useCallback(
    (objId: string, updater: (obj: CanvasObject) => CanvasObject) => {
      hasUserEditedRef.current = true;
      _wrappedUpdateObject(objId, updater);
    },
    [_wrappedUpdateObject],
  );
  const wrappedDeleteObjects = useCallback(
    (ids: string[]) => { hasUserEditedRef.current = true; _wrappedDeleteObjects(ids) },
    [_wrappedDeleteObjects],
  );
  // Undo/redo can also produce unsaved state — mark dirty so they get auto-saved.
  const undo = useCallback(() => { hasUserEditedRef.current = true; _undo() }, [_undo]);
  const redo = useCallback(() => { hasUserEditedRef.current = true; _redo() }, [_redo]);

  // Initialize canvas objects once when the sheet identity changes.
  // sheet?.id (not full `sheet`) is intentional: we don't want background refetches
  // to clobber in-progress edits once the editor is authoritative.
  useEffect(() => {
    if (!sheet) return;
    hasUserEditedRef.current = false;
    setSelectedObjectIds([]);
    setObjects(parseStrokesJson(sheet.strokesJson));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.id]);

  // Always-fresh callback ref — assigned in an effect (not during render) so the
  // react-hooks/refs rule is satisfied while still capturing the latest closure.
  const saveSheetRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    saveSheetRef.current = async () => {
      const currentId = sheetIdRef.current;
      if (!currentId) return;
      // Serialize: if a save is already in flight, defer to avoid out-of-order writes.
      if (saveStrokesMutation.isPending) {
        setTimeout(() => void saveSheetRef.current(), 500);
        return;
      }
      setSaveStatus('saving');
      try {
        const updated = await saveStrokesMutation.mutateAsync({
          id: currentId,
          strokesJson: JSON.stringify({ version: 5, objects }),
        });
        // Strokes are authoritative — report saved regardless of thumbnail outcome.
        setSaveStatus('saved');
        // Fire-and-forget thumbnail (non-critical; failure silently ignored).
        void (async () => {
          try {
            const thumbnailDataUrl = await canvasRef.current?.getThumbnailDataUrl();
            if (thumbnailDataUrl) {
              await saveThumbnailMutation.mutateAsync({
                id: currentId,
                thumbnailDataUrl,
                expectedUpdatedAt: updated.updatedAt,
              });
            }
          } catch {
            // Thumbnail conflicts are cosmetic; next auto-save will retry.
          }
        })();
      } catch {
        setSaveStatus('error');
      }
    };
  });

  // Debounced auto-save: fires 2500ms after the last object change.
  useEffect(() => {
    if (!hasUserEditedRef.current) return;
    const timer = setTimeout(() => void saveSheetRef.current(), 2500);
    return () => clearTimeout(timer);
  }, [objects]);

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
        for (const sid of selectedObjectIds) {
          const obj = objects.find((o) => o.id === sid);
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
        (sheet?.name ?? 'head-sheet')
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
        templateType: sheet?.templateType ?? 'front',
        canvasData: { version: 5, objects },
        thumbnailDataUrl: thumbnailDataUrl ?? undefined,
      });
      setShowSaveTemplate(false);
    } catch (error) {
      console.error('Failed to save template.', error);
    }
  }

  if (isLoading) {
    return <div className="editor-loading">Loading…</div>;
  }

  if (isError || !sheet) {
    return (
      <div className="editor-error">
        <div>
          <p>Failed to load head sheet.</p>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/sheets')}>
            ← Back to Sheets
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor">
      <CanvasToolbar
        canUndo={canUndo}
        canRedo={canRedo}
        canSaveTemplate={objects.length > 0}
        canvasMode={sheet.canvasMode}
        saveStatus={saveStatus}
        onUndo={undo}
        onRedo={redo}
        onExport={handleExport}
        onSaveTemplate={() => setShowSaveTemplate(true)}
        onReplaceImage={() => undefined}
        sheetName={sheet.name}
        onBack={() => navigate('/sheets')}
      />
      <div className="editor__canvas-wrap">
        <HeadSheetCanvas
          ref={canvasRef}
          objects={objects}
          templateTypes={sheet.templateTypes}
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
