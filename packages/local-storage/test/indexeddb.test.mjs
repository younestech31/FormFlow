import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { deleteTemplate, listTemplates, saveTemplate } from '../src/index.ts';

const sample = {
  id: 'template-test-1',
  name: 'Administrative form',
  sourceFileName: 'form.pdf',
  sourceFingerprint: 'sha256:fixture',
  pageCount: 1,
  fields: [{
    id: 'field-1', name: 'field-1', label: 'Name', kind: 'text',
    pageNumber: 1, x: 40, y: 60, width: 200, height: 28, required: false,
    method: 'manual', confidence: 1
  }],
  createdAt: '2026-11-12T00:00:00.000Z',
  updatedAt: '2026-11-12T00:00:00.000Z'
};

test('saves, lists, replaces, and deletes templates locally', async () => {
  await deleteTemplate(sample.id);
  await saveTemplate(sample);
  let templates = await listTemplates();
  assert.equal(templates.length, 1);
  assert.equal(templates[0].sourceFingerprint, sample.sourceFingerprint);
  assert.equal(templates[0].fields[0].label, 'Name');

  await saveTemplate({ ...sample, name: 'Updated form' });
  templates = await listTemplates();
  assert.equal(templates.length, 1);
  assert.equal(templates[0].name, 'Updated form');

  await deleteTemplate(sample.id);
  assert.deepEqual(await listTemplates(), []);
});
