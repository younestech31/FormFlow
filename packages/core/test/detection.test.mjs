import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampFieldRectangle,
  detectGeometryFields,
  detectLabelAnchors,
  isEligibleForLabelMatching,
  OCR_LABEL_CONFIDENCE_THRESHOLD
} from '../src/detection.ts';

const page = { pageNumber: 1, pageWidth: 600, pageHeight: 800 };
const rectangle = {
  ...page, id: 'rectangle', kind: 'rectangle',
  x: 100, y: 270, width: 200, height: 30, closed: true
};
const checkbox = {
  ...page, id: 'checkbox', kind: 'rectangle',
  x: 40, y: 386, width: 14, height: 14, closed: true
};
const underline = {
  ...page, id: 'underline', kind: 'line',
  x: 90, y: 500, width: 250, height: 0, closed: false
};

test('detects outlined text fields and square checkboxes but ignores unlabelled rules', () => {
  const candidates = detectGeometryFields([rectangle, checkbox, underline]);
  assert.deepEqual(candidates.map((candidate) => candidate.kind), ['text', 'checkbox']);
  assert.ok(candidates[0].confidence >= 0.5);
});

test('attaches an adjacent left-to-right digital text label', () => {
  const fragments = [{
    ...page, id: 'label', text: 'Name:', x: 30, y: 278, width: 54, height: 12
  }];
  const candidates = detectGeometryFields([rectangle], fragments);
  assert.equal(candidates[0].label, 'Name');
  assert.ok(candidates[0].confidence > 0.8);
});

test('attaches a right-side Arabic label to a geometric field', () => {
  const fragments = [{
    ...page, id: 'label-ar', text: 'الاسم:', x: 330, y: 278, width: 56, height: 12
  }];
  const candidates = detectGeometryFields([rectangle], fragments);
  assert.equal(candidates[0].label, 'الاسم');
});

test('reconstructs split text runs before identifying labels', () => {
  const fragments = [
    { ...page, id: 'nom', text: 'Nom', x: 30, y: 278, width: 26, height: 12 },
    { ...page, id: 'colon', text: ':', x: 58, y: 278, width: 3, height: 12 }
  ];
  const candidates = detectLabelAnchors(fragments);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].label, 'Nom');
});

test('recognizes common label words without a trailing colon in French and Arabic', () => {
  const french = detectLabelAnchors([{
    ...page, id: 'french', text: 'Date de naissance', x: 30, y: 100, width: 105, height: 12
  }]);
  const arabic = detectLabelAnchors([{
    ...page, id: 'arabic', text: 'رقم الهاتف', x: 400, y: 150, width: 70, height: 14
  }]);
  assert.equal(french[0].label, 'Date de naissance');
  assert.equal(arabic[0].label, 'رقم الهاتف');
  assert.ok(arabic[0].x < 400);
});

test('joins split Arabic words in right-to-left reading order', () => {
  const fragments = [
    { ...page, id: 'phone', text: 'الهاتف', x: 330, y: 160, width: 42, height: 12 },
    { ...page, id: 'number', text: 'رقم', x: 385, y: 160, width: 24, height: 12 }
  ];
  const candidate = detectLabelAnchors(fragments)[0];
  assert.equal(candidate.label, 'رقم الهاتف');
  assert.ok(candidate.x < 330);
});

test('bounds inferred field width before the next label instead of spanning the page', () => {
  const fragments = [
    { ...page, id: 'name', text: 'Name:', x: 30, y: 100, width: 42, height: 12 },
    { ...page, id: 'age', text: 'Age:', x: 180, y: 100, width: 32, height: 12 }
  ];
  const candidates = detectLabelAnchors(fragments);
  const name = candidates.find((candidate) => candidate.label === 'Name');
  assert.ok(name);
  assert.ok(name.width < 100);
  assert.ok(name.x + name.width < 180);
});

test('does not create a label-only field when an existing geometric field occupies the area', () => {
  const fragments = [{
    ...page, id: 'name', text: 'Name:', x: 30, y: 278, width: 54, height: 12
  }];
  const geometry = detectGeometryFields([rectangle], fragments);
  assert.equal(detectLabelAnchors(fragments, geometry).length, 0);
});

