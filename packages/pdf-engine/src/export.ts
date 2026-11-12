/// <reference path="./vendor.d.ts" />
import fontkit from '@pdf-lib/fontkit';
import {
  PDFCheckBox, PDFDocument, PDFDropdown, PDFRadioGroup, PDFTextField, rgb
} from 'pdf-lib';
import reshaper from 'arabic-persian-reshaper';
import bidiFactory from 'bidi-js';
import type { FormField } from '@formflow/core';

export interface OverlayFontAssets {
  arabic: Uint8Array;
  latin: Uint8Array;
}

export type OverlayFieldValues = Record<string, string | boolean>;

const ARABIC_PRESENTATION_RANGES = [
  [0x0600, 0x06ff], [0x0750, 0x077f], [0x08a0, 0x08ff],
  [0xfb50, 0xfdff], [0xfe70, 0xfeff]
];

function isArabicCharacter(character: string): boolean {
  const point = character.codePointAt(0) ?? 0;
  return ARABIC_PRESENTATION_RANGES.some(([start, end]) => point >= start && point <= end);
}

function shapeAndReorderLine(value: string, bidi: ReturnType<typeof bidiFactory>): string {
  const hasArabic = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value);
  const shaped = hasArabic ? reshaper.ArabicShaper.convertArabic(value) : value;
  const embeddingLevels = bidi.getEmbeddingLevels(shaped, hasArabic ? 'rtl' : 'ltr');
  return bidi.getReorderedString(shaped, embeddingLevels);
}

/**
 * Adds flattened values for user-defined fields to a PDF.
 * Coordinates use the top-left page viewport convention used by inspectPdf.
 * Rotated PDF pages are rejected rather than silently placing values incorrectly.
 */
export async function exportPdfWithOverlayFields(
  source: Uint8Array,
  fields: FormField[],
  values: OverlayFieldValues,
  fonts: OverlayFontAssets,
  existingValues: OverlayFieldValues = {}
): Promise<Uint8Array> {
  const document = await PDFDocument.load(source);
  document.registerFontkit(fontkit);
  const arabicFont = await document.embedFont(fonts.arabic, { subset: true });
  const latinFont = await document.embedFont(fonts.latin, { subset: true });

  const form = document.getForm();
  const nativeFields = form.getFields();
  for (const [name, value] of Object.entries(existingValues)) {
    const field = nativeFields.find((candidate) => candidate.getName() === name);
    if (!field) continue;
    if (field instanceof PDFTextField && typeof value === 'string') {
      if (/[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff]/u.test(value)) {
        throw new Error('Arabic text in native PDF fields is not supported yet. Use a custom FormFlow text field for Arabic output.');
      }
      field.setText(value);
      field.updateAppearances(latinFont);
    } else if (field instanceof PDFCheckBox && typeof value === 'boolean') {
      value ? field.check() : field.uncheck();
      field.updateAppearances();
    } else if (field instanceof PDFDropdown && typeof value === 'string') {
      field.select(value);
      field.updateAppearances(latinFont);
    } else if (field instanceof PDFRadioGroup && typeof value === 'string') {
      field.select(value);
      field.updateAppearances();
    }
  }
  const arabicMetrics = fontkit.create(fonts.arabic);
  const latinMetrics = fontkit.create(fonts.latin);
  const bidi = bidiFactory();
  const pages = document.getPages();

  for (const field of fields) {
    const value = values[field.id] ?? values[field.name];
    if (value === undefined || value === '') continue;

    const pageIndex = field.pageNumber - 1;
    const page = pages[pageIndex];
    if (!page) throw new Error('A field refers to a page that does not exist in this PDF.');
    if (page.getRotation().angle % 360 !== 0) {
      throw new Error('PDF export for rotated pages is not supported yet. Save a copy with unrotated pages first.');
    }

    const crop = page.getCropBox();
    const x = crop.x + field.x;
    const y = crop.y + crop.height - field.y - field.height;
    const width = Math.max(0, field.width);
    const height = Math.max(0, field.height);

    if (field.kind === 'checkbox') {
      if (field.method === 'manual') {
        page.drawRectangle({ x, y, width, height, borderColor: rgb(0.18, 0.22, 0.3), borderWidth: 0.8 });
      }
      if (value === true || (typeof value === 'string' && value.trim().length > 0)) {
        const inset = Math.max(2, Math.min(width, height) * 0.22);
        page.drawLine({
          start: { x: x + inset, y: y + height * 0.48 },
          end: { x: x + width * 0.43, y: y + inset },
          thickness: Math.max(1, Math.min(width, height) * 0.09),
          color: rgb(0.12, 0.2, 0.42)
        });
        page.drawLine({
          start: { x: x + width * 0.4, y: y + inset },
          end: { x: x + width - inset, y: y + height - inset },
          thickness: Math.max(1, Math.min(width, height) * 0.09),
          color: rgb(0.12, 0.2, 0.42)
        });
      }
      continue;
    }

    if (field.kind === 'radio') {
      if (field.method === 'manual') {
        page.drawEllipse({
          x: x + width / 2, y: y + height / 2,
          xScale: Math.max(2, Math.min(width, height) / 2),
          yScale: Math.max(2, Math.min(width, height) / 2),
          borderColor: rgb(0.18, 0.22, 0.3), borderWidth: 0.8
        });
      }
      if (value === true || (typeof value === 'string' && value.trim().length > 0)) {
        const diameter = Math.max(4, Math.min(width, height) * 0.42);
        page.drawEllipse({
          x: x + width / 2, y: y + height / 2,
          xScale: diameter / 2, yScale: diameter / 2,
          color: rgb(0.12, 0.2, 0.42)
        });
      }
      continue;
    }

    if (field.method === 'manual') {
      page.drawRectangle({ x, y, width, height, borderColor: rgb(0.55, 0.58, 0.64), borderWidth: 0.65 });
    }
    if (typeof value !== 'string') continue;
    const rawLines = value.replace(/\\r\\n?/g, '\\n').split('\\n');
    const paddingX = Math.min(4, width * 0.08);
    const paddingY = Math.min(3, height * 0.1);
    const maxWidth = Math.max(1, width - paddingX * 2);
    const maxHeight = Math.max(1, height - paddingY * 2);
    const baseFontSize = Math.max(5, Math.min(12, height * 0.62));
    const lineHeight = Math.max(baseFontSize * 1.15, height / Math.max(1, rawLines.length));
    const lines = rawLines.slice(0, Math.max(1, Math.floor(maxHeight / lineHeight)));

    lines.forEach((line, lineIndex) => {
      const visualLine = shapeAndReorderLine(line, bidi);
      const glyphs = [...visualLine].map((character) => {
        const arabic = isArabicCharacter(character);
        const metrics = arabic ? arabicMetrics : latinMetrics;
        const font = arabic ? arabicFont : latinFont;
        const codePoint = character.codePointAt(0) ?? 0;
        if (!metrics.hasGlyphForCodePoint(codePoint)) {
          throw new Error('A field value contains a character not supported by the bundled PDF fonts (U+' + codePoint.toString(16).toUpperCase() + ').');
        }
        return { character, font, metrics };
      });

      const measure = (fontSize: number) => glyphs.reduce(
        (sum, glyph) => sum + glyph.metrics.glyphForCodePoint(glyph.character.codePointAt(0) ?? 0).advanceWidth /
          glyph.metrics.unitsPerEm * fontSize,
        0
      );
      const fontSize = Math.max(4, Math.min(baseFontSize, maxWidth / Math.max(0.001, measure(1))));
      const lineWidth = measure(fontSize);
      let cursorX = x + paddingX;
      const baselineY = y + height - paddingY - baseFontSize - lineIndex * lineHeight;

      for (const glyph of glyphs) {
        const glyphWidth = glyph.metrics.glyphForCodePoint(glyph.character.codePointAt(0) ?? 0).advanceWidth /
          glyph.metrics.unitsPerEm * fontSize;
        page.drawText(glyph.character, {
          x: cursorX,
          y: baselineY,
          size: fontSize,
          font: glyph.font,
          color: rgb(0.12, 0.14, 0.18)
        });
        cursorX += glyphWidth;
      }

      // Keep short values visually centered when their box is much wider than the value.
      void lineWidth;
    });
  }

  return document.save();
}
