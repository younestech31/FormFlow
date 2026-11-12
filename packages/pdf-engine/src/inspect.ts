import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField } from 'pdf-lib';
import type { TextFragment } from '@formflow/core';

GlobalWorkerOptions.workerSrc = workerUrl;
export interface PdfPageInspection { pageNumber: number; width: number; height: number; textItems: TextFragment[]; }
export interface PdfInspection {
  pageCount: number; textItemCount: number; existingFieldNames: string[]; pages: PdfPageInspection[];
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
        const transform = item.transform;
        const height = Math.max(1, Math.abs(transform[3]) || item.height || 10);
        textItems.push({
          id: 'p' + pageNumber + '-t' + index, text: item.str, pageNumber,
          pageWidth: viewport.width, pageHeight: viewport.height,
          x: transform[4], y: Math.max(0, viewport.height - transform[5] - height),
          width: Math.max(0, item.width), height
        });
      });
      totalTextItems += textItems.length;
      pages.push({ pageNumber, width: viewport.width, height: viewport.height, textItems });
    }
    const pdfLibDocument = await PDFDocument.load(bytes);
    const existingFieldNames = pdfLibDocument.getForm().getFields().map((field) => field.getName());
    return { pageCount: pdfJsDocument.numPages, textItemCount: totalTextItems, existingFieldNames, pages };
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