test('detects a labelled underline as a field and rejects an unlabelled decorative line', () => {
  const labelled = detectGeometryFields([underline], [{
    ...page, id: 'signature-label', text: 'Signature:', x: 25, y: 489, width: 56, height: 12
  }]);
  assert.equal(labelled.length, 1);
  assert.equal(labelled[0].label, 'Signature');
  assert.equal(labelled[0].y, 478);
  assert.equal(labelled[0].height, 21);
  assert.equal(detectGeometryFields([underline]).length, 0);
});

test('recognizes Arabic labels to the right of writing lines', () => {
  const line = { ...underline, x: 60, y: 500, width: 220 };
  const result = detectGeometryFields([line], [{
    ...page, id: 'arabic-signature', text: 'التوقيع:', x: 300, y: 489, width: 58, height: 12
  }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].label, 'التوقيع');
});

test('reconstructs empty table cells from separate horizontal and vertical rules', () => {
  const grid = [];
  for (const y of [100, 130, 160]) {
    grid.push({ ...page, id: 'h-' + y, kind: 'line', x: 50, y, width: 250, height: 0, closed: false });
  }
  for (const x of [50, 180, 300]) {
    grid.push({ ...page, id: 'v-' + x, kind: 'line', x, y: 100, width: 0, height: 60, closed: false });
  }
  const text = [
    { ...page, id: 'name-row-1', text: 'Nom', x: 60, y: 108, width: 32, height: 12 },
    { ...page, id: 'name-row-2', text: 'Adresse', x: 60, y: 138, width: 52, height: 12 }
  ];
  const candidates = detectGeometryFields(grid, text);
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map((candidate) => candidate.label), ['Nom', 'Adresse']);
  assert.ok(candidates.every((candidate) => candidate.x >= 180 && candidate.kind === 'text'));
});

test('does not treat text-filled table cells as empty inputs', () => {
  const grid = [];
  for (const y of [100, 130]) {
    grid.push({ ...page, id: 'h-' + y, kind: 'line', x: 50, y, width: 130, height: 0, closed: false });
  }
  for (const x of [50, 180]) {
    grid.push({ ...page, id: 'v-' + x, kind: 'line', x, y: 100, width: 0, height: 30, closed: false });
  }
  const candidates = detectGeometryFields(grid, [{
    ...page, id: 'cell-text', text: 'Existing value', x: 60, y: 108, width: 80, height: 12
  }]);
  assert.equal(candidates.length, 0);
});

test('deduplicates a rectangle and the grid cell reconstructed at the same position', () => {
  const grid = [];
  for (const y of [100, 130]) {
    grid.push({ ...page, id: 'h-' + y, kind: 'line', x: 50, y, width: 250, height: 0, closed: false });
  }
  for (const x of [50, 180, 300]) {
    grid.push({ ...page, id: 'v-' + x, kind: 'line', x, y: 100, width: 0, height: 30, closed: false });
  }
  const explicit = {
    ...page, id: 'explicit-cell', kind: 'rectangle',
    x: 180, y: 100, width: 120, height: 30, closed: true
  };
  const text = [{ ...page, id: 'label', text: 'Name:', x: 60, y: 108, width: 40, height: 12 }];
  const candidates = detectGeometryFields([...grid, explicit], text);
  assert.equal(candidates.length, 1);
});

test('infers date and signature field types from labels', () => {
  const date = detectLabelAnchors([{
    ...page, id: 'birth-date', text: 'Date de naissance:', x: 30, y: 100, width: 110, height: 12
  }])[0];
  const signature = detectLabelAnchors([{
    ...page, id: 'signature', text: 'التوقيع:', x: 400, y: 150, width: 60, height: 14
  }])[0];
  assert.equal(date.kind, 'date');
  assert.equal(signature.kind, 'signature');
});

test('classifies tall outlined writing areas as multiline fields', () => {
  const tall = {
    ...page, id: 'remarks', kind: 'rectangle', x: 80, y: 240,
    width: 360, height: 120, closed: true
  };
  const candidates = detectGeometryFields([tall], [{
    ...page, id: 'remarks-label', text: 'Observations:', x: 80, y: 218, width: 75, height: 12
  }]);
  assert.equal(candidates[0].kind, 'multiline');
});

