import type { FormTemplate } from '@formflow/core';

const DATABASE_NAME = 'formflow-local';
const DATABASE_VERSION = 1;
const TEMPLATE_STORE = 'templates';

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Local template storage is not available in this environment.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(TEMPLATE_STORE)) {
        database.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error('Unable to open local storage.'));
    request.onblocked = () => reject(new Error('Local template storage is blocked by another open tab.'));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore, resolveValue: (value: T) => void) => void
): Promise<T> {
  return openDatabase().then((database) => new Promise<T>((resolve, reject) => {
    const transaction = database.transaction(TEMPLATE_STORE, mode);
    let result: T;
    let hasResult = false;
    const finish = () => database.close();
    action(transaction.objectStore(TEMPLATE_STORE), (value) => {
      result = value;
      hasResult = true;
    });
    transaction.oncomplete = () => {
      finish();
      if (hasResult) resolve(result);
      else resolve(undefined as T);
    };
    transaction.onerror = () => {
      finish();
      reject(transaction.error ?? new Error('Local storage transaction failed.'));
    };
    transaction.onabort = () => {
      finish();
      reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
    };
  }));
}

export async function saveTemplate(template: FormTemplate): Promise<void> {
  await runTransaction<void>('readwrite', (store) => {
    store.put(template);
  });
}

export async function listTemplates(): Promise<FormTemplate[]> {
  return runTransaction<FormTemplate[]>('readonly', (store, setResult) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const templates = request.result as FormTemplate[];
      templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setResult(templates);
    };
    request.onerror = () => {
      // The transaction error handler reports the underlying IndexedDB failure.
    };
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  await runTransaction<void>('readwrite', (store) => {
    store.delete(id);
  });
}
