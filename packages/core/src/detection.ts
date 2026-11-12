import type { FieldCandidate, TextFragment } from './types';

function stableId(fragment: TextFragment, index: number) {
  return 'candidate-' + fragment.pageNumber + '-' + Math.round(fragment.x) + '-' + index;
}

/** Conservative heuristic: suggests a text field after a short fragment ending in a colon. */
export function detectLabelAnchors(fragments: TextFragment[]): FieldCandidate[] {
  return fragments
    .filter((fragment) => /^[^\n]{1,90}[:：]\s*$/.test(fragment.text.trim()))
    .map((fragment, index) => {
      const label = fragment.text.trim().replace(/[:：]\s*$/, '');
      const x = fragment.x + fragment.width + 8;
      return {
        id: stableId(fragment, index), label, kind: 'text' as const,
        pageNumber: fragment.pageNumber, x, y: Math.max(0, fragment.y - 2),
        width: Math.max(0, fragment.pageWidth - x - 24),
        height: Math.max(22, fragment.height + 8), confidence: 0.35,
        method: 'label-anchor' as const
      };
    })
    .filter((candidate) => candidate.label.length > 0 && candidate.width >= 48);
}

export function clampFieldRectangle(
  rectangle: { x: number; y: number; width: number; height: number },
  page: { width: number; height: number }
) {
  const width = Math.min(Math.max(8, rectangle.width), page.width);
  const height = Math.min(Math.max(8, rectangle.height), page.height);
  return {
    x: Math.min(Math.max(0, rectangle.x), Math.max(0, page.width - width)),
    y: Math.min(Math.max(0, rectangle.y), Math.max(0, page.height - height)),
    width, height
  };
}
