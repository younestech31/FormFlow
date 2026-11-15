import type { FieldCandidate, TextFragment, VectorShape } from './types';

const ARABIC = /[\u0600-\u06ff]/;
const LABEL_WORDS = new Set([
  // Common Arabic administrative form labels.
  'الاسم', 'والاسم', 'اللقب', 'واللقب', 'العنوان', 'الولاية', 'البلدية',
  'الهاتف', 'المحمول', 'البريد', 'الإلكتروني', 'تاريخ', 'الميلاد', 'مكان',
  'رقم', 'الملف', 'الجنسية', 'المهنة', 'الوظيفة', 'المؤسسة', 'الوثيقة',
  'الشهادة', 'الشهرة', 'الأب', 'الأم', 'الزوج', 'الزوجة', 'الجنس',
  'الحالة', 'العائلية', 'المدنية', 'القسم', 'المصلحة', 'الإمضاء',
  'التوقيع', 'المستوى', 'الدراسي', 'الدخل', 'الراتب', 'البلد',
  // Common French labels.
  'nom', 'prénom', 'prenom', 'adresse', 'téléphone', 'telephone',
  'portable', 'courriel', 'email', 'date', 'naissance', 'lieu',
  'profession', 'commune', 'wilaya', 'nationalité', 'nationalite',
  'numéro', 'numero', 'dossier', 'signature', 'état', 'etat',
  'civil', 'père', 'pere', 'mère', 'mere', 'filiation', 'carte',
  'identité', 'identite', 'fonction', 'employeur', 'matricule',
  'prénoms', 'prenoms', 'époux', 'epoux', 'épouse', 'epouse',
  // Common English labels.
  'name', 'surname', 'firstname', 'first', 'last', 'address',
  'phone', 'mobile', 'email', 'date', 'birth', 'place', 'job',
  'occupation', 'nationality', 'number', 'file', 'reference',
  'signature', 'gender', 'marital', 'status', 'id', 'passport'
]);

