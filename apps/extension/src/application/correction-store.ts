import {
  correctionCollectionSchema,
  correctionReportSchema,
  MAX_CORRECTIONS,
  normalizeLocaleTag,
  type CorrectionCollection,
  type CorrectionReport,
} from '@bugreceipt/capture-model';
import { filterText, filterUrl } from '@bugreceipt/privacy';

export const CORRECTION_KEY = 'reprokit:correction-report';
export const CORRECTION_COLLECTION_KEY = 'reprokit:correction-collection';

export async function loadCorrectionCollection(): Promise<CorrectionCollection | null> {
  const stored = (await chrome.storage.session.get(CORRECTION_COLLECTION_KEY))[
    CORRECTION_COLLECTION_KEY
  ];
  const parsed = correctionCollectionSchema.safeParse(stored);
  if (parsed.success) return parsed.data;
  const legacy = correctionReportSchema.safeParse(
    (await chrome.storage.session.get(CORRECTION_KEY))[CORRECTION_KEY],
  );
  if (!legacy.success) return null;
  const now = new Date().toISOString();
  const report = legacy.data;
  const collection: CorrectionCollection = {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    page: { url: report.page.url, title: report.page.title },
    activeCorrectionId: report.id,
    corrections: [report],
    createdAt: now,
    updatedAt: now,
  };
  await saveCorrectionCollection(collection);
  await chrome.storage.session.remove(CORRECTION_KEY);
  return collection;
}

export async function saveCorrectionCollection(
  collection: CorrectionCollection,
): Promise<CorrectionCollection> {
  const validated = correctionCollectionSchema.parse(collection);
  await chrome.storage.session.set({ [CORRECTION_COLLECTION_KEY]: validated });
  return validated;
}
export async function clearCorrectionCollection() {
  await chrome.storage.session.remove([CORRECTION_COLLECTION_KEY, CORRECTION_KEY]);
}

export function createCorrection(
  tab: chrome.tabs.Tab,
  originalText: string,
  context?: CorrectionReport['context'],
  sourceLocale?: string,
): CorrectionReport {
  if (typeof tab.id !== 'number' || typeof tab.windowId !== 'number' || !tab.url)
    throw new Error('The selected page cannot create a correction.');
  const url = new URL(tab.url);
  if (!['http:', 'https:'].includes(url.protocol))
    throw new Error('BugReceipt can create corrections only on regular web pages.');
  const filteredText = filterText(originalText.trim());
  if (!filteredText.value) throw new Error('Select some text before suggesting a correction.');
  const capturedAt = new Date().toISOString();
  const source = normalizeLocaleTag(sourceLocale);
  return {
    schemaVersion: 1,
    id: crypto.randomUUID(),
    status: 'draft',
    originalText: filteredText.value,
    proposedText: '',
    page: { url: filterUrl(tab.url, true), title: filterText(tab.title ?? '').value, capturedAt },
    ...(source ? { locale: { source } } : {}),
    ...(context ? { context } : {}),
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      reproKitVersion: '0.2.0',
    },
  };
}

export async function appendCorrection(report: CorrectionReport): Promise<CorrectionCollection> {
  const current = await loadCorrectionCollection();
  if (!current) {
    const now = new Date().toISOString();
    return saveCorrectionCollection({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      page: { url: report.page.url, title: report.page.title },
      activeCorrectionId: report.id,
      corrections: [report],
      createdAt: now,
      updatedAt: now,
    });
  }
  if (new URL(current.page.url).origin !== new URL(report.page.url).origin)
    throw new Error(
      'Finish or discard the current correction collection before using another page.',
    );
  if (current.corrections.length >= MAX_CORRECTIONS)
    throw new Error('You can add up to 20 corrections.');
  return saveCorrectionCollection({
    ...current,
    activeCorrectionId: report.id,
    corrections: [...current.corrections, report],
    updatedAt: new Date().toISOString(),
  });
}

export async function updateCorrectionDraft(input: {
  correctionId: string;
  proposedText: string;
  sourceLocale?: string | undefined;
  targetLocale?: string | undefined;
}): Promise<CorrectionCollection> {
  const current = await loadCorrectionCollection();
  if (!current) throw new Error('No correction draft exists.');
  const correction = current.corrections.find((item) => item.id === input.correctionId);
  if (!correction) throw new Error('Correction draft no longer exists.');
  const proposed = filterText(input.proposedText.trim()).value;
  const source = normalizeLocaleTag(input.sourceLocale) ?? correction.locale?.source;
  const target = normalizeLocaleTag(input.targetLocale) ?? correction.locale?.target;
  const locale =
    source || target ? { ...(source ? { source } : {}), ...(target ? { target } : {}) } : undefined;
  const updated: CorrectionReport = {
    ...correction,
    status: proposed && proposed !== correction.originalText ? 'ready-for-export' : 'draft',
    proposedText: proposed,
    ...(locale ? { locale } : { locale: undefined }),
  };
  return saveCorrectionCollection({
    ...current,
    activeCorrectionId: correction.id,
    corrections: current.corrections.map((item) => (item.id === correction.id ? updated : item)),
    updatedAt: new Date().toISOString(),
  });
}

export async function setActiveCorrection(correctionId: string): Promise<CorrectionCollection> {
  const current = await loadCorrectionCollection();
  if (!current || !current.corrections.some((item) => item.id === correctionId))
    throw new Error('Correction draft no longer exists.');
  return saveCorrectionCollection({
    ...current,
    activeCorrectionId: correctionId,
    updatedAt: new Date().toISOString(),
  });
}
export async function loadCorrection() {
  const c = await loadCorrectionCollection();
  return c?.corrections.find((item) => item.id === c.activeCorrectionId) ?? null;
}
export async function updateCorrection(input: {
  proposedText: string;
  sourceLocale?: string | undefined;
  targetLocale?: string | undefined;
}) {
  const c = await loadCorrection();
  if (!c) throw new Error('No correction draft exists.');
  const result = await updateCorrectionDraft({ correctionId: c.id, ...input });
  return result.corrections.find((item) => item.id === c.id)!;
}
export async function clearCorrection() {
  await clearCorrectionCollection();
}
