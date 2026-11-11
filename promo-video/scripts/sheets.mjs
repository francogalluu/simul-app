// Review aid: renders contact sheets (30 frames each) covering the whole video.
//   node scripts/sheets.mjs [step=5] [from=0] [to=1200] [lang=en|es]
//   SHEET=EditorialSheet node scripts/sheets.mjs 5 0 1140 en   -> the editorial promo (prefix ed-)
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const step = Number(process.argv[2] ?? 5);
const from = Number(process.argv[3] ?? 0);
const to = Number(process.argv[4] ?? 1200);
const lang = process.argv[5] ?? 'en';
const sheet = process.env.SHEET ?? 'ContactSheet';
const browserExecutable = process.env.BROWSER_EXECUTABLE || undefined;
const outDir = path.resolve('out/review/sheets');
fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });
for (let start = from; start < to; start += step * 30) {
  const inputProps = { start, step, lang };
  const composition = await selectComposition({ serveUrl, id: sheet, inputProps, browserExecutable });
  const output = path.join(outDir, `${sheet === 'ContactSheet' ? '' : 'ed-'}${lang}-sheet-${String(start).padStart(4, '0')}-s${step}.jpg`);
  await renderStill({ composition, serveUrl, frame: 0, output, inputProps, browserExecutable, imageFormat: 'jpeg', jpegQuality: 80, timeoutInMilliseconds: 120000 });
  console.log('wrote', output);
}