function normalizeText(value: string): string {
  return value.normalize('NFKC')
    .replace(/[\u064b-\u065f\u0670\u0640]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanLabel(value: string): string {
  return normalizeText(value)
    .replace(/^[\s:：؛;,.\-–—]+|[\s:：؛;,.\-–—]+$/g, '')
    .trim();
}

function isArabic(value: string): boolean {
  return ARABIC.test(value);
}

function labelHasCue(value: string): boolean {
  return /[:：]\s*$/.test(value.trim());
}

function isLikelyLabel(value: string): boolean {
  const text = cleanLabel(value);
  if (text.length < 2 || text.length > 72) return false;
  if (/[.!؟?]$/.test(text)) return false;
  const words = text.toLocaleLowerCase().split(/[\s،,؛;|/]+/).filter(Boolean);
  if (words.length === 0 || words.length > 8) return false;
  if (labelHasCue(value)) return true;
  const normalized = words.map((word) => word.replace(/[^\p{L}\p{N}]/gu, ''));
  return normalized.some((word) => LABEL_WORDS.has(word));
}

interface TextLine extends TextFragment {
  sourceIds: string[];
  sourceFragments: TextFragment[];
  explicitCue: boolean;
}

function verticalCenter(fragment: TextFragment): number {
  return fragment.y + fragment.height / 2;
}

/**
 * PDF.js often splits a visible label into several text runs. Recombine runs
 * that share a baseline and are close enough to belong to the same phrase.
 */
function mergeTextLines(fragments: TextFragment[]): TextLine[] {
  const ordered = [...fragments]
    .filter((item) => normalizeText(item.text).length > 0)
    .sort((a, b) => a.pageNumber - b.pageNumber || verticalCenter(a) - verticalCenter(b) || a.x - b.x);
  const groups: TextFragment[][] = [];

  for (const fragment of ordered) {
    const center = verticalCenter(fragment);
    let bestGroup: TextFragment[] | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const group of groups) {
      const first = group[0];
      if (first.pageNumber !== fragment.pageNumber) continue;
      const top = Math.min(...group.map((item) => item.y));
      const bottom = Math.max(...group.map((item) => item.y + item.height));
      const centerY = (top + bottom) / 2;
      const groupHeight = Math.max(...group.map((item) => item.height));
      const tolerance = Math.max(2.5, Math.min(groupHeight, fragment.height) * 0.42);
      const verticalDistance = Math.abs(centerY - center);
      if (verticalDistance > tolerance) continue;

      const left = Math.min(...group.map((item) => item.x));
      const right = Math.max(...group.map((item) => item.x + item.width));
      const gap = Math.max(0, fragment.x - right, left - (fragment.x + fragment.width));
      const maxGap = Math.max(18, Math.max(groupHeight, fragment.height) * 2.2);
      if (gap > maxGap) continue;
      const distance = verticalDistance + gap * 0.08;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestGroup = group;
      }
    }

    if (bestGroup) bestGroup.push(fragment);
    else groups.push([fragment]);
  }

  return groups.map((group) => {
    const textDirectionArabic = group.filter((item) => isArabic(item.text)).length >
      group.filter((item) => /[A-Za-z]/.test(item.text)).length;
    const readingOrder = [...group].sort((a, b) =>
      textDirectionArabic ? b.x - a.x : a.x - b.x
    );
    const left = Math.min(...group.map((item) => item.x));
    const top = Math.min(...group.map((item) => item.y));
    const right = Math.max(...group.map((item) => item.x + item.width));
    const bottom = Math.max(...group.map((item) => item.y + item.height));
    const joinedText = normalizeText(readingOrder.map((item) => item.text).join(' '));
    return {
      id: 'line-' + group.map((item) => item.id).join('-'),
      sourceIds: group.map((item) => item.id),
      sourceFragments: group,
      text: joinedText,
      pageNumber: group[0].pageNumber,
      pageWidth: group[0].pageWidth,
      pageHeight: group[0].pageHeight,
      x: left,
      y: top,
      width: right - left,
      height: Math.max(1, bottom - top),
      explicitCue: labelHasCue(joinedText)
    };
  });
}

function intersectionRatio(a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }): number {
  const width = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const height = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return width * height / Math.max(1, Math.min(a.width * a.height, b.width * b.height));
}

function textIsInside(shape: VectorShape, lines: TextLine[]): boolean {
  return lines.some((line) => line.pageNumber === shape.pageNumber &&
    line.sourceFragments.some((fragment) => intersectionRatio(shape, fragment) >= 0.18));
}

interface LabelMatch { text: string; score: number; explicitCue: boolean; }

const OPTION_WORDS = new Set([
  'oui', 'non', 'yes', 'no', 'male', 'female', 'other', 'm', 'f',
  'masculin', 'féminin', 'feminin', 'homme', 'femme', 'autre',
  'نعم', 'لا', 'ذكر', 'أنثى', 'انثى', 'مذكر', 'مؤنث', 'اخرى', 'أخرى'
]);

function isShortOption(value: string): boolean {
  const text = cleanLabel(value).toLocaleLowerCase();
  return OPTION_WORDS.has(text);
}

function inferFieldKind(label: string, height = 24): FieldCandidate['kind'] {
  const text = cleanLabel(label).toLocaleLowerCase();
  if (/(date|naissance|birth|تاريخ|ميلاد)/u.test(text)) return 'date';
  if (/(signature|signé|signer|التوقيع|الإمضاء|امضاء)/u.test(text)) return 'signature';
  if (height >= 76) return 'multiline';
  return 'text';
}

