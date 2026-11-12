import type { FormTemplate } from '@formflow/core';
const DATABASE_NAME = 'formflow-local';
const DATABASE_VERSION = 1;
const TEMPLATE_STORE = 'templates';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(TEMPLATE_STORE)) request.result.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open local storage.'));
  });
}

export async function saveTemplate(template: FormTemplate): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
    tx.objectStore(TEMPLATE_STORE).put(template);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Unable to save template.')); };
  });
}
export async function listTemplates(): Promise<FormTemplate[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEMPLATE_STORE, 'readonly');
    const request = tx.objectStore(TEMPLATE_STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result as FormTemplate[]); };
    request.onerror = () => { db.close(); reject(request.error ?? new Error('Unable to list templates.')); };
  });
}
export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(TEMPLATE_STORE, 'readwrite');
    tx.objectStore(TEMPLATE_STORE).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Unable to delete template.')); };
  });
}
