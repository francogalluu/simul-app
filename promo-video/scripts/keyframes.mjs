// Renders still frames from the composition.
//   node scripts/keyframes.mjs                      -> key frames per scene into out/keyframes (full 1920x1080)
//   node scripts/keyframes.mjs out/review 0.5 10 20 -> given frames at half size (for reviewing)
//   COMP=SimulPromoES node scripts/keyframes.mjs out/keyframes-es -> Spanish version
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const KEY = {
  '01-hook-a': 40,
  '01-hook-b': 128,
  '02-idea-a': 200,
  '02-idea-b': 285,
  '03a-do-your-habit': 400,
  '03b-send-a-photo-a': 478,
  '03b-send-a-photo-b': 550,
  '03c-approve-a': 618,
  '03c-approve-b': 690,
  '04-why-it-works': 960,
  '05-closing': 1180,
};

// Editorial promo (COMP=SimulEditorial / SimulEditorialES): one or two key frames per scene.
const KEY_EDITORIAL = {
  '01-hook': 90,
  '02-idea': 240,
  '03a-do-your-habit-a': 310,
  '03a-do-your-habit-b': 385,
  '03b-send-a-photo': 500,
  '03c-partner-approves-a': 550,
  '03c-partner-approves-b': 620,
  '04-why-it-works-a': 760,
  '04-why-it-works-b': 900,
  '05-closing': 1100,
};

const [, , outArg, scaleArg, ...frameArgs] = process.argv;
const outDir = path.resolve(outArg ?? 'out/keyframes');
const scale = Number(scaleArg ?? 1);
const id = process.env.COMP ?? 'SimulPromo';
const jobs = frameArgs.length ? frameArgs.map((f) => [`f${String(f).padStart(4, '0')}`, Number(f)]) : Object.entries(id.startsWith('SimulEditorial') ? KEY_EDITORIAL : KEY);

fs.mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts') });

const composition = await selectComposition({ serveUrl, id, browserExecutable: process.env.BROWSER_EXECUTABLE || undefined });
for (const [name, frame] of jobs) {
  const output = path.join(outDir, `${name}.${scale < 1 ? 'jpg' : 'png'}`);
  await renderStill({ composition, serveUrl, frame, output, scale, browserExecutable: process.env.BROWSER_EXECUTABLE || undefined, ...(scale < 1 ? { imageFormat: 'jpeg', jpegQuality: 85 } : { imageFormat: 'png' }) });
  console.log('wrote', output);
}