function findNearbyLabel(
  shape: VectorShape,
  lines: TextLine[],
  allowOptions = false,
  horizontalOnly = false
): LabelMatch | null {
  const matches: LabelMatch[] = [];
  for (const line of lines) {
    if (line.pageNumber !== shape.pageNumber ||
        (!isLikelyLabel(line.text) && !(allowOptions && isShortOption(line.text)))) continue;

    const lineRight = line.x + line.width;
    const lineBottom = line.y + line.height;
    const shapeRight = shape.x + shape.width;
    const shapeBottom = shape.y + shape.height;
    const overlapY = Math.max(0, Math.min(lineBottom, shapeBottom) - Math.max(line.y, shape.y));
    const overlapX = Math.max(0, Math.min(lineRight, shapeRight) - Math.max(line.x, shape.x));
    const verticalRatio = overlapY / Math.max(1, Math.min(line.height, Math.max(shape.height, 1)));
    const leftGap = shape.x - lineRight;
    const rightGap = line.x - shapeRight;
    const topGap = shape.y - lineBottom;
    const arabic = isArabic(line.text);

    const leftMatch = leftGap >= -10 && leftGap <= 115 && verticalRatio >= 0.2;
    const rightMatch = rightGap >= -10 && rightGap <= 115 && verticalRatio >= 0.2;
    const topMatch = !horizontalOnly && topGap >= -10 && topGap <= 58 &&
      overlapX >= Math.min(line.width, shape.width) * 0.3;

    if (!leftMatch && !rightMatch && !topMatch) continue;

    const verticalPenalty = Math.abs(verticalCenter(line) - (shape.y + shape.height / 2)) * 0.22;
    const optionLabel = allowOptions && isShortOption(line.text);
    const preferRight = arabic || optionLabel;
    const orientationPenalty = preferRight
      ? (rightMatch ? 0 : leftMatch ? 28 : 14)
      : (leftMatch ? 0 : rightMatch ? 28 : 14);
    const distance = leftMatch ? Math.max(0, leftGap)
      : rightMatch ? Math.max(0, rightGap)
      : Math.max(0, topGap) + 12;
    const cueBonus = line.explicitCue ? 12 : 0;
    const score = distance + verticalPenalty + orientationPenalty - cueBonus;
    matches.push({ text: cleanLabel(line.text), score, explicitCue: line.explicitCue });
  }

  return matches.sort((a, b) => a.score - b.score)[0] ?? null;
}

function uniqueCoordinates(values: number[], tolerance = 2.5): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const result: number[] = [];
  for (const value of sorted) {
    const previous = result[result.length - 1];
    if (previous === undefined || Math.abs(value - previous) > tolerance) result.push(value);
    else result[result.length - 1] = (previous + value) / 2;
  }
  return result;
}

function lineCoversHorizontal(shape: VectorShape, y: number, x1: number, x2: number): boolean {
  const centerY = shape.y + shape.height / 2;
  return shape.kind === 'line' && shape.width >= 35 && shape.height <= 3.5 &&
    Math.abs(centerY - y) <= 3 && shape.x <= x1 + 4 && shape.x + shape.width >= x2 - 4;
}

function lineCoversVertical(shape: VectorShape, x: number, y1: number, y2: number): boolean {
  const centerX = shape.x + shape.width / 2;
  return shape.kind === 'line' && shape.width <= 3.5 && shape.height >= 35 &&
    Math.abs(centerX - x) <= 3 && shape.y <= y1 + 4 && shape.y + shape.height >= y2 - 4;
}

