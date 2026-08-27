const DATABASE_NAME = 'reprokit-artifacts';
const DATABASE_VERSION = 2;
const SCREENSHOT_STORE_NAME = 'screenshots';
const RECORDING_STORE_NAME = 'recordings';

export async function saveRecording(id: string, blob: Blob): Promise<void> {
  const database = await openDatabase();
  await transactionPromise(database, 'readwrite', (store) => store.put(blob, id));
  database.close();
}

export async function readRecording(id: string): Promise<Blob | null> {
  const database = await openDatabase();
  const value = await transactionPromise(database, 'readonly', (store) => store.get(id));
  database.close();
  return value instanceof Blob ? value : null;
}

export async function deleteRecording(id: string): Promise<void> {
  const database = await openDatabase();
  await transactionPromise(database, 'readwrite', (store) => store.delete(id));
  database.close();
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SCREENSHOT_STORE_NAME)) {
        request.result.createObjectStore(SCREENSHOT_STORE_NAME);
      }
      if (!request.result.objectStoreNames.contains(RECORDING_STORE_NAME)) {
        request.result.createObjectStore(RECORDING_STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Could not open artifact storage.'));
  });
}

function transactionPromise(
  database: IDBDatabase,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORDING_STORE_NAME, mode);
    const request = run(transaction.objectStore(RECORDING_STORE_NAME));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Recording storage failed.'));
  });
}