test('does not attach a label from the row above to a checkbox', () => {
  const checkbox = {
    ...page, id: 'checkbox', kind: 'rectangle', x: 60, y: 400,
    width: 14, height: 14, closed: true
  };
  const fragments = [
    { ...page, id: 'above', text: 'Commune', x: 62, y: 450, width: 48, height: 12 },
    { ...page, id: 'yes', text: 'Yes', x: 82, y: 402, width: 18, height: 10 }
  ];
  const candidate = detectGeometryFields([checkbox], fragments)[0];
  assert.equal(candidate.kind, 'checkbox');
  assert.equal(candidate.label, 'Yes');
});

test('groups aligned radio circles into one mutually exclusive choice group', () => {
  const circles = [
    { ...page, id: 'radio-a', kind: 'ellipse', x: 50, y: 200, width: 14, height: 14, closed: true },
    { ...page, id: 'radio-b', kind: 'ellipse', x: 110, y: 200, width: 14, height: 14, closed: true },
    { ...page, id: 'radio-c', kind: 'ellipse', x: 170, y: 200, width: 14, height: 14, closed: true }
  ];
  const candidates = detectGeometryFields(circles);
  assert.equal(candidates.length, 3);
  assert.ok(candidates.every((candidate) => candidate.kind === 'radio'));
  assert.equal(new Set(candidates.map((candidate) => candidate.group)).size, 1);
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


test('groups tightly packed identity-number cells into one labelled text field', () => {
  const cells = Array.from({ length: 18 }, (_, index) => ({
    ...page,
    id: 'nin-cell-' + index,
    kind: 'rectangle',
    x: 60 + index * 17,
    y: 300 + (index % 3 === 0 ? 0.4 : 0),
    width: 14,
    height: 16,
    closed: true
  }));
  const label = {
    ...page, id: 'nin-label', text: 'رقم التعريف الوطني:',
    x: 372, y: 302, width: 124, height: 12
  };

  const candidates = detectGeometryFields(cells, [label]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, 'text');
  assert.equal(candidates[0].label, 'رقم التعريف الوطني');
  assert.equal(candidates[0].x, 60);
  assert.equal(candidates[0].width, 14 * 18 + 3 * 17);
  assert.ok(candidates[0].confidence >= 0.9);
});

test('groups French registration-number boxes and preserves date semantics', () => {
  const cells = Array.from({ length: 8 }, (_, index) => ({
    ...page,
    id: 'date-cell-' + index,
    kind: 'rectangle',
    x: 150 + index * 17,
    y: 300,
    width: 14,
    height: 16,
    closed: true
  }));
  const label = {
    ...page, id: 'date-label', text: 'Date de naissance :',
    x: 32, y: 302, width: 105, height: 12
  };

  const candidates = detectGeometryFields(cells, [label]);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].kind, 'date');
  assert.equal(candidates[0].label, 'Date de naissance');
});

test('does not merge spaced checkbox options into a segmented text field', () => {
  const choices = Array.from({ length: 4 }, (_, index) => ({
    ...page,
    id: 'choice-' + index,
    kind: 'rectangle',
    x: 30 + index * 44,
    y: 300,
    width: 14,
    height: 14,
    closed: true
  }));

  const candidates = detectGeometryFields(choices);
  assert.equal(candidates.length, 4);
  assert.ok(candidates.every((candidate) => candidate.kind === 'checkbox'));
});

test('keeps tightly packed gender choices as checkboxes instead of a digit field', () => {
  const choices = Array.from({ length: 4 }, (_, index) => ({
    ...page,
    id: 'gender-choice-' + index,
    kind: 'rectangle',
    x: 90 + index * 17,
    y: 300,
    width: 14,
    height: 14,
    closed: true
  }));
  const label = {
    ...page, id: 'gender-label', text: 'Genre :',
    x: 35, y: 302, width: 42, height: 12
  };

  const candidates = detectGeometryFields(choices, [label]);
  assert.equal(candidates.length, 4);
  assert.ok(candidates.every((candidate) => candidate.kind === 'checkbox'));
});