/** Reconstruct empty cells from independent horizontal and vertical rules. */
function detectGridCells(shapes: VectorShape[], lines: TextLine[]): FieldCandidate[] {
  const horizontal = shapes.filter((shape) =>
    shape.kind === 'line' && shape.width >= 35 && shape.height <= 3.5
  );
  const vertical = shapes.filter((shape) =>
    shape.kind === 'line' && shape.width <= 3.5 && shape.height >= 35
  );
  if (horizontal.length < 2 || vertical.length < 2) return [];

  const xs = uniqueCoordinates(vertical.map((shape) => shape.x + shape.width / 2));
  const ys = uniqueCoordinates(horizontal.map((shape) => shape.y + shape.height / 2));
  const candidates: FieldCandidate[] = [];

  for (let row = 0; row < ys.length - 1; row += 1) {
    const y1 = ys[row];
    const y2 = ys[row + 1];
    const height = y2 - y1;
    if (height < 14 || height > 90) continue;

    for (let column = 0; column < xs.length - 1; column += 1) {
      const x1 = xs[column];
      const x2 = xs[column + 1];
      const width = x2 - x1;
      if (width < 48 || width > Math.min(shapes[0]?.pageWidth ?? 10000, 1200) * 0.88) continue;

      const topEdge = horizontal.some((shape) => lineCoversHorizontal(shape, y1, x1, x2));
      const bottomEdge = horizontal.some((shape) => lineCoversHorizontal(shape, y2, x1, x2));
      const leftEdge = vertical.some((shape) => lineCoversVertical(shape, x1, y1, y2));
      const rightEdge = vertical.some((shape) => lineCoversVertical(shape, x2, y1, y2));
      if (!topEdge || !bottomEdge || !leftEdge || !rightEdge) continue;

      const pageNumber = horizontal.find((shape) => lineCoversHorizontal(shape, y1, x1, x2))?.pageNumber;
      if (!pageNumber) continue;
      const cell: VectorShape = {
        id: 'grid-cell-' + pageNumber + '-' + Math.round(x1) + '-' + Math.round(y1),
        pageNumber, kind: 'rectangle', x: x1, y: y1, width, height,
        pageWidth: horizontal[0].pageWidth, pageHeight: horizontal[0].pageHeight, closed: true
      };
      if (textIsInside(cell, lines)) continue;
      const label = findNearbyLabel(cell, lines);
      if (!label) continue;
      candidates.push({
        id: cell.id, label: label.text, kind: inferFieldKind(label.text, height), pageNumber,
        x: x1 + 1, y: y1 + 1, width: Math.max(8, width - 2), height: Math.max(8, height - 2),
        confidence: label.explicitCue ? 0.86 : 0.76, method: 'geometry'
      });
    }
  }
  return candidates;
}

function isChoiceGroupLabel(label: string): boolean {
  return /(gender|sex|genre|marital|état\s+civil|etat\s+civil|situation\s+(familiale|matrimoniale)|الجنس|الحالة\s+(الاجتماعية|العائلية))/iu.test(label);
}

function segmentedCellGapAllowed(left: VectorShape, right: VectorShape): boolean {
  const gap = right.x - (left.x + left.width);
  const referenceSize = Math.min(left.width, left.height, right.width, right.height);
  const widthRatio = left.width / Math.max(1, right.width);
  const heightRatio = left.height / Math.max(1, right.height);
  const centerDelta = Math.abs(
    (left.y + left.height / 2) - (right.y + right.height / 2)
  );

  return gap >= -2 && gap <= Math.min(8, Math.max(3, referenceSize * 0.42)) &&
    widthRatio >= 0.72 && widthRatio <= 1.38 &&
    heightRatio >= 0.72 && heightRatio <= 1.38 &&
    centerDelta <= Math.max(2.5, referenceSize * 0.22);
}

interface SegmentedFieldResult {
  candidates: FieldCandidate[];
  consumedShapeIds: Set<string>;
}

/**
 * Digit boxes in identity, registration, and reference-number fields are often
 * drawn as a tightly packed row of small rectangles. Treat a coherent run as
 * one editable text field rather than several unrelated checkboxes.
 */
