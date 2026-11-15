import test from 'node:test';
import assert from 'node:assert/strict';
import { getPdfRenderScale } from '../src/render-scale.ts';

test('renders at a density-aware scale for sharp desktop previews', () => {
  const scale = getPdfRenderScale(595, 842, 900, 2);
  assert.ok(scale > 2.5 && scale <= 4);
});

test('keeps preview raster dimensions within a safe memory budget for large pages', () => {
  const scale = getPdfRenderScale(5000, 7000, 1200, 3);
  assert.ok(scale < 1);
  assert.ok(5000 * 7000 * scale * scale <= 8_000_000 + 1);
  assert.ok(7000 * scale <= 4096 + 1);
});

test('keeps at least native resolution when the display is smaller than the PDF page', () => {
  assert.equal(getPdfRenderScale(595, 842, 250, 1), 1);
});

test('rejects invalid page dimensions', () => {
  assert.throws(() => getPdfRenderScale(0, 842, 600, 2), RangeError);
  assert.throws(() => getPdfRenderScale(595, 842, Number.NaN, 2), RangeError);
});
