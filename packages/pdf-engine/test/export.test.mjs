import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { degrees, PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { exportPdfWithOverlayFields } from '../src/export.ts';

const fontPath = 'node_modules/@fontsource/ibm-plex-sans-arabic/files/';

async function font(name) {
  return new Uint8Array(await fs.readFile(fontPath + name));
}

test('exports Latin, French, Arabic and checkbox overlay values into a PDF', async () => {
  const sourceDocument = await PDFDocument.create();
  sourceDocument.addPage([600, 800]);
  sourceDocument.addPage([600, 800]);
  const source = await sourceDocument.save();
  const fields = [
    { id: 'latin', name: 'latin', label: 'Name', kind: 'text', pageNumber: 1, x: 40, y: 50, width: 210, height: 28, required: false },
    { id: 'french', name: 'french', label: 'Ville', kind: 'text', pageNumber: 1, x: 40, y: 100, width: 210, height: 28, required: false },
    { id: 'arabic', name: 'arabic', label: 'الاسم', kind: 'text', pageNumber: 1, x: 300, y: 150, width: 220, height: 32, required: false },
    { id: 'check', name: 'check', label: 'Agree', kind: 'checkbox', pageNumber: 1, x: 40, y: 200, width: 18, height: 18, required: false },
    { id: 'page-two', name: 'page-two', label: 'Second page value', kind: 'text', pageNumber: 2, x: 60, y: 80, width: 220, height: 28, required: false, method: 'manual' }
  ];
  const output = await exportPdfWithOverlayFields(
    source, fields,
    { latin: 'FormFlow', french: 'Oran – Algérie', arabic: 'الاسم: أحمد 123', check: true, 'page-two': 'PageTwo' },
    {
      arabic: await font('ibm-plex-sans-arabic-arabic-400-normal.woff'),
      latin: await font('ibm-plex-sans-arabic-latin-400-normal.woff')
    }
  );

  assert.ok(output.length > source.length);
  const task = pdfjs.getDocument({ data: output, disableWorker: true });
  const document = await task.promise;
  try {
    const page = await document.getPage(1);
    const text = (await page.getTextContent()).items
      .filter((item) => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    assert.match(text, /FormFlow/);
    assert.match(text, /Oran/);
    assert.match(text, /Algérie/);
    assert.match(text, /123/);
    assert.match(text, /[\uFE70-\uFEFF]/, 'Arabic text should be emitted with shaped Arabic presentation glyphs');
    assert.ok(text.length > 20);
    const secondPage = await document.getPage(2);
    const secondPageText = (await secondPage.getTextContent()).items
      .filter((item) => 'str' in item).map((item) => item.str).join(' ');
    assert.match(secondPageText, /PageTwo/);
  } finally {
    await task.destroy();
  }
});

test('rejects rotated pages rather than exporting with incorrect coordinates', async () => {
  const sourceDocument = await PDFDocument.create();
  const page = sourceDocument.addPage([300, 400]);
  page.setRotation(degrees(90));
  await assert.rejects(
    exportPdfWithOverlayFields(
      await sourceDocument.save(),
      [{ id: 'field', name: 'field', label: 'Name', kind: 'text', pageNumber: 1, x: 10, y: 10, width: 120, height: 24, required: false }],
      { field: 'Test' },
      {
        arabic: await font('ibm-plex-sans-arabic-arabic-400-normal.woff'),
        latin: await font('ibm-plex-sans-arabic-latin-400-normal.woff')
      }
    ),
    /rotated pages/
  );
});

test('fills native AcroForm text, checkbox, dropdown and radio values in the same export', async () => {
  const sourceDocument = await PDFDocument.create();
  const page = sourceDocument.addPage([500, 700]);
  const form = sourceDocument.getForm();

  const textField = form.createTextField('applicant.name');
  textField.addToPage(page, { x: 40, y: 600, width: 180, height: 28 });

  const consent = form.createCheckBox('applicant.consent');
  consent.addToPage(page, { x: 40, y: 550, width: 18, height: 18 });

  const city = form.createDropdown('applicant.city');
  city.addOptions(['Oran', 'Algiers']);
  city.addToPage(page, { x: 40, y: 500, width: 180, height: 28 });

  const choice = form.createRadioGroup('applicant.choice');
  choice.addOptionToPage('A', page, { x: 40, y: 450, width: 18, height: 18 });
  choice.addOptionToPage('B', page, { x: 70, y: 450, width: 18, height: 18 });

  const output = await exportPdfWithOverlayFields(
    await sourceDocument.save(), [],
    {},
    {
      arabic: await font('ibm-plex-sans-arabic-arabic-400-normal.woff'),
      latin: await font('ibm-plex-sans-arabic-latin-400-normal.woff')
    },
    {
      'applicant.name': 'Amina',
      'applicant.consent': true,
      'applicant.city': 'Oran',
      'applicant.choice': 'B'
    }
  );

  const saved = await PDFDocument.load(output);
  const savedForm = saved.getForm();
  assert.equal(savedForm.getTextField('applicant.name').getText(), 'Amina');
  assert.equal(savedForm.getCheckBox('applicant.consent').isChecked(), true);
  assert.deepEqual(savedForm.getDropdown('applicant.city').getSelected(), ['Oran']);
  assert.equal(savedForm.getRadioGroup('applicant.choice').getSelected(), 'B');
});