function detectSegmentedInputFields(
  shapes: VectorShape[],
  lines: TextLine[]
): SegmentedFieldResult {
  const smallBoxes = shapes
    .filter((shape) => shape.kind === 'rectangle' && shape.closed)
    .filter((shape) => {
      const ratio = shape.width / Math.max(1, shape.height);
      return shape.width >= 9 && shape.width <= 34 &&
        shape.height >= 9 && shape.height <= 34 &&
        ratio >= 0.72 && ratio <= 1.38;
    })
    .sort((a, b) =>
      a.pageNumber - b.pageNumber ||
      (a.y + a.height / 2) - (b.y + b.height / 2) ||
      a.x - b.x
    );

  const rows: VectorShape[][] = [];
  for (const box of smallBoxes) {
    const center = box.y + box.height / 2;
    const lastRow = rows[rows.length - 1];
    if (lastRow && lastRow[0].pageNumber === box.pageNumber) {
      const reference = lastRow[0];
      const rowCenter = lastRow.reduce((sum, item) => sum + item.y + item.height / 2, 0) / lastRow.length;
      const tolerance = Math.max(2.5, Math.min(box.height, reference.height) * 0.22);
      if (Math.abs(rowCenter - center) <= tolerance) {
        lastRow.push(box);
        continue;
      }
    }
    rows.push([box]);
  }

  const candidates: FieldCandidate[] = [];
  const consumedShapeIds = new Set<string>();

  for (const row of rows) {
    const ordered = [...row].sort((a, b) => a.x - b.x);
    let run: VectorShape[] = [];

    const flushRun = () => {
      if (run.length < 4) {
        run = [];
        return;
      }

      const left = Math.min(...run.map((item) => item.x));
      const top = Math.min(...run.map((item) => item.y));
      const right = Math.max(...run.map((item) => item.x + item.width));
      const bottom = Math.max(...run.map((item) => item.y + item.height));
      const band: VectorShape = {
        ...run[0],
        id: 'segmented-band-' + run.map((item) => item.id).join('-'),
        kind: 'rectangle',
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
        closed: true
      };

      // A printed value inside a digit box means this is not an empty field.
      if (textIsInside(band, lines)) {
        run.forEach((item) => consumedShapeIds.add(item.id));
        run = [];
        return;
      }

      const label = findNearbyLabel(band, lines);
      const labelText = label?.text ?? '';
      if (labelText && isChoiceGroupLabel(labelText)) {
        run = [];
        return;
      }

      // Four or five boxes need a meaningful label. Six or more form a strong
      // enough geometric sequence to remain a lower-confidence suggestion.
      if (!label && run.length < 6) {
        run = [];
        return;
      }

      candidates.push({
        id: band.id,
        label: labelText,
        kind: inferFieldKind(labelText, band.height),
        pageNumber: band.pageNumber,
        x: band.x,
        y: band.y,
        width: band.width,
        height: band.height,
        confidence: label ? (label.explicitCue ? 0.92 : 0.86) : 0.62,
        method: 'geometry'
      });
      run.forEach((item) => consumedShapeIds.add(item.id));
      run = [];
    };

    for (const box of ordered) {
      const previous = run[run.length - 1];
      if (previous && !segmentedCellGapAllowed(previous, box)) flushRun();
      run.push(box);
    }
    flushRun();
  }

  return { candidates, consumedShapeIds };
}

function deduplicateCandidates(candidates: FieldCandidate[]): FieldCandidate[] {
  const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence);
  const kept: FieldCandidate[] = [];
  for (const candidate of sorted) {
    const duplicateIndex = kept.findIndex((prior) =>
      prior.pageNumber === candidate.pageNumber &&
      prior.kind === candidate.kind &&
      intersectionRatio(prior, candidate) >= 0.64
    );
    if (duplicateIndex < 0) kept.push(candidate);
  }
  return kept.sort((a, b) => a.pageNumber - b.pageNumber || a.y - b.y || a.x - b.x);
}

/**
 * Conservative, explainable form-control detection. Text inside a box is
 * treated as content, not as an empty input; unlabelled decorative rules are
 * not promoted to fields.
 */
