/**
 * Spot motion graphics de Rider Studio.
 * Uso: node scripts/promo/render-promo.cjs [--frame 2.2] [--out docs/promo/rider-studio.mp4]
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');

const W = 1920;
const H = 1080;
const FPS = 30;
const DURATION = 16;

const FONT = '/System/Library/Fonts/Supplemental';
GlobalFonts.registerFromPath(path.join(FONT, 'Arial.ttf'), 'Promo');
GlobalFonts.registerFromPath(path.join(FONT, 'Arial Bold.ttf'), 'PromoBold');
GlobalFonts.registerFromPath(path.join(FONT, 'Arial Black.ttf'), 'PromoBlack');

const C = {
  bg: '#f4f2fb',
  ink: '#0f172a',
  body: '#475569',
  muted: '#94a3b8',
  line: '#e2e8f0',
  violet: '#7c3aed',
  indigo: '#4f46e5',
  sky: '#0284c7',
  amber: '#d97706',
  emerald: '#059669',
  white: '#ffffff',
};

function clamp(value) {
  return Math.max(0, Math.min(1, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function seg(time, start, end) {
  return clamp((time - start) / (end - start));
}

function easeOut(t) {
  const x = clamp(t);
  return 1 - (1 - x) ** 3;
}

function easeInOut(t) {
  const x = clamp(t);
  return x < 0.5 ? 4 * x * x * x : 1 - ((-2 * x + 2) ** 3) / 2;
}

function fadeWindow(time, enter, hold, leave) {
  const inn = easeOut(seg(time, enter, enter + 0.45));
  const out = 1 - easeInOut(seg(time, leave, leave + 0.4));
  if (time < hold) return inn;
  return Math.min(inn, out);
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function shadow(ctx, alpha = 0.08) {
  ctx.shadowColor = `rgba(15, 23, 42, ${alpha})`;
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 16;
}

function clearShadow(ctx) {
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawBackground(ctx, time) {
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  const orbs = [
    { x: 280 + Math.sin(time * 0.35) * 40, y: 180, r: 340, color: 'rgba(124, 58, 237, 0.16)' },
    { x: 1620 + Math.cos(time * 0.28) * 30, y: 860, r: 420, color: 'rgba(79, 70, 229, 0.12)' },
    { x: 980, y: 540 + Math.sin(time * 0.22) * 20, r: 260, color: 'rgba(2, 132, 199, 0.06)' },
  ];
  for (const orb of orbs) {
    const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r);
    gradient.addColorStop(0, orb.color);
    gradient.addColorStop(1, 'rgba(244, 242, 251, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawKicker(ctx, text, x, y) {
  ctx.font = '22px PromoBold';
  ctx.fillStyle = C.violet;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function drawIntro(ctx, time) {
  const alpha = fadeWindow(time, 0.15, 3.35, 3.55);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  const rise = lerp(28, 0, easeOut(seg(time, 0.15, 0.9)));
  ctx.translate(0, rise);
  drawKicker(ctx, 'RIDER STUDIO', W / 2, 360);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink;
  ctx.font = '92px PromoBlack';
  ctx.fillText('Un show', W / 2, 490);
  ctx.fillStyle = C.violet;
  const titleIn = easeOut(seg(time, 0.55, 1.25));
  ctx.globalAlpha = alpha * titleIn;
  ctx.fillText('sin sorpresas', W / 2, 600);
  ctx.globalAlpha = alpha * easeOut(seg(time, 1.15, 1.7));
  ctx.font = '32px Promo';
  ctx.fillStyle = C.body;
  ctx.fillText('El artista pide, el organizador confirma', W / 2, 690);
  ctx.fillText('y todo queda en el rider.', W / 2, 736);
  ctx.restore();
}

function drawCard(ctx, x, y, w, h, title, body, accent) {
  shadow(ctx, 0.07);
  ctx.fillStyle = C.white;
  roundRect(ctx, x, y, w, h, 28);
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  roundRect(ctx, x + 32, y + 32, 18, 18, 6);
  ctx.fill();
  ctx.fillStyle = C.ink;
  ctx.font = '30px PromoBold';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 32, y + 110);
  ctx.fillStyle = C.body;
  ctx.font = '24px Promo';
  const words = body.split(' ');
  let line = '';
  let lineY = y + 158;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > w - 64) {
      ctx.fillText(line, x + 32, lineY);
      line = word;
      lineY += 34;
    } else {
      line = next;
    }
  }
  if (line) ctx.fillText(line, x + 32, lineY);
}

function drawProblems(ctx, time) {
  const alpha = fadeWindow(time, 3.7, 6.15, 6.35);
  if (alpha <= 0.01) return;
  const cards = [
    ['El rider viejo', 'Cada fecha circula un PDF distinto.', C.violet],
    ['El correo perdido', 'Lo confirmado no queda junto al pedido.', C.sky],
    ['Nadie lo revisó', 'El día del show aparece algo sin confirmar.', C.amber],
  ];
  const width = 470;
  const height = 250;
  const gap = 32;
  const total = width * 3 + gap * 2;
  const startX = (W - total) / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.font = '22px PromoBold';
  ctx.fillStyle = C.muted;
  ctx.fillText('TRES SORPRESAS QUE SE ACABAN', W / 2, 250);
  cards.forEach((card, index) => {
    const enter = easeOut(seg(time, 3.85 + index * 0.18, 4.45 + index * 0.18));
    const x = startX + index * (width + gap);
    const y = lerp(520, 390, enter);
    ctx.save();
    ctx.globalAlpha = alpha * enter;
    drawCard(ctx, x, y, width, height, card[0], card[1], card[2]);
    ctx.restore();
  });
  ctx.restore();
}

function drawResolution(ctx, time) {
  const alpha = fadeWindow(time, 6.45, 7.7, 7.95);
  if (alpha <= 0.01) return;
  const scale = lerp(0.94, 1, easeOut(seg(time, 6.45, 7.05)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -H / 2);
  shadow(ctx, 0.1);
  ctx.fillStyle = C.white;
  roundRect(ctx, 460, 390, 1000, 280, 36);
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = 'rgba(124, 58, 237, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = C.violet;
  ctx.font = '22px PromoBold';
  ctx.fillText('UN SOLO RIDER', W / 2, 490);
  ctx.fillStyle = C.ink;
  ctx.font = '64px PromoBlack';
  ctx.fillText('Una versión. Un documento.', W / 2, 575);
  ctx.restore();
}

function drawDocument(ctx, time) {
  const alpha = fadeWindow(time, 8.05, 12.15, 12.4);
  if (alpha <= 0.01) return;
  const x = 390;
  const y = 150;
  const w = 1140;
  const h = 760;
  const rise = lerp(40, 0, easeOut(seg(time, 8.05, 8.7)));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(0, rise);
  shadow(ctx, 0.1);
  ctx.fillStyle = C.white;
  roundRect(ctx, x, y, w, h, 32);
  ctx.fill();
  clearShadow(ctx);
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = C.violet;
  roundRect(ctx, x + 40, y + 36, 14, 14, 4);
  ctx.fill();
  ctx.textAlign = 'left';
  ctx.font = '18px PromoBold';
  ctx.fillStyle = C.muted;
  ctx.fillText('RIDER TÉCNICO  ·  v3.1', x + 68, y + 50);
  ctx.fillStyle = C.ink;
  ctx.font = '42px PromoBlack';
  ctx.fillText('Atlas  ·  Gira de salas', x + 40, y + 112);

  const chips = [
    ['Técnico', '#f5f3ff', C.violet],
    ['Hospitality', '#f0f9ff', C.sky],
    ['Seguridad', '#fffbeb', C.amber],
  ];
  let chipX = x + 40;
  chips.forEach(([label, bg, color], index) => {
    const shown = easeOut(seg(time, 8.4 + index * 0.12, 8.85 + index * 0.12));
    ctx.save();
    ctx.globalAlpha = alpha * shown;
    ctx.font = '20px PromoBold';
    const chipW = ctx.measureText(label).width + 36;
    ctx.fillStyle = bg;
    roundRect(ctx, chipX, y + 140, chipW, 40, 20);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(label, chipX + 18, y + 167);
    ctx.restore();
    chipX += chipW + 12;
  });

  const rows = [
    ['01', 'Sistema de PA', '102 dBA continuo  ·  114 dBC pico en FOH'],
    ['02', 'Input list', 'Voz principal  ·  Beta 58A  ·  atril jirafa  ·  +48V'],
    ['03', 'Hospitality', 'Camerino a 21 °C  ·  agua sin gas, aparte del técnico'],
    ['04', 'Seguridad', 'Valla certificada  ·  foso libre para el equipo'],
  ];
  const rowH = 72;
  const rowGap = 12;
  const suggest = easeOut(seg(time, 10.15, 10.85));
  rows.forEach((row, index) => {
    const shown = easeOut(seg(time, 8.7 + index * 0.18, 9.2 + index * 0.18));
    const shift = index === 0 ? 0 : suggest * (rowH + rowGap);
    const rowY = y + 214 + index * (rowH + rowGap) + shift;
    ctx.save();
    ctx.globalAlpha = alpha * shown;
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, x + 32, rowY, w - 64, rowH, 16);
    ctx.fill();
    ctx.fillStyle = C.violet;
    ctx.font = '18px PromoBold';
    ctx.fillText(row[0], x + 52, rowY + 44);
    ctx.fillStyle = C.ink;
    ctx.font = '24px PromoBold';
    ctx.fillText(row[1], x + 112, rowY + 30);
    ctx.fillStyle = C.body;
    ctx.font = '18px Promo';
    ctx.fillText(row[2], x + 112, rowY + 56);
    ctx.restore();
  });

  if (suggest > 0) {
    const rowY = y + 214 + (rowH + rowGap);
    const slide = lerp(80, 0, suggest);
    ctx.save();
    ctx.globalAlpha = alpha * suggest;
    ctx.fillStyle = '#ecfdf5';
    roundRect(ctx, x + 32 + slide, rowY, w - 64, rowH, 16);
    ctx.fill();
    ctx.strokeStyle = '#6ee7b7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.emerald;
    ctx.font = '18px PromoBold';
    ctx.fillText('IA', x + 52 + slide, rowY + 44);
    ctx.font = '24px PromoBold';
    ctx.fillText('Sugerencia del chat', x + 112 + slide, rowY + 30);
    ctx.font = '18px Promo';
    ctx.fillText('Tierra aislada, solo para audio', x + 112 + slide, rowY + 56);
    ctx.restore();
  }
  ctx.restore();
}

function drawChecks(ctx, time) {
  const alpha = fadeWindow(time, 12.55, 15.55, 16.2);
  if (alpha <= 0.01) return;
  const lines = [
    'El artista pide',
    'El organizador confirma',
    'Todo queda en el rider',
  ];
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = C.violet;
  ctx.font = '22px PromoBold';
  ctx.fillText('RIDER STUDIO', W / 2, 250);
  ctx.fillStyle = C.ink;
  ctx.font = '78px PromoBlack';
  ctx.fillText('Un show sin sorpresas', W / 2, 360);

  lines.forEach((line, index) => {
    const shown = easeOut(seg(time, 13.05 + index * 0.28, 13.5 + index * 0.28));
    const y = 470 + index * 88;
    ctx.save();
    ctx.globalAlpha = alpha * shown;
    const textW = 520;
    const x = (W - textW) / 2;
    ctx.fillStyle = C.white;
    shadow(ctx, 0.05);
    roundRect(ctx, x, y, textW, 68, 34);
    ctx.fill();
    clearShadow(ctx);
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = C.emerald;
    ctx.beginPath();
    ctx.arc(x + 40, y + 34, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.white;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 33, y + 34);
    ctx.lineTo(x + 38, y + 40);
    ctx.lineTo(x + 48, y + 28);
    ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.font = '26px PromoBold';
    ctx.textAlign = 'left';
    ctx.fillText(line, x + 72, y + 43);
    ctx.restore();
  });
  ctx.restore();
}

function drawFrame(time) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  drawBackground(ctx, time);
  drawIntro(ctx, time);
  drawProblems(ctx, time);
  drawResolution(ctx, time);
  drawDocument(ctx, time);
  drawChecks(ctx, time);
  return canvas;
}

function parseArgs(argv) {
  const args = { out: path.join('docs', 'promo', 'rider-studio.mp4'), frame: null };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--out') args.out = argv[i + 1];
    if (argv[i] === '--frame') args.frame = Number(argv[i + 1]);
  }
  return args;
}

function ffmpegPath() {
  if (process.env.FFMPEG && fs.existsSync(process.env.FFMPEG)) return process.env.FFMPEG;
  const bundled = '/tmp/ffbin/node_modules/ffmpeg-static/ffmpeg';
  if (fs.existsSync(bundled)) return bundled;
  return 'ffmpeg';
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.frame != null) {
    const canvas = drawFrame(args.frame);
    const file = path.resolve(args.out);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, canvas.toBuffer('image/png'));
    console.log(file);
    return;
  }

  const outFile = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const frameDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rider-promo-'));
  const total = FPS * DURATION;
  for (let i = 0; i < total; i += 1) {
    const canvas = drawFrame(i / FPS);
    fs.writeFileSync(path.join(frameDir, `f${String(i).padStart(4, '0')}.jpg`), canvas.toBuffer('image/jpeg', 92));
    if (i % 60 === 0) console.log(`frame ${i}/${total}`);
  }

  await new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath(), [
      '-y',
      '-framerate', String(FPS),
      '-i', path.join(frameDir, 'f%04d.jpg'),
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-crf', '18',
      outFile,
    ], { stdio: 'inherit' });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg ${code}`))));
  });
  fs.rmSync(frameDir, { recursive: true, force: true });
  console.log(outFile);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
