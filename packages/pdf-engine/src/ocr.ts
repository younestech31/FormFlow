import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import Tesseract from 'tesseract.js';
import type { TextFragment } from '@formflow/core';
import { mapOcrLinesToTextFragments } from './ocr-geometry';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface PdfOcrProgress {
  status: string;
  progress: number;
  pageNumber: number;
}

export type OcrLanguageSet = 'ara+fra+eng' | 'ara+fra' | 'fra+eng';

export interface PdfOcrOptions {
  languages?: OcrLanguageSet;
  onProgress?: (progress: PdfOcrProgress) => void;
}

type OcrWorker = Awaited<ReturnType<typeof Tesseract.createWorker>>;
let workerPromise: Promise<OcrWorker> | undefined;
let workerLanguages: OcrLanguageSet | undefined;
let progressListener: PdfOcrOptions['onProgress'];
let recognitionQueue: Promise<void> = Promise.resolve();

async function getOcrWorker(languages: OcrLanguageSet): Promise<OcrWorker> {
  if (!workerPromise) {
    workerLanguages = languages;
    workerPromise = Tesseract.createWorker(languages, Tesseract.OEM.LSTM_ONLY, {
      workerPath: '/ocr/worker/worker.min.js',
      corePath: '/ocr/core',
      langPath: '/ocr/lang',
      workerBlobURL: false,
      gzip: true,
      cacheMethod: 'write',
      logger: (message) => {
        progressListener?.({
          status: message.status,
          progress: Math.max(0, Math.min(1, message.progress)),
          pageNumber: activePageNumber
        });
      }
    }).catch((error: unknown) => {
      workerPromise = undefined;
      workerLanguages = undefined;
      throw error;
    });
  }

  const worker = await workerPromise;
  if (workerLanguages !== languages) {
    await worker.reinitialize(languages, Tesseract.OEM.LSTM_ONLY);
    workerLanguages = languages;
  }
  return worker;
}

let activePageNumber = 1;

async function recognizePdfPageNow(
  file: File,
  pageNumber: number,
  options: PdfOcrOptions
): Promise<TextFragment[]> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('A PDF file is required for OCR.');
  }
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    throw new Error('The requested PDF page number is invalid.');
  }

  const documentTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  let canvas: HTMLCanvasElement | undefined;

  try {
    const pdf = await documentTask.promise;
    if (pageNumber > pdf.numPages) {
      throw new Error('The requested page does not exist in this PDF.');
    }

    activePageNumber = pageNumber;
    progressListener = options.onProgress;
    const worker = await getOcrWorker(options.languages ?? 'ara+fra+eng');
    const page = await pdf.getPage(pageNumber);
    const baseViewport = page.getViewport({ scale: 1 });
    // Approx. 220 DPI with an 2,800 px long-edge cap to control memory on office PCs.
    const scale = Math.min(220 / 72, 2800 / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });
    canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('Canvas rendering is not available in this browser.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: context, viewport, background: '#ffffff' }).promise;

    const recognized = await worker.recognize(canvas, {}, { blocks: true });
    const lines = (recognized.data.blocks ?? []).flatMap((block) =>
      block.paragraphs.flatMap((paragraph) => paragraph.lines)
    );

    return mapOcrLinesToTextFragments(
      lines,
      pageNumber,
      baseViewport.width,
      baseViewport.height,
      scale
    );
  } finally {
    progressListener = undefined;
    if (canvas) {
      canvas.width = 0;
      canvas.height = 0;
    }
    await documentTask.destroy();
  }
}

/**
 * Recognizes one selected PDF page. OCR requests are serialized through one
 * persistent worker so language data and the WASM engine are not reloaded for
 * every page. All source PDFs and rendered canvases remain in the browser.
 */
export function recognizePdfPage(
  file: File,
  pageNumber: number,
  options: PdfOcrOptions = {}
): Promise<TextFragment[]> {
  const operation = recognitionQueue.then(() => recognizePdfPageNow(file, pageNumber, options));
  recognitionQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

/** Releases the WASM worker when an application explicitly closes its OCR session. */
export async function terminatePdfOcrWorker(): Promise<void> {
  await recognitionQueue;
  if (workerPromise) {
    const worker = await workerPromise.catch(() => undefined);
    workerPromise = undefined;
    workerLanguages = undefined;
    if (worker) await worker.terminate();
  }
}
