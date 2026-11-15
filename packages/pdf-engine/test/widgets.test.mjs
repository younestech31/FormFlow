import test from 'node:test';
import assert from 'node:assert/strict';
import { extractNativeWidgets, filterWidgetArtifacts } from '../src/widgets.ts';

const viewport = {
  convertToViewportPoint(x, y) {
    return [x, 800 - y];
  }
};

test('extracts native PDF field widgets and converts their rectangles to page coordinates', () => {
  const annotations = [
    { subtype: 'Widget', fieldName: 'person.name', fieldType: 'Tx', rect: [100, 500, 300, 525] },
    { subtype: 'Widget', fieldName: 'person.accepted', fieldType: 'Btn', checkBox: true, rect: [40, 450, 54, 464] },
    { subtype: 'Widget', fieldName: 'person.gender', fieldType: 'Btn', radioButton: true, rect: [80, 450, 94, 464] },
    { subtype: 'Widget', fieldName: 'person.region', fieldType: 'Ch', rect: [100, 410, 240, 435] }
  ];
  const widgets = extractNativeWidgets(annotations, viewport, 2);
  assert.deepEqual(widgets.map((widget) => widget.kind), ['text', 'checkbox', 'radio', 'dropdown']);
  assert.deepEqual(
    [widgets[0].pageNumber, widgets[0].x, widgets[0].y, widgets[0].width, widgets[0].height],
    [2, 100, 275, 200, 25]
  );
});

test('ignores non-widget annotations, hidden widgets, and invalid rectangles', () => {
  const annotations = [
    { subtype: 'Link', fieldName: 'link', rect: [1, 1, 20, 20] },
    { subtype: 'Widget', fieldName: 'hidden', hidden: true, rect: [1, 1, 20, 20] },
    { subtype: 'Widget', fieldName: 'bad', rect: [1, 2, 'bad', 4] },
    { subtype: 'Widget', fieldName: 'tiny', rect: [1, 1, 2, 2] }
  ];
  assert.deepEqual(extractNativeWidgets(annotations, viewport, 1), []);
});

test('filters widget appearance paths emitted in local coordinates at the page edge', () => {
  const widget = {
    name: 'person.name', pageNumber: 1, kind: 'text',
    x: 400, y: 65, width: 150, height: 29
  };
  const geometry = [
    {
      id: 'widget-appearance', label: '', kind: 'text', pageNumber: 1,
      x: 0.5, y: 813.5, width: 150, height: 28, confidence: 0.54, method: 'geometry'
    },
    {
      id: 'real-field', label: 'Address', kind: 'text', pageNumber: 1,
      x: 100, y: 300, width: 200, height: 28, confidence: 0.82, method: 'geometry'
    }
  ];
  const filtered = filterWidgetArtifacts(geometry, [widget], 600, 842);
  assert.deepEqual(filtered.map((candidate) => candidate.id), ['real-field']);
});
