import type { FieldCandidate } from '@formflow/core';

export type NativePdfWidgetKind = 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';

export interface NativePdfWidget {
  name: string;
  pageNumber: number;
  kind: NativePdfWidgetKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfWidgetAnnotation {
  subtype?: string;
  fieldName?: unknown;
  rect?: unknown;
  hidden?: boolean;
  checkBox?: boolean;
  radioButton?: boolean;
  fieldType?: string;
}

export interface PdfViewportPointConverter {
  convertToViewportPoint(x: number, y: number): number[];
}

/** Converts PDF.js widget annotations into page-space rectangles. */
export function extractNativeWidgets(
  annotations: PdfWidgetAnnotation[],
  viewport: PdfViewportPointConverter,
  pageNumber: number
): NativePdfWidget[] {
  return annotations.flatMap((annotation) => {
    if (annotation.subtype !== 'Widget' ||
        typeof annotation.fieldName !== 'string' ||
        !Array.isArray(annotation.rect) ||
        annotation.rect.length < 4 ||
        annotation.hidden) return [];

    const coordinates = annotation.rect;
    if (!coordinates.slice(0, 4).every((value) => typeof value === 'number' && Number.isFinite(value))) return [];
    const first = viewport.convertToViewportPoint(coordinates[0], coordinates[1]);
    const second = viewport.convertToViewportPoint(coordinates[2], coordinates[3]);
    const left = Math.min(first[0], second[0]);
    const top = Math.min(first[1], second[1]);
    const width = Math.abs(second[0] - first[0]);
    const height = Math.abs(second[1] - first[1]);
    if (width < 2 || height < 2) return [];

    const kind: NativePdfWidgetKind = annotation.checkBox ? 'checkbox'
      : annotation.radioButton ? 'radio'
      : annotation.fieldType === 'Tx' ? 'text'
      : annotation.fieldType === 'Ch' ? 'dropdown' : 'other';

    return [{
      name: annotation.fieldName,
      pageNumber,
      kind,
      x: left,
      y: top,
      width,
      height
    }];
  });
}

/**
 * Excludes duplicate field outlines and local-coordinate appearance streams
 * emitted for existing AcroForm widgets by some PDF producers.
 */
export function filterWidgetArtifacts(
  candidates: FieldCandidate[],
  widgets: NativePdfWidget[],
  pageWidth: number,
  pageHeight: number
): FieldCandidate[] {
  return candidates.filter((candidate) => !widgets.some((widget) => {
    const intersectionWidth = Math.max(0,
      Math.min(candidate.x + candidate.width, widget.x + widget.width) -
      Math.max(candidate.x, widget.x));
    const intersectionHeight = Math.max(0,
      Math.min(candidate.y + candidate.height, widget.y + widget.height) -
      Math.max(candidate.y, widget.y));
    const overlap = intersectionWidth * intersectionHeight /
      Math.max(1, Math.min(candidate.width * candidate.height, widget.width * widget.height));
    if (overlap >= 0.45) return true;

    const directSizeMatch = Math.abs(candidate.width - widget.width) <= 3 &&
      Math.abs(candidate.height - widget.height) <= 3;
    const rotatedSizeMatch = Math.abs(candidate.width - widget.height) <= 3 &&
      Math.abs(candidate.height - widget.width) <= 3;
    const nearPageEdge = candidate.x <= 2 || candidate.y <= 2 ||
      candidate.x + candidate.width >= pageWidth - 2 ||
      candidate.y + candidate.height >= pageHeight - 2;
    return nearPageEdge && (directSizeMatch || rotatedSizeMatch);
  }));
}
