// Génère les icônes PNG (180, 192, 512 + maskable) à partir d'une goutte SVG, via Chromium (Playwright).
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const ACCENT = '#0f766e';
const drop = (scale, fill) => `
  <g transform="translate(256 262) scale(${scale}) translate(-256 -262)">
    <path d="M256 78 C256 78 130 232 130 334 a126 126 0 0 0 252 0 C382 232 256 78 256 78 Z" fill="${fill}"/>
    <path d="M200 352 a56 56 0 0 0 52 56" fill="none" stroke="${ACCENT}" stroke-width="22" stroke-linecap="round" opacity=".55"/>
  </g>`;
const svg = (bg, scale, radius) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="${radius}" fill="${bg}"/>${drop(scale, '#ffffff')}</svg>`;

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon.svg', svg(ACCENT, 1, 112));

const targets = [
  ['icon-180.png', 180, svg(ACCENT, 1, 0)], // iOS arrondit lui-même
  ['icon-192.png', 192, svg(ACCENT, 1, 112)],
  ['icon-512.png', 512, svg(ACCENT, 1, 112)],
  ['icon-maskable-512.png', 512, svg(ACCENT, 0.72, 0)], // goutte dans la zone de sécurité de 80 %
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, markup] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0;background:transparent">${markup.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body>`);
  await page.screenshot({ path: `public/icons/${name}`, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  console.log(name);
}
await browser.close();