export function detectGeometryFields(
  shapes: VectorShape[],
  fragments: TextFragment[] = []
): FieldCandidate[] {
  const lines = mergeTextLines(fragments);
  const candidates: FieldCandidate[] = [];
  const segmented = detectSegmentedInputFields(shapes, lines);
  const consumedShapeIds = segmented.consumedShapeIds;
  candidates.push(...segmented.candidates);

  for (const shape of shapes) {
    if (consumedShapeIds.has(shape.id)) continue;
    if (shape.width <= 0 || (shape.height <= 0 && shape.kind !== 'line')) continue;
    if (shape.width >= shape.pageWidth * 0.92 && shape.height >= shape.pageHeight * 0.92) continue;

    if (shape.kind === 'ellipse') {
      const ratio = shape.width / Math.max(1, shape.height);
      if (shape.width < 9 || shape.width > 34 || shape.height < 9 || shape.height > 34 ||
          ratio < 0.72 || ratio > 1.38) continue;
      const label = findNearbyLabel(shape, lines, true, true);
      const alignedPeers = shapes.filter((peer) =>
        peer.kind === 'ellipse' && peer.pageNumber === shape.pageNumber &&
        Math.abs((peer.y + peer.height / 2) - (shape.y + shape.height / 2)) <= 14 &&
        Math.abs(peer.x - shape.x) > 8
      );
      if (!label && alignedPeers.length === 0) continue;
      candidates.push({
        id: 'geometry-' + shape.id, label: label?.text ?? '', kind: 'radio',
        pageNumber: shape.pageNumber, x: shape.x, y: shape.y,
        width: shape.width, height: shape.height,
        confidence: label ? 0.86 : 0.68, method: 'geometry'
      });
      continue;
    }

    if (shape.kind === 'rectangle' && shape.closed) {
      const ratio = shape.width / Math.max(1, shape.height);
      if (shape.width >= 9 && shape.width <= 34 && shape.height >= 9 && shape.height <= 34 &&
          ratio >= 0.72 && ratio <= 1.38) {
        if (textIsInside(shape, lines)) continue;
        candidates.push({
          id: 'geometry-' + shape.id, label: findNearbyLabel(shape, lines, true, true)?.text ?? '',
          kind: 'checkbox', pageNumber: shape.pageNumber,
          x: shape.x, y: shape.y, width: shape.width, height: shape.height,
          confidence: 0.88, method: 'geometry'
        });
        continue;
      }

      if (shape.width < 52 || shape.width > shape.pageWidth * 0.88 ||
          shape.height < 13 || shape.height > 220 || ratio < 1.2) continue;
      if (textIsInside(shape, lines)) continue;

      const label = findNearbyLabel(shape, lines);
      candidates.push({
        id: 'geometry-' + shape.id, label: label?.text ?? '', kind: inferFieldKind(label?.text ?? '', shape.height),
        pageNumber: shape.pageNumber, x: shape.x, y: shape.y,
        width: shape.width, height: shape.height,
        confidence: label ? (label.explicitCue ? 0.9 : 0.82) : 0.54,
        method: 'geometry'
      });
      continue;
    }

    if (shape.kind === 'line' && shape.width >= 60 && shape.height <= 2.5 &&
        shape.width <= shape.pageWidth * 0.88) {
      const inputArea: VectorShape = {
        ...shape, x: shape.x, y: Math.max(0, shape.y - 22), height: 21
      };
      const label = findNearbyLabel(inputArea, lines);
      if (!label) continue;
      candidates.push({
        id: 'geometry-' + shape.id, label: label.text, kind: inferFieldKind(label.text, inputArea.height),
        pageNumber: shape.pageNumber, x: shape.x, y: inputArea.y,
        width: shape.width, height: inputArea.height,
        confidence: label.explicitCue ? 0.78 : 0.68,
        method: 'geometry'
      });
    }
  }

  candidates.push(...detectGridCells(shapes, lines));
  const deduplicated = deduplicateCandidates(candidates);
  return deduplicated.map((candidate) => {
    if (candidate.kind !== 'radio') return candidate;
    const rowPeers = deduplicated.filter((peer) =>
      peer.kind === 'radio' && peer.pageNumber === candidate.pageNumber &&
      Math.abs((peer.y + peer.height / 2) - (candidate.y + candidate.height / 2)) <= 14
    );
    if (rowPeers.length < 2) return candidate;
    const groupLine = Math.round((candidate.y + candidate.height / 2) / 20);
    return { ...candidate, group: 'radio-page-' + candidate.pageNumber + '-row-' + groupLine };
  });
}

