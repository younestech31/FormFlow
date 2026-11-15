import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import { detectGeometryFields } from '@formflow/core';
import type { FieldCandidate, TextFragment } from '@formflow/core';
import { extractVectorShapes } from './vector-geometry';
import { extractNativeWidgets, filterWidgetArtifacts, type NativePdfWidget } from './widgets';
import { mapPdfTextItem } from './text-geometry';

GlobalWorkerOptions.workerSrc = workerUrl;
export interface PdfPageInspection {
  pageNumber: number; width: number; height: number; textItems: TextFragment[];
  geometryShapeCount: number; geometryCandidates: FieldCandidate[];
  nativeWidgets: NativePdfWidget[];
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
      const page = await pdfJsDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const textItems: TextFragment[] = [];
      content.items.forEach((item, index) => {
        if (!('str' in item) || typeof item.str !== 'string' || !item.str.trim()) return;
        textItems.push(mapPdfTextItem(item, index, pageNumber, viewport.width, viewport.height, viewport));
      });
      const annotations = await page.getAnnotations({ intent: 'display' });
      const nativeWidgets = extractNativeWidgets(annotations, viewport, pageNumber);
      const operatorList = await page.getOperatorList();
      const vectorShapes = extractVectorShapes(operatorList, pageNumber, viewport);
      const geometryCandidates = filterWidgetArtifacts(
        detectGeometryFields(vectorShapes, textItems), nativeWidgets,
        viewport.width, viewport.height
      );
      totalTextItems += textItems.length;
      pages.push({
        pageNumber, width: viewport.width, height: viewport.height, textItems,
        geometryShapeCount: vectorShapes.length, geometryCandidates, nativeWidgets
      });
    }
    const pdfLibDocument = await PDFDocument.load(bytes);
    const nativeFields = pdfLibDocument.getForm().getFields();
    const existingFieldNames = nativeFields.map((field) => field.getName());
    const existingFields: ExistingPdfField[] = nativeFields.map((field) => {
      if (field instanceof PDFTextField) return { name: field.getName(), kind: 'text' };
      if (field instanceof PDFCheckBox) return { name: field.getName(), kind: 'checkbox' };
      if (field instanceof PDFDropdown) return { name: field.getName(), kind: 'dropdown', options: field.getOptions() };
      if (field instanceof PDFRadioGroup) return { name: field.getName(), kind: 'radio', options: field.getOptions() };
      return { name: field.getName(), kind: 'other' };
    });
    return { pageCount: pdfJsDocument.numPages, textItemCount: totalTextItems, existingFieldNames, existingFields, pages };
  } finally {
    await loadingTask.destroy();
  }
}

export async function renderPdfPage(
  file: File,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1
): Promise<{ width: number; height: number }> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('A PDF file is required.');
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('Page numbers start at 1.');
  }
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError('PDF render scale must be a positive finite number.');
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const loadingTask = getDocument({ data: bytes.slice() });
  const document = await loadingTask.promise;
  try {
    if (pageNumber > document.numPages) throw new Error('Page number is out of range.');
    const page = await document.getPage(pageNumber);
    const logicalViewport = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is not available.');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvas, canvasContext: context, viewport }).promise;
    // Return page-space dimensions for the SVG overlay. The canvas itself uses
    // the larger backing resolution, but both layers share the same aspect ratio.
    return { width: logicalViewport.width, height: logicalViewport.height };
  } finally {
    await loadingTask.destroy();
  }
}

export async function fillExistingPdfFields(
  source: Uint8Array, values: Record<string, string | boolean>
): Promise<Uint8Array> {
  const document = await PDFDocument.load(source);
  const form = document.getForm();
  const fields = form.getFields();
  for (const [name, value] of Object.entries(values)) {
    const field = fields.find((candidate) => candidate.getName() === name);
    if (!field) continue;
    if (field instanceof PDFTextField && typeof value === 'string') field.setText(value);
    else if (field instanceof PDFCheckBox && typeof value === 'boolean') value ? field.check() : field.uncheck();
    else if (field instanceof PDFDropdown && typeof value === 'string') field.select(value);
    else if (field instanceof PDFRadioGroup && typeof value === 'string') field.select(value);
  }
  return document.save();
}