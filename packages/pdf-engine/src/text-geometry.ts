import type { TextFragment } from '@formflow/core';

export interface PdfTextItemLike {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export interface TextViewport {
  convertToViewportPoint(x: number, y: number): number[];
}

/**
 * Converts PDF.js text runs into axis-aligned page-space bounds. Using both
 * text-matrix axes keeps the bounds correct for rotated and skewed text runs.
 */
export function mapPdfTextItem(
  item: PdfTextItemLike,
  index: number,
  pageNumber: number,
  pageWidth: number,
  pageHeight: number,
  viewport: TextViewport
): TextFragment {
  const transform = item.transform;
  const baselineLength = Math.hypot(transform[0], transform[1]) || 1;
  const verticalLength = Math.hypot(transform[2], transform[3]) || 1;
  const width = Math.max(0, item.width);
  const height = Math.max(1, item.height || verticalLength);
  const ux = transform[0] / baselineLength;
  const uy = transform[1] / baselineLength;
  const vx = transform[2] / verticalLength;
  const vy = transform[3] / verticalLength;
  const originX = transform[4];
  const originY = transform[5];
  const corners = [
    [originX, originY],
    [originX + ux * width, originY + uy * width],
    [originX + vx * height, originY + vy * height],
    [originX + ux * width + vx * height, originY + uy * width + vy * height]
  ].map(([x, y]) => viewport.convertToViewportPoint(x, y));
  const xs = corners.map(([x]) => x);
  const ys = corners.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);

  return {
    id: 'p' + pageNumber + '-t' + index,
    text: item.str,
    pageNumber,
    pageWidth,
    pageHeight,
    x: left,
    y: top,
    width: Math.max(0, Math.max(...xs) - left),
    height: Math.max(1, Math.max(...ys) - top)
  };
}
