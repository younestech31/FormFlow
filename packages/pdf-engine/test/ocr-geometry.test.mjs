import test from 'node:test';
import assert from 'node:assert/strict';
import { mapOcrLinesToTextFragments } from '../src/ocr-geometry.ts';

test('maps OCR line boxes from rendered pixels into PDF point coordinates', () => {
  const [fragment] = mapOcrLinesToTextFragments([{
    text: 'رقم التعريف الوطني',
    confidence: 87.5,
    bbox: { x0: 200, y0: 100, x1: 500, y1: 150 }
  }], 2, 600, 800, 2);

  assert.deepEqual(
    {
      text: fragment.text,
      pageNumber: fragment.pageNumber,
      x: fragment.x,
      y: fragment.y,
      width: fragment.width,
      height: fragment.height,
      source: fragment.source,
      confidence: fragment.confidence
    },
    {
      text: 'رقم التعريف الوطني',
      pageNumber: 2,
      x: 100,
      y: 50,
      width: 150,
      height: 25,
      source: 'ocr',
      confidence: 0.875
    }
  );
});

test('clamps OCR boxes to page bounds and drops empty or whitespace lines', () => {
  const fragments = mapOcrLinesToTextFragments([
    { text: ' خارج الصفحة ', confidence: 70, bbox: { x0: -20, y0: -5, x1: 80, y1: 30 } },
    { text: '   ', confidence: 99, bbox: { x0: 1, y0: 1, x1: 20, y1: 20 } },
    { text: 'invalid box', confidence: 90, bbox: { x0: 10, y0: 10, x1: 10, y1: 10 } }
  ], 1, 40, 20, 2);

  assert.equal(fragments.length, 1);
  assert.equal(fragments[0].x, 0);
  assert.equal(fragments[0].y, 0);
  assert.equal(fragments[0].width, 40);
  assert.equal(fragments[0].height, 15);
});

test('rejects invalid scale values instead of creating invalid geometry', () => {
  assert.throws(() => mapOcrLinesToTextFragments([], 1, 100, 100, 0), /positive finite number/);
  assert.throws(() => mapOcrLinesToTextFragments([], 1, 100, 100, Number.NaN), /positive finite number/);
});
