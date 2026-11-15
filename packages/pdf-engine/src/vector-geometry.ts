import { OPS } from 'pdfjs-dist';
import type { VectorShape } from '@formflow/core';

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

function multiplyMatrices(left: Matrix, right: Matrix): Matrix {
  const [a, b, c, d, e, f] = left;
  const [g, h, i, j, k, l] = right;
  return [
    a * g + c * h, b * g + d * h,
    a * i + c * j, b * i + d * j,
    a * k + c * l + e, b * k + d * l + f
  ];
}

function transformPoint(matrix: Matrix, x: number, y: number): [number, number] {
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

export function extractVectorShapes(
  operatorList: { fnArray: number[]; argsArray: unknown[][] },
  pageNumber: number,
  viewport: ReturnType<import('pdfjs-dist').PDFPageProxy['getViewport']>
): VectorShape[] {
  const shapes: VectorShape[] = [];
  const matrixStack: Matrix[] = [];
  let matrix: Matrix = [...IDENTITY];

  const finishPath = (points: Array<[number, number]>, closed: boolean, curved: boolean, index: number) => {
    if (points.length < 2) return;
    const transformed = points.map(([x, y]) => {
      const [tx, ty] = transformPoint(matrix, x, y);
      return viewport.convertToViewportPoint(tx, ty) as [number, number];
    });
    const xs = transformed.map((point) => point[0]);
    const ys = transformed.map((point) => point[1]);
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const width = Math.max(...xs) - left;
    const height = Math.max(...ys) - top;
    if (width < 0.5 && height < 0.5) return;
    const ratio = width / Math.max(1, height);
    const [firstX, firstY] = transformed[0];
    const [lastX, lastY] = transformed[transformed.length - 1];
    const returnsToStart = Math.hypot(firstX - lastX, firstY - lastY) <= 3;
    const isEllipse = curved && (closed || returnsToStart) &&
      points.length >= 5 && points.length <= 7 &&
      width >= 8 && width <= 40 && height >= 8 && height <= 40 &&
      ratio >= 0.72 && ratio <= 1.38;
    const isHorizontalLine = !curved && height <= 2.5 && width >= 40;
    const isVerticalLine = !curved && width <= 2.5 && height >= 40;
    const isRectangle = !curved && closed && points.length >= 4 && points.length <= 5 &&
      width >= 8 && height >= 8 && (
        transformed.every((point) => Math.abs(point[0] - left) < 2 || Math.abs(point[0] - (left + width)) < 2) &&
        transformed.every((point) => Math.abs(point[1] - top) < 2 || Math.abs(point[1] - (top + height)) < 2)
      );
    if (!isHorizontalLine && !isVerticalLine && !isRectangle && !isEllipse) return;
    shapes.push({
      id: 'p' + pageNumber + '-shape-' + index, pageNumber,
      kind: isRectangle ? 'rectangle' : isEllipse ? 'ellipse' : 'line',
      x: left, y: top, width, height,
      pageWidth: viewport.width, pageHeight: viewport.height, closed: closed || isEllipse
    });
  };

  operatorList.fnArray.forEach((operator, index) => {
    const args = operatorList.argsArray[index] ?? [];
    if (operator === OPS.save) {
      matrixStack.push([...matrix]);
      return;
    }
    if (operator === OPS.restore) {
      matrix = matrixStack.pop() ?? [...IDENTITY];
      return;
    }
    if (operator === OPS.transform) {
      const values = args as number[];
      if (values.length >= 6) matrix = multiplyMatrices(matrix, values.slice(0, 6) as Matrix);
      return;
    }
    if (operator !== OPS.constructPath) return;

    // PDF.js groups encoded path commands in the first typed array under args[1].
    const pathData = args[1] as ArrayLike<number> | ArrayLike<ArrayLike<number>> | undefined;
    const pathArgs = Array.isArray(pathData) ? pathData[0] as ArrayLike<number> | undefined : pathData as ArrayLike<number> | undefined;
    if (!pathArgs || typeof pathArgs.length !== 'number') return;
    let cursor = 0;
    let points: Array<[number, number]> = [];
    let closed = false;
    let curved = false;
    const flush = () => {
      finishPath(points, closed, curved, index * 1000 + shapes.length);
      points = [];
      closed = false;
      curved = false;
    };
    while (cursor < pathArgs.length) {
      const command = Number(pathArgs[cursor++]);
      if (command === 0 && cursor + 1 < pathArgs.length) {
        if (points.length) flush();
        points.push([Number(pathArgs[cursor++]), Number(pathArgs[cursor++])]);
      } else if (command === 1 && cursor + 1 < pathArgs.length) {
        points.push([Number(pathArgs[cursor++]), Number(pathArgs[cursor++])]);
      } else if (command === 2 && cursor + 5 < pathArgs.length) {
        cursor += 4;
        points.push([Number(pathArgs[cursor++]), Number(pathArgs[cursor++])]);
        curved = true;
      } else if (command === 3 && cursor + 3 < pathArgs.length) {
        cursor += 2;
        points.push([Number(pathArgs[cursor++]), Number(pathArgs[cursor++])]);
        curved = true;
      } else if (command === 4) {
        closed = true;
        flush();
      } else {
        points = [];
        break;
      }
    }
    if (points.length) flush();
  });

  return shapes;
}
