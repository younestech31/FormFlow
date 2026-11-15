import test from 'node:test';
import assert from 'node:assert/strict';
import { mapPdfTextItem } from '../src/text-geometry.ts';

const viewport = {
  convertToViewportPoint(x, y) {
    return [x, 800 - y];
  }
};

test('maps horizontal PDF.js text runs into the expected top-left page bounds', () => {
  const fragment = mapPdfTextItem({
    str: 'Nom :',
    transform: [10, 0, 0, 10, 100, 500],
    width: 40,
    height: 10
  }, 2, 1, 600, 800, viewport);
  assert.deepEqual(
    [fragment.x, fragment.y, fragment.width, fragment.height],
    [100, 290, 40, 10]
  );
  assert.equal(fragment.text, 'Nom :');
});

test('maps rotated text runs using both text-matrix axes', () => {
  const fragment = mapPdfTextItem({
    str: 'Vertical',
    transform: [0, 10, -10, 0, 300, 500],
    width: 40,
    height: 10
  }, 0, 3, 600, 800, viewport);
  assert.deepEqual(
    [fragment.x, fragment.y, fragment.width, fragment.height],
    [290, 260, 10, 40]
  );
  assert.equal(fragment.pageNumber, 3);
});
