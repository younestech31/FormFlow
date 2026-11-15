import { copyFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicOcr = resolve(root, 'apps/web/public/ocr');
const workerDir = resolve(publicOcr, 'worker');
const coreDir = resolve(publicOcr, 'core');
const languageDir = resolve(publicOcr, 'lang');
const licenseDir = resolve(publicOcr, 'licenses');
const tessdataCommit = '87416418657359cb625c412a48b6e1d6d41c29bd';
const languages = ['ara', 'fra', 'eng'];
const coreVariants = ['lstm', 'simd-lstm', 'relaxedsimd-lstm'];

async function download(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`OCR asset download failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function copyRequired(source, destination) {
  try {
    await stat(source);
  } catch {
    throw new Error(`Required OCR runtime file is missing: ${source}. Run npm install first.`);
  }
  await copyFile(source, destination);
}

await Promise.all([workerDir, coreDir, languageDir, licenseDir].map((path) => mkdir(path, { recursive: true })));

await copyRequired(
  resolve(root, 'node_modules/tesseract.js/dist/worker.min.js'),
  resolve(workerDir, 'worker.min.js')
);

for (const variant of coreVariants) {
  for (const extension of ['wasm.js', 'wasm']) {
    const filename = `tesseract-core-${variant}.${extension}`;
    await copyRequired(
      resolve(root, 'node_modules/tesseract.js-core', filename),
      resolve(coreDir, filename)
    );
  }
}

const assetPaths = ['/ocr/worker/worker.min.js'];
for (const variant of coreVariants) {
  assetPaths.push(`/ocr/core/tesseract-core-${variant}.wasm.js`);
  assetPaths.push(`/ocr/core/tesseract-core-${variant}.wasm`);
}

for (const language of languages) {
  const destination = resolve(languageDir, `${language}.traineddata.gz`);
  try {
    await stat(destination);
  } catch {
    const url = `https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${tessdataCommit}/${language}.traineddata`;
    const trainedData = await download(url);
    await writeFile(destination, await gzipAsync(trainedData, { level: 9 }));
  }
  assetPaths.push(`/ocr/lang/${language}.traineddata.gz`);
}

await copyRequired(
  resolve(root, 'node_modules/tesseract.js/LICENSE.md'),
  resolve(licenseDir, 'tesseract.js-LICENSE.md')
);
await copyRequired(
  resolve(root, 'node_modules/tesseract.js-core/LICENSE'),
  resolve(licenseDir, 'tesseract.js-core-LICENSE')
);
await writeFile(
  resolve(licenseDir, 'tessdata_fast-LICENSE'),
  await download(`https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/${tessdataCommit}/LICENSE`)
);
await writeFile(
  resolve(publicOcr, 'asset-manifest.json'),
  JSON.stringify({ engine: 'tesseract.js@7.0.0', modelSourceCommit: tessdataCommit, assets: assetPaths }, null, 2) + '\n'
);

const totalBytes = await Promise.all(assetPaths.map(async (asset) => {
  const path = resolve(publicOcr, asset.slice('/ocr/'.length));
  return (await stat(path)).size;
})).then((sizes) => sizes.reduce((sum, size) => sum + size, 0));

console.log(`Prepared local OCR runtime and Arabic/French/English models (${(totalBytes / 1024 / 1024).toFixed(1)} MiB).`);
