import test from 'node:test';
import assert from 'node:assert/strict';
import { clampFieldRectangle, detectGeometryFields, detectLabelAnchors } from '../src/detection.ts';

const page = { pageNumber: 1, pageWidth: 600, pageHeight: 800 };
const shapes = [
  { ...page, id: 'rectangle', kind: 'rectangle', x: 100, y: 270, width: 200, height: 30, closed: true },
  { ...page, id: 'checkbox', kind: 'rectangle', x: 40, y: 386, width: 14, height: 14, closed: true },
  { ...page, id: 'underline', kind: 'line', x: 50, y: 500, width: 250, height: 0, closed: false }
];

test('detects rectangular fields, square checkboxes, and horizontal rules', () => {
  const candidates = detectGeometryFields(shapes);
  assert.deepEqual(candidates.map((candidate) => candidate.kind), ['text', 'checkbox', 'text']);
  assert.equal(candidates[2].y, 476);
  assert.equal(candidates[2].height, 24);
});

test('attaches an adjacent left-to-right digital text label', () => {
  const fragments = [{ ...page, id: 'label', text: 'Name:', x: 30, y: 278, width: 54, height: 12 }];
  const candidates = detectGeometryFields([shapes[0]], fragments);
  assert.equal(candidates[0].label, 'Name');
});

test('attaches a right-side Arabic label to a geometric field', () => {
  const fragments = [{ ...page, id: 'label-ar', text: 'الاسم:', x: 330, y: 278, width: 56, height: 12 }];
  const candidates = detectGeometryFields([shapes[0]], fragments);
  assert.equal(candidates[0].label, 'الاسم');
});

test('places label-only suggestions to the left for Arabic labels', () => {
  const fragments = [{ ...page, id: 'label-ar', text: 'الاسم:', x: 400, y: 278, width: 56, height: 12 }];
  const candidate = detectLabelAnchors(fragments)[0];
  assert.ok(candidate.x < 400);
  assert.ok(candidate.width >= 48);
});

test('ignores page frames and non-horizontal decorative lines', () => {
  const noise = [
    { ...page, id: 'frame', kind: 'rectangle', x: 5, y: 5, width: 590, height: 790, closed: true },
    { ...page, id: 'vertical', kind: 'line', x: 50, y: 100, width: 0, height: 140, closed: false }
  ];
  assert.equal(detectGeometryFields(noise).length, 0);
});

test('clamps dragged and resized fields to the page boundaries', () => {
  assert.deepEqual(
    clampFieldRectangle({ x: -20, y: 790, width: 240, height: 30 }, { width: 600, height: 800 }),
    { x: 0, y: 770, width: 240, height: 30 }
  );
});
