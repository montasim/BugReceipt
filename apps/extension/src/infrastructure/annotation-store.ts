import type { AnnotationDocument } from '../application/annotation-model';

const DATABASE_NAME = 'bugreceipt-frame-annotations';
const DATABASE_VERSION = 1;
const STORE_NAME = 'annotations';

type StoredAnnotationDocument = {
  frameId: string;
  updatedAt: string;
  document: AnnotationDocument;
};

export async function saveAnnotationDocument(
  frameId: string,
  document: AnnotationDocument,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);
  if (document.items.length === 0) {
    store.delete(frameId);
  } else {
    const record: StoredAnnotationDocument = {
      frameId,
      updatedAt: new Date().toISOString(),
      document,
    };
    store.put(record);
  }
  await completeTransaction(transaction);
  database.close();
}

export async function getAnnotationDocument(frameId: string): Promise<AnnotationDocument | null> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).get(frameId);
  const result = await new Promise<StoredAnnotationDocument | null>((resolve, reject) => {
    request.onsuccess = () =>
      resolve((request.result as StoredAnnotationDocument | undefined) ?? null);
    request.onerror = () =>
      reject(request.error ?? new Error('BugReceipt could not read saved annotations.'));
  });
  await completeTransaction(transaction);
  database.close();
  return result?.document ?? null;
}

export async function deleteAnnotationDocument(frameId: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  transaction.objectStore(STORE_NAME).delete(frameId);
  await completeTransaction(transaction);
  database.close();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'frameId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Could not open annotation storage.'));
  });
}

function completeTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('Annotation storage failed.'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('Annotation storage was interrupted.'));
  });
}
