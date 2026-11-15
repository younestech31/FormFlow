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
  page.drawEllipse({ x: 360, y: 400, xScale: 8, yScale: 8, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawEllipse({ x: 420, y: 400, xScale: 8, yScale: 8, borderColor: rgb(0, 0, 0), borderWidth: 1 });
  page.drawText('Yes', { x: 380, y: 396, size: 10 });
  page.drawText('No', { x: 440, y: 396, size: 10 });
  page.drawText('Signature:', { x: 5, y: 304, size: 10 });
  page.drawLine({ start: { x: 50, y: 300 }, end: { x: 300, y: 300 }, thickness: 1 });

  const task = pdfjs.getDocument({ data: await pdf.save() });
  const document = await task.promise;
  try {
    const pdfPage = await document.getPage(1);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const operatorList = await pdfPage.getOperatorList();
    const shapes = extractVectorShapes(operatorList, 1, viewport);
    assert.deepEqual(shapes.map((shape) => shape.kind), ['rectangle', 'rectangle', 'ellipse', 'ellipse', 'line']);
    assert.deepEqual(
      [Math.round(shapes[0].x), Math.round(shapes[0].y), Math.round(shapes[0].width), Math.round(shapes[0].height)],
      [100, 270, 200, 30]
    );
    assert.equal(Math.round(shapes[1].width), 14);
    assert.equal(Math.round(shapes[1].height), 14);

    const content = await pdfPage.getTextContent();
    const fragments = content.items.flatMap((item, index) => {
      if (!('str' in item) || !item.str.trim()) return [];
      const transform = item.transform;
      const height = Math.max(1, Math.abs(transform[3]) || item.height || 10);
      return [{
        id: 'text-' + index, text: item.str, pageNumber: 1,
        pageWidth: viewport.width, pageHeight: viewport.height,
        x: transform[4], y: Math.max(0, viewport.height - transform[5] - height),
        width: item.width, height
      }];
    });
    const candidates = detectGeometryFields(shapes, fragments);
    assert.deepEqual(candidates.map((candidate) => candidate.kind), ['text', 'checkbox', 'radio', 'radio', 'signature']);
    assert.equal(candidates[2].kind, 'radio');
    assert.equal(candidates[2].label, 'Yes');
    assert.equal(candidates[3].kind, 'radio');
    assert.equal(candidates[3].label, 'No');
    assert.equal(candidates[2].group, candidates[3].group);
    assert.equal(candidates[4].label, 'Signature');
    const withoutDigitalLabels = detectGeometryFields(shapes);
    assert.equal(withoutDigitalLabels.length, 4);
    assert.equal(withoutDigitalLabels.filter((candidate) => candidate.kind === 'radio').length, 2);
  } finally {
    await task.destroy();
  }
});