/**
 * Infer a bounded blank area next to a recognizable text label when no vector
 * border or underline was found. Existing geometric detections are supplied so
 * the same field is not suggested twice.
 */
export function detectLabelAnchors(
  fragments: TextFragment[],
  existingFields: Array<Pick<FieldCandidate, 'pageNumber' | 'x' | 'y' | 'width' | 'height'>> = []
): FieldCandidate[] {
  const lines = mergeTextLines(fragments);
  const candidates: FieldCandidate[] = [];

  for (const line of lines) {
    if (!isLikelyLabel(line.text)) continue;
    const arabic = isArabic(line.text);
    const maxWidth = Math.min(300, line.pageWidth * 0.52);
    const sameRow = lines.filter((other) =>
      other.pageNumber === line.pageNumber && other.id !== line.id &&
      Math.abs(verticalCenter(other) - verticalCenter(line)) <= Math.max(10, line.height * 0.95)
    );

    let x: number;
    let width: number;
    if (arabic) {
      const nearestLeftBlocker = sameRow
        .filter((other) => other.x + other.width <= line.x + 4)
        .map((other) => other.x + other.width)
        .sort((a, b) => b - a)[0];
      const right = Math.max(0, line.x - 8);
      const left = Math.max(nearestLeftBlocker === undefined ? 16 : nearestLeftBlocker + 8, right - maxWidth);
      x = left;
      width = right - left;
    } else {
      const nearestRightBlocker = sameRow
        .filter((other) => other.x >= line.x + line.width - 4)
        .map((other) => other.x)
        .sort((a, b) => a - b)[0];
      x = Math.min(line.pageWidth - 16, line.x + line.width + 8);
      const right = Math.min(
        line.pageWidth - 16,
        nearestRightBlocker === undefined ? x + maxWidth : nearestRightBlocker - 8
      );
      width = right - x;
    }

    if (width < 56) continue;
    const y = Math.max(0, verticalCenter(line) - Math.max(11, line.height * 0.85));
    const candidate = {
      id: 'candidate-' + line.pageNumber + '-' + line.sourceIds.join('-'),
      label: cleanLabel(line.text), kind: inferFieldKind(line.text) as FieldCandidate['kind'],
      pageNumber: line.pageNumber, x, y, width,
      height: Math.max(20, line.height * 1.7),
      confidence: line.explicitCue ? 0.56 : 0.46,
      method: 'label-anchor' as const
    };

    const occupied = existingFields.some((field) =>
      field.pageNumber === candidate.pageNumber &&
      intersectionRatio(field, candidate) >= 0.22
    );
    if (occupied) continue;
    candidates.push(candidate);
  }

  return deduplicateCandidates(candidates);
}

export function clampFieldRectangle(
  rectangle: { x: number; y: number; width: number; height: number },
  page: { width: number; height: number }
) {
  const width = Math.min(Math.max(8, rectangle.width), page.width);
  const height = Math.min(Math.max(8, rectangle.height), page.height);
  return {
    x: Math.min(Math.max(0, rectangle.x), Math.max(0, page.width - width)),
    y: Math.min(Math.max(0, rectangle.y), Math.max(0, page.height - height)),
    width, height
  };
}
