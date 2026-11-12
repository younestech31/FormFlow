import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractVectorShapes } from '../src/vector-geometry.ts';
import { detectGeometryFields } from '../../core/src/detection.ts';

test('extracts PDF vector rectangles, checkboxes, and underlines in viewport coordinates', async () => {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([600, 800]);
  page.drawRectangle({ x: 100, y: 500, width: 200, height: 30, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawRectangle({ x: 40, y: 400, width: 14, height: 14, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawLine({ start: { x: 50, y: 300 }, end: { x: 300, y: 300 }, thickness: 1 });

  const task = pdfjs.getDocument({ data: await pdf.save() });
  const document = await task.promise;
  try {
    const pdfPage = await document.getPage(1);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const operatorList = await pdfPage.getOperatorList();
    const shapes = extractVectorShapes(operatorList, 1, viewport);
    assert.deepEqual(shapes.map((shape) => shape.kind), ['rectangle', 'rectangle', 'line']);
    assert.deepEqual(
      [Math.round(shapes[0].x), Math.round(shapes[0].y), Math.round(shapes[0].width), Math.round(shapes[0].height)],
      [100, 270, 200, 30]
    );
    assert.equal(Math.round(shapes[1].width), 14);
    assert.equal(Math.round(shapes[1].height), 14);

    const candidates = detectGeometryFields(shapes);
    assert.deepEqual(candidates.map((candidate) => candidate.kind), ['text', 'checkbox', 'text']);
  } finally {
    await task.destroy();
  }
});
