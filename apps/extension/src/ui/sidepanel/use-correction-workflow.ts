import type { CorrectionCollection } from '@bugreceipt/capture-model';
import { renderCorrectionCollectionJson } from '@bugreceipt/issue-export';
import { useEffect, useState } from 'react';
import { sendRuntimeMessage } from '../../application/protocol';
import { CORRECTION_COLLECTION_KEY } from '../../application/correction-store';
import { createReportBundle } from '../../infrastructure/report-bundle';
import { readScreenshot } from '../../infrastructure/screenshot-store';
import { useOffensiveLanguageValidation } from '../use-offensive-language-validation';

export function useCorrectionWorkflow() {
  const [collection, setCollection] = useState<CorrectionCollection | null>(null);
  const [proposedText, setProposedText] = useState('');
  const [sourceLocale, setSourceLocale] = useState('');
  const [targetLocale, setTargetLocale] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [pending, setPending] = useState<'loading' | 'saving' | 'exporting' | 'discarding' | null>(
    'loading',
  );
  const [error, setError] = useState('');
  const correction =
    collection?.corrections.find((item) => item.id === collection.activeCorrectionId) ?? null;
  const proposedModeration = useOffensiveLanguageValidation(proposedText);

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';
    const load = async () => {
      try {
        const response = await sendRuntimeMessage({ type: 'correction:get-collection' });
        if (!response.ok || !('correctionCollection' in response) || disposed) return;
        const next = response.correctionCollection;
        setCollection(next);
        const active =
          next?.corrections.find((item) => item.id === next.activeCorrectionId) ?? null;
        setProposedText(active?.proposedText ?? '');
        setSourceLocale(active?.locale?.source ?? '');
        setTargetLocale(active?.locale?.target ?? '');
        if (active?.page.screenshotBlobId) {
          const blob = await readScreenshot(active.page.screenshotBlobId);
          if (!disposed && blob) {
            objectUrl = URL.createObjectURL(blob);
            setScreenshotUrl(objectUrl);
          }
        } else setScreenshotUrl('');
      } catch (reason) {
        if (!disposed)
          setError(reason instanceof Error ? reason.message : 'Could not load corrections.');
      } finally {
        if (!disposed) setPending(null);
      }
    };
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'session' && changes[CORRECTION_COLLECTION_KEY]) void load();
    };
    chrome.storage?.onChanged?.addListener(listener);
    void load();
    return () => {
      disposed = true;
      chrome.storage?.onChanged?.removeListener(listener);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  async function save(): Promise<CorrectionCollection | null> {
    if (!correction) return collection;
    setPending('saving');
    setError('');
    try {
      const response = await sendRuntimeMessage({
        type: 'correction:update-draft',
        correctionId: correction.id,
        proposedText,
        ...(sourceLocale.trim() ? { sourceLocale } : {}),
        ...(targetLocale.trim() ? { targetLocale } : {}),
      });
      if (!response.ok || !('correctionCollection' in response) || !response.correctionCollection) {
        setError(response.ok ? 'No correction draft exists.' : response.message);
        return null;
      }
      setCollection(response.correctionCollection);
      return response.correctionCollection;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save correction.');
      return null;
    } finally {
      setPending(null);
    }
  }

  async function setActiveCorrection(correctionId: string) {
    await save();
    const response = await sendRuntimeMessage({ type: 'correction:set-active', correctionId });
    if (response.ok && 'correctionCollection' in response && response.correctionCollection) {
      const next = response.correctionCollection;
      const active = next.corrections.find((item) => item.id === correctionId);
      setCollection(next);
      setProposedText(active?.proposedText ?? '');
      setSourceLocale(active?.locale?.source ?? '');
      setTargetLocale(active?.locale?.target ?? '');
    } else if (!response.ok) setError(response.message);
  }

  async function exportCorrections() {
    if (!collection) return;
    setPending('exporting');
    setError('');
    try {
      const saved = await save();
      const next = saved ?? collection;
      const invalid = next.corrections.find(
        (item) => !item.proposedText.trim() || item.proposedText.trim() === item.originalText,
      );
      if (invalid) throw new Error('Complete every correction before exporting.');
      const json = renderCorrectionCollectionJson(next);
      const visuals = [];
      for (const [index, item] of next.corrections.entries())
        if (item.page.screenshotBlobId) {
          const blob = await readScreenshot(item.page.screenshotBlobId);
          if (blob)
            visuals.push({
              blob,
              filename: `correction-${String(index + 1).padStart(2, '0')}.png`,
            });
        }
      const bundle = await createReportBundle(json, visuals, 'corrections.json');
      downloadBlob(bundle, 'bugreceipt-corrections.zip');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not export corrections.');
    } finally {
      setPending(null);
    }
  }
  async function discard() {
    setPending('discarding');
    setError('');
    try {
      const response = await sendRuntimeMessage({ type: 'correction:discard-collection' });
      if (response.ok) setCollection(null);
      else setError(response.message);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not discard corrections.');
    } finally {
      setPending(null);
    }
  }

  return {
    collection,
    correction,
    corrections: collection?.corrections ?? [],
    proposedText,
    setProposedText,
    sourceLocale,
    setSourceLocale,
    targetLocale,
    setTargetLocale,
    screenshotUrl,
    pending,
    error,
    proposedModeration,
    save,
    setActiveCorrection,
    exportCorrections,
    discard,
    busy: pending !== null,
  };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
