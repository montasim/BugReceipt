import type { TextAnnotationDocument } from '../application/text-annotation-model';

const DATABASE_NAME = 'bugreceipt-text-annotations';
const DATABASE_VERSION = 1;
const STORE_NAME = 'annotations';

type StoredTextAnnotationDocument = {
  sessionId: string;
  updatedAt: string;
  document: TextAnnotationDocument;
};

export async function saveTextAnnotationDocument(
  sessionId: string,
  document: TextAnnotationDocument,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  if (document.items.length === 0) {
    store.delete(sessionId);
  } else {
    const record: StoredTextAnnotationDocument = {
      sessionId,
      updatedAt: new Date().toISOString(),
      document,
    };
    store.put(record);
  }
  await completeTransaction(transaction);
  database.close();
}

export async function getTextAnnotationDocument(
  sessionId: string,
): Promise<TextAnnotationDocument | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).get(sessionId);
  const result = await new Promise<StoredTextAnnotationDocument | null>((resolve, reject) => {
    request.onsuccess = () =>
      resolve((request.result as StoredTextAnnotationDocument | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error('BugReceipt could not read saved text annotations.'));
  });
  await completeTransaction(transaction);
  database.close();
  return result?.document ?? null;
}

export async function deleteTextAnnotationDocument(sessionId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(sessionId);
  await completeTransaction(transaction);
  database.close();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'sessionId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open text annotation storage.'));
  });
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Text annotation storage failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Text annotation storage was interrupted.'));
  });
}
