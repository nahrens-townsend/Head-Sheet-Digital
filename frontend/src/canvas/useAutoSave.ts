import { useEffect, useMemo, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useCanvasStore } from '../stores/canvasStore';
import type { CanvasData } from '../types/canvasObject';
import { parseCanvasData } from '../types/canvasObject';

export function useAutoSave<TSaveResult extends { updatedAt: string }>(
  headSheetId: string,
  canvasData: CanvasData,
  saveFn: (data: CanvasData) => Promise<TSaveResult>,
  afterSave?: (saveResult: TSaveResult) => Promise<void> | void,
  // Server-provided JSON for the current sheet. Used to seed the baseline so
  // loading a sheet doesn't immediately trigger a phantom save.
  initialStrokesJson?: string,
  canvasInitialized?: boolean,
): void {
  const setSaveStatus = useCanvasStore((state) => state.setSaveStatus);
  const serializedData = useMemo(() => JSON.stringify(canvasData), [canvasData]);
  const debouncedData = useDebounce(serializedData, 1500);
  const lastSavedRef = useRef<string | null>(null);
  const saveSeqRef = useRef(0);
  const saveFnRef = useRef(saveFn);
  const afterSaveRef = useRef(afterSave);
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);
  useEffect(() => {
    afterSaveRef.current = afterSave;
  }, [afterSave]);

  useEffect(() => {
    lastSavedRef.current = null;
    saveSeqRef.current = 0;
    setSaveStatus('idle');
  }, [headSheetId, setSaveStatus]);

  // Seed the last-saved baseline by normalizing server JSON through migration.
  // This ensures v1 data doesn't trigger a phantom save on first load.
  useEffect(() => {
    if (initialStrokesJson === undefined || lastSavedRef.current !== null) return;
    const migrated = parseCanvasData(initialStrokesJson);
    lastSavedRef.current = JSON.stringify(migrated);
  }, [initialStrokesJson]);

  useEffect(() => {
    if (!headSheetId || lastSavedRef.current === null || !canvasInitialized) return;
    if (debouncedData === lastSavedRef.current) return;

    const seq = ++saveSeqRef.current;

    const persist = async () => {
      setSaveStatus('saving');
      try {
        const parsedData = JSON.parse(debouncedData) as CanvasData;
        const saveResult = await saveFnRef.current(parsedData);
        if (seq === saveSeqRef.current) {
          lastSavedRef.current = debouncedData;
          setSaveStatus('saved');
        }
        if (seq === saveSeqRef.current && afterSaveRef.current) {
          try {
            await afterSaveRef.current(saveResult);
          } catch (error) {
            console.error('After-save hook failed.', error);
          }
        }
      } catch {
        if (seq === saveSeqRef.current) {
          setSaveStatus('error');
        }
      }
    };

    void persist();
  }, [debouncedData, headSheetId, setSaveStatus]);

  useEffect(() => {
    if (!headSheetId || lastSavedRef.current === null) return;
    if (serializedData !== lastSavedRef.current) {
      setSaveStatus('idle');
    }
  }, [headSheetId, serializedData, setSaveStatus]);
}
