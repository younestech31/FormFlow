import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import { detectGeometryFields } from '@formflow/core';
import type { FieldCandidate, TextFragment } from '@formflow/core';
import { extractVectorShapes } from './vector-geometry';

GlobalWorkerOptions.workerSrc = workerUrl;
export interface PdfPageInspection {
  pageNumber: number; width: number; height: number; textItems: TextFragment[];
  geometryShapeCount: number; geometryCandidates: FieldCandidate[];
}
export interface ExistingPdfField {
  name: string;
  kind: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'other';
  options?: string[];
}

export interface PdfInspection {
  pageCount: number; textItemCount: number; existingFieldNames: string[];
  existingFields: ExistingPdfField[]; pages: PdfPageInspection[];
}

export async function inspectPdf(file: File): Promise<PdfInspection> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('A PDF file is required.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes.slice() });
  const pdfJsDocument = await loadingTask.promise;
  try {
    const pages: PdfPageInspection[] = [];
    let totalTextItems = 0;
    for (let pageNumber = 1; pageNumber <= pdfJsDocument.numPages; pageNumber += 1) {
      con¶»§q«^