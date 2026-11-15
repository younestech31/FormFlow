# Local OCR: operation, privacy, and limitations

## What happens to a scanned PDF page

1. FormFlow continues to inspect native PDF text, AcroForm widgets, and vector geometry first. OCR is user-triggered for the currently displayed page.
2. PDF.js rasterizes that page to a white-background canvas at approximately 220 DPI, with the longest edge capped at 2,800 pixels to bound memory use.
3. Tesseract.js 7 runs its LSTM OCR engine through WebAssembly in a dedicated Web Worker. The selected model set is Arabic (`ara`), French (`fra`), English (`eng`), or a supported combination.
4. Tesseract line bounding boxes are translated from image pixels back to PDF page coordinates. The FormFlow preview draws these boxes over the original page.
5. The user can edit each recognized line. Lines with an engine confidence score below 45% remain visible for manual review but are excluded from automatic label-anchor detection until the user edits the line; an explicit edit marks it as reviewed and eligible for matching. The score is an engine heuristic, not a probability of correctness.

## Assets and offline behavior

Run `npm run prepare:ocr` to copy the Tesseract worker and compatible WASM cores into `apps/web/public/ocr`, download the pinned `tessdata_fast` models, and write their notices and an asset manifest. The root production build runs this preparation step automatically. Generated binary assets are deliberately excluded from Git; deployment builds regenerate them from the pinned package/model versions.

All runtime OCR requests are same-origin requests to the deployed FormFlow site. The app does not send the selected PDF, rendered page, or recognized text to an OCR provider. Tesseract stores language data in browser-local storage and the service worker caches same-origin OCR runtime/model assets after they are requested. Therefore first use needs the model assets to be available (usually an internet connection to the FormFlow host); subsequent OCR use can work offline after the required assets have been cached. Clearing browser site data removes those caches.

## Quality limits

- `tessdata_fast` prioritizes speed and smaller downloads. It is a practical first local model, not a claim of best possible Arabic accuracy. A future measured comparison with `tessdata_best` or another local OCR engine may justify a different default.
- Handwriting, stamps, signatures, faint carbon copies, low resolution, heavy skew, complex tables, and mixed Arabic/French text can still be misread. OCR does not reliably interpret form semantics or decide what a legal field means.
- Confidence values are not calibrated probabilities. Never rely on them alone for identity numbers, civil status, dates, or other legally significant data.
- The current integration does not claim accuracy benchmarks on real Algerian forms. A representative, consented test corpus and character/word error measurements are required before describing OCR as production-grade.
- Recognition is done one page at a time to avoid allocating a large bitmap for an entire multipage PDF. Current render cap is approximately 8 megapixels, depending on page aspect ratio.

## License notices

The Tesseract.js runtime, WebAssembly core, and `tessdata_fast` trained data are Apache-2.0. Their notices are copied to `apps/web/public/ocr/licenses` during asset preparation. FormFlow's own project license remains a separate owner decision documented in [licensing.md](licensing.md).