test('does not suggest filled digit cells as empty checkboxes or text fields', () => {
  const cells = Array.from({ length: 8 }, (_, index) => ({
    ...page,
    id: 'filled-cell-' + index,
    kind: 'rectangle',
    x: 150 + index * 17,
    y: 300,
    width: 14,
    height: 16,
    closed: true
  }));
  const label = {
    ...page, id: 'registration-label', text: 'N° d’identification :',
    x: 24, y: 302, width: 116, height: 12
  };
  const printedDigit = {
    ...page, id: 'printed-digit', text: '4',
    x: 154, y: 303, width: 5, height: 9
  };

  assert.deepEqual(detectGeometryFields(cells, [label, printedDigit]), []);
});

test('keeps a long unlabelled segmented sequence as one lower-confidence suggestion', () => {
  const cells = Array.from({ length: 6 }, (_, index) => ({
    ...page,
    id: 'anonymous-cell-' + index,
    kind: 'rectangle',
    x: 100 + index * 17,
    y: 300,
    width: 14,
    height: 16,
    closed: true
  }));

  const candidates = detectGeometryFields(cells);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].label, '');
  assert.equal(candidates[0].kind, 'text');
  assert.ok(candidates[0].confidence < 0.7);
});

test('never combines partial table edges from different PDF pages', () => {
  const partialShapes = [
    { ...page, id: 'page-one-top', kind: 'line', x: 100, y: 100, width: 130, height: 0, closed: false },
    { ...page, id: 'page-one-left', kind: 'line', x: 100, y: 100, width: 0, height: 40, closed: false },
    { ...page, pageNumber: 2, id: 'page-two-bottom', kind: 'line', x: 100, y: 140, width: 130, height: 0, closed: false },
    { ...page, pageNumber: 2, id: 'page-two-right', kind: 'line', x: 230, y: 100, width: 0, height: 40, closed: false }
  ];
  const label = {
    ...page, id: 'page-one-label', text: 'Name',
    x: 30, y: 108, width: 50, height: 12
  };

  const candidates = detectGeometryFields(partialShapes, [label]);
  assert.deepEqual(candidates.filter((candidate) => candidate.id.startsWith('grid-cell-')), []);
});


test('reconstructs complete tables independently on repeated pages', () => {
  const shapes = [];
  for (const pageNumber of [1, 2]) {
    for (const y of [200, 240]) {
      shapes.push({
        pageNumber, pageWidth: 600, pageHeight: 800,
        id: 'p' + pageNumber + '-h-' + y, kind: 'line',
        x: 100, y, width: 150, height: 0, closed: false
      });
    }
    for (const x of [100, 250]) {
      shapes.push({
        pageNumber, pageWidth: 600, pageHeight: 800,
        id: 'p' + pageNumber + '-v-' + x, kind: 'line',
        x, y: 200, width: 0, height: 40, closed: false
      });
    }
  }
  const text = [
    { ...page, pageNumber: 1, id: 'page-one-label', text: 'Name', x: 30, y: 210, width: 50, height: 12 },
    { ...page, pageNumber: 2, id: 'page-two-label', text: 'Address', x: 30, y: 210, width: 55, height: 12 }
  ];

  const candidates = detectGeometryFields(shapes, text)
    .filter((candidate) => candidate.id.startsWith('grid-cell-'));
  assert.equal(candidates.length, 2);
  assert.deepEqual(candidates.map((candidate) => candidate.pageNumber), [1, 2]);
  assert.deepEqual(candidates.map((candidate) => candidate.label), ['Name', 'Address']);
});


test('keeps low-confidence OCR out of automatic labels until a user reviews the text', () => {
  assert.equal(OCR_LABEL_CONFIDENCE_THRESHOLD, 0.45);
  assert.equal(isEligibleForLabelMatching({ source: 'ocr', confidence: 0.44 }), false);
  assert.equal(isEligibleForLabelMatching({ source: 'ocr', confidence: 0.44, reviewed: true }), true);
  assert.equal(isEligibleForLabelMatching({ source: 'ocr', confidence: 0.45 }), true);
  assert.equal(isEligibleForLabelMatching({ source: 'pdf' }), true);
  assert.equal(isEligibleForLabelMatching({}), true);
});
