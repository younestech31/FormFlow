import type { FieldCandidate, TextFragment, VectorShape } from './types';

function stableId(fragment: TextFragment, index: number) {
  return 'candidate-' + fragment.pageNumber + '-' + Math.round(fragment.x) + '-' + index;
}

/** Conservative heuristic: suggests a text field after a short fragment ending in a colon. */
export function detectLabelAnchors(fragments: TextFragment[]): FieldCandidate[] {
  return fragments
    .filter((fragment) => /^[^\n]{1,90}[:：]\s*$/.test(fragment.text.trim()))
    .map((fragment, index) => {
      const label = fragment.text.trim().replace(/[:：]\s*$/, '').trim();
      const isArabicLabel = /[\u0600-\u06FF]/.test(label);
      const leftWidth = Math.min(240, Math.max(0, fragment.x - 32));
      const x = isArabicLabel
        ? Math.max(0, fragment.x - leftWidth - 8)
        : fragment.x + fragment.width + 8;
      const width = isArabicLabel ? leftWidth : Math.max(0, fragment.pageWidth - x - 24);
      return {
        id: stableId(fragment, index), label, kind: 'text' as const,
        pageNumber: fragment.pageNumber, x, y: Math.max(0, fragment.y - 2),
        width, height: Math.max(22, fragment.height + 8), confidence: 0.35,
        method: 'label-anchor' as const
      };
    })
    .filter((candidate) => candidate.label.length > 0 && candidate.width >= 48);
}

function findNearbyLabel(shape: VectorShape, fragments: TextFragment[]): string {
  const candidates = fragments
    .filter((fragment) => fragment.pageNumber === shape.pageNumber)
    .map((fragment) => {
      const right = fragment.x + fragment.width;
      const bottom = fragment.y + fragment.height;
      const verticalOverlap = Math.max(0, Math.min(bottom, shape.y + shape.height) - Math.max(fragment.y, shape.y));
      const overlapRatio = verticalOverlap / Math.max(1, Math.min(fragment.height, Math.max(shape.height, 1)));
      const gap = shape.x - right;
      const rightGap = fragment.x - (shape.x + shape.width);
      const isLeftLabel = gap >= -8 && gap <= 150 && overlapRatio >= 0.25;
      const isRightLabel = rightGap >= -8 && rightGap <= 150 && overlapRatio >= 0.25;
      const belowGap = shape.y - bottom;
      const horizontalOverlap = Math.max(0, Math.min(right, shape.x + shape.width) - Math.max(fragment.x, shape.x));
      const isTopLabel = belowGap >= -8 && belowGap <= 32 && horizontalOverlap >= Math.min(fragment.width, shape.width) * 0.35;
      if (!isLeftLabel && !isRightLabel && !isTopLabel) return null;
      const distance = isLeftLabel ? Math.max(0, gap)
        : isRightLabel ? Math.max(0, rightGap)
        : Math.max(0, belowGap) + 20;
      return { text: fragment.text.trim().replace(/[:：]\s*$/, '').trim(), distance };
    })
    .filter((item): item is { text: string; distance: number } => Boolean(item?.text))
    .sort((a, b) => a.distance - b.distance);
  return candidates[0]?.text ?? '';
}

/**
 * Finds likely empty form controls from vector geometry. This does not read text
 * embedded in scanned page images; it only classifies explicit PDF paths.
 */
export function detectGeometryFields(
  shapes: VectorShape[],
  fragments: TextFragment[] = []
): FieldCandidate[] {
  const candidates: FieldCandidate[] = [];
  for (const shape of shapes) {
    if (shape.width <= 0 || (shape.height <= 0 && shape.kind !== 'line')) continue;
    if (shape.width >= shape.pageWidth * 0.92 && shape.height >= shape.pageHeight * 0.92) continue;

    let kind: FieldCandidate['kind'] | null = null;
    let x = shape.x;
    let y = shape.y;
    let width = shape.width;
    let height = shape.height;
    let confidence = 0;

    if (shape.kind === 'rectangle' && shape.closed) {
      const ratio = width / height;
      if (width >= 9 && width <= 34 && height >= 9 && height <= 34 && ratio >= 0.72 && ratio <= 1.38) {
        kind = 'checkbox';
        confidence = 0.78;
      } else if (width >= 55 && width <= shape.pageWidth * 0.88 && height >= 13 && height <= 70 && ratio >= 1.8) {
        kind = 'text';
        confidence = 0.7;
      }
    } else if (shape.kind === 'line' && width >= 60 && height <= 2.5) {
      kind = 'text';
      height = 24;
      y = Math.max(0, y - height);
      confidence = 0.58;
    }

    if (!kind) continue;
    const label = findNearbyLabel(shape, fragments);
    const id = 'geometry-' + shape.pageNumber + '-' + Math.round(shape.x) + '-' + Math.round(shape.y) + '-' + candidates.length;
    candidates.push({
      id, label, kind, pageNumber: shape.pageNumber, x, y, width, height,
      confidence, method: 'geometry'
    });
  }

  // Suppress near-identical detections caused by adjacent or overlapping PDF paths.
  return candidates.filter((candidate, index) => {
    const duplicate = candidates.slice(0, index).some((prior) => {
      if (prior.pageNumber !== candidate.pageNumber || prior.kind !== candidate.kind) return false;
      const intersectionWidth = Math.max(0, Math.min(prior.x + prior.width, candidate.x + candidate.width) - Math.max(prior.x, candidate.x));
      const intersectionHeight = Math.max(0, Math.min(prior.y + prior.height, candidate.y + candidate.height) - Math.max(prior.y, candidate.y));
      const intersection = intersectionWidth * intersectionHeight;
      const smaller = Math.min(prior.width * prior.height, candidate.width * candidate.height);
      return smaller > 0 && intersection / smaller > 0.82;
    });
    return !duplicate;
  }).slice(0, 120);
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
