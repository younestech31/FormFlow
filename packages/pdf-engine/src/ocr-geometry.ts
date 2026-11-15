import type { TextFragment } from '@formflow/core';

export interface OcrLineLike {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export function mapOcrLinesToTextFragments(
  lines: readonly OcrLineLike[],
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  renderScale: number
): TextFragment[] {
  if (!Number.isFinite(renderScale) || renderScale <= 0) {
    throw new Error('OCR render scale must be a positive finite number.');
  }

  return lines.flatMap((line, index) => {
    const text = line.text.trim();
    const x0 = Math.min(line.bbox.x0, line.bbox.x1) / renderScale;
    const y0 = Math.min(line.bbox.y0, line.bbox.y1) / renderScale;
    const x1 = Math.max(line.bbox.x0, line.bbox.x1) / renderScale;
    const y1 = Math.max(line.bbox.y0, line.bbox.y1) / renderScale;
    const left = Math.max(0, Math.min(pageWidth, x0));
    const top = Math.max(0, Math.min(pageHeight, y0));
    const right = Math.max(left, Math.min(pageWidth, x1));
    const bottom = Math.max(top, Math.min(pageHeight, y1));
    if (!text || right - left < 0.5 || bottom - top < 0.5) return [];

    return [{
      id: `ocr-${pageNumber}-${index + 1}`,
      text,
      pageNumber,
      pageWidth,
      pageHeight,
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
      source: 'ocr',
      confidence: Math.max(0, Math.min(1, line.confidence / 100))
    }];
  });
}
