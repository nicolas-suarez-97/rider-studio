/**
 * Grabación del producto real, por escenas, sin el estado de carga.
 * node scripts/promo/record-product.cjs
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.resolve('docs/promo/rider-studio-producto.mp4');
const BASE = process.env.PROMO_BASE || 'http://localhost:3000';
async function currentRiderPath(browser) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/artista`, { waitUntil: 'networkidle' });
  const href = await page.getByRole('link', { name: 'Continuar rider' }).getAttribute('href');
  await page.close();
  if (!href) throw new Error('No hay un rider en curso para grabar.');
  return href;
}

function ffmpegPath() {
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const bundled = '/tmp/ffbin/node_modules/ffmpeg-static/ffmpeg';
  if (fs.existsSync(bundled)) return bundled;
  return 'ffmpeg';
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smoothScroll(page, distance, duration) {
  await page.evaluate(async ({ distance, duration }) => {
    const scroller = [...document.querySelectorAll('main, [class*="overflow"]')]
      .find((el) => el.scrollHeight > el.clientHeight + 120) || document.scrollingElement;
    const start = scroller.scrollTop;
    const t0 = performance.now();
    await new Promise((resolve) => {
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const eased = 1 - (1 - p) ** 3;
        scroller.scrollTop = start + distance * eased;
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }, { distance, duration });
}

async function recordScene(browser, dir, run) {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir, size: { width: 1920, height: 1080 } },
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const sweep = () => document.querySelectorAll('nextjs-portal').forEach((node) => node.remove());
    sweep();
    setInterval(sweep, 150);
  });
  const started = Date.now();
  const mark = () => (Date.now() - started) / 1000;
  let skip = 0;
  await run(page, (seconds) => {
    skip = seconds;
  }, mark);
  const video = page.video();
  await context.close();
  return { file: await video.path(), skip };
}

function cut(input, output, start) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), [
      '-y',
      '-ss', start.toFixed(2),
      '-i', input,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-crf', '18',
      output,
    ], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rider-product-'));
  const browser = await chromium.launch({ headless: true });

  const landing = await recordScene(browser, dir, async (page, setSkip, mark) => {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Un show sin sorpresas' }).waitFor();
    setSkip(mark());
    await sleep(1400);
    await smoothScroll(page, 780, 2400);
    await sleep(1100);
    await smoothScroll(page, 640, 2000);
    await sleep(900);
  });

  const home = await recordScene(browser, dir, async (page, setSkip, mark) => {
    await page.goto(`${BASE}/artista`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'En curso' }).waitFor();
    setSkip(mark());
    await sleep(2200);
    await smoothScroll(page, 420, 1600);
    await sleep(900);
  });

  const workspacePath = await currentRiderPath(browser);
  const workspace = await recordScene(browser, dir, async (page, setSkip, mark) => {
    await page.goto(`${BASE}${workspacePath}`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Vista:/ }).waitFor();
    setSkip(mark());
    await sleep(1400);
    await page.getByRole('button', { name: /Vista:/ }).click();
    await sleep(700);
    const hospitality = page.getByRole('menuitem', { name: /Hospitality/ });
    if (await hospitality.count()) {
      await hospitality.first().click();
      await sleep(1400);
      await page.getByRole('button', { name: /Vista:/ }).click();
      await sleep(400);
      const todo = page.getByRole('menuitem', { name: /^Todo/ });
      if (await todo.count()) await todo.first().click();
      await sleep(600);
    }
    await page.mouse.move(860, 540);
    await smoothScroll(page, 700, 2200);
    await sleep(1000);
  });

  await browser.close();

  const clips = [
    { ...landing, out: path.join(dir, 'a.mp4') },
    { ...home, out: path.join(dir, 'b.mp4') },
    { ...workspace, out: path.join(dir, 'c.mp4') },
  ];
  for (const clip of clips) {
    await cut(clip.file, clip.out, clip.skip + 0.15);
  }

  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(list, clips.map((clip) => `file '${clip.out}'`).join('\n'));
  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', list,
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-crf', '18',
      OUT,
    ], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg concat ${code}`))));
  });
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(OUT);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
