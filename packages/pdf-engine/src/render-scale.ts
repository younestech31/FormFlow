/**
 * Choose a backing-store scale for crisp PDF previews without unbounded canvas
 * allocations. The visible canvas is still laid out at CSS size; this scale
 * controls only its raster resolution.
 */
export function getPdfRenderScale(
  pageWidth: number,
  pageHeight: number,
  displayWidth: number,
  pixelRatio = 1
): number {
  const dimensions = [pageWidth, pageHeight, displayWidth, pixelRatio];
  if (dimensions.some((value) => !Number.isFinite(value) || value <= 0)) {
    throw new RangeError('PDF preview dimensions and pixel ratio must be positive finite numbers.');
  }

  const fitScale = displayWidth / pageWidth;
  const densityScale = Math.max(1, Math.min(pixelRatio, 3));
  const desiredScale = Math.max(1, fitScale * densityScale);
  const maxDimensionScale = Math.min(4096 / pageWidth, 4096 / pageHeight);
  const maxPixelScale = Math.sqrt(8_000_000 / (pageWidth * pageHeight));
  const memorySafeScale = Math.min(4, maxDimensionScale, maxPixelScale);

  return Math.max(0.25, Math.min(desiredScale, memorySafeScale));
}
