#!/usr/bin/env node
/**
 * One-shot generator: rasterises the MyEkLogo SVG into the iOS and
 * Android app-icon asset slots. Two colour variants are produced —
 * `light` (#F5F5F5 background) and `dark` (#0A0A0E background) — both
 * with the monogram in #C60C30. The iOS asset catalog uses the light
 * variant as default and additionally maps the dark variant via
 * `appearances` keys (iOS 18+ supports system-themed app icons).
 *
 * Run with:  node scripts/generateAppIcons.js
 *
 * Requires `sharp` to be available (this repo installs it on demand
 * via `npm install --no-save sharp` before running).
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SOURCE_SVG = path.join(ROOT, 'src/assets/MyEkLogo.svg');
const IOS_ICONSET = path.join(ROOT, 'ios/MyEK/Images.xcassets/AppIcon.appiconset');
const ANDROID_RES = path.join(ROOT, 'android/app/src/main/res');

const LOGO_FG = '#C60C30';
const LOGO_VIEWBOX = { w: 130.5, h: 90.4 };
// Logo footprint as a fraction of the canvas width. 1.0 = the monogram
// stretches edge-to-edge horizontally; iOS rounds the icon corners
// (~22% radius) but the monogram's ink doesn't reach the corner zones
// so nothing visible gets clipped. Vertical padding remains because
// the source SVG aspect (130.5 × 90.4) isn't square.
const COVERAGE = 1.0;

// ─── 1. Read and re-tint the monogram paths ─────────────────────────
const sourceSvg = fs.readFileSync(SOURCE_SVG, 'utf8');
// Strip the wrapping <svg>…</svg> so we can place the contents inside
// our own canvas. Keep only the <path> elements.
const innerPaths = sourceSvg
  .match(/<path[\s\S]*?\/>/g)
  ?.map(p => p.replace(/fill="#[A-Fa-f0-9]+"/, `fill="${LOGO_FG}"`))
  .join('\n') ?? '';

function buildIconSvg(bgColor) {
  const canvas = 1024;
  const logoW = canvas * COVERAGE;
  const logoH = logoW * (LOGO_VIEWBOX.h / LOGO_VIEWBOX.w);
  const tx = (canvas - logoW) / 2;
  const ty = (canvas - logoH) / 2;
  const scale = logoW / LOGO_VIEWBOX.w;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas}" height="${canvas}" viewBox="0 0 ${canvas} ${canvas}">
  <rect width="${canvas}" height="${canvas}" fill="${bgColor}"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
${innerPaths}
  </g>
</svg>`;
}

const LIGHT_SVG = buildIconSvg('#F5F5F5');
const DARK_SVG = buildIconSvg('#0A0A0E');

// ─── 2. iOS targets ─────────────────────────────────────────────────
const IOS_TARGETS = [
  { file: 'Icon-20@2x.png', size: 40 },
  { file: 'Icon-20@3x.png', size: 60 },
  { file: 'Icon-29@2x.png', size: 58 },
  { file: 'Icon-29@3x.png', size: 87 },
  { file: 'Icon-40@2x.png', size: 80 },
  { file: 'Icon-40@3x.png', size: 120 },
  { file: 'Icon-60@2x.png', size: 120 },
  { file: 'Icon-60@3x.png', size: 180 },
  { file: 'Icon-1024.png', size: 1024 },
];

// ─── 3. Android mipmap targets ──────────────────────────────────────
const ANDROID_DENSITIES = [
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

async function rasterise(svg, size, outPath) {
  await sharp(Buffer.from(svg), { density: 384 })
    .resize(size, size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

(async () => {
  // iOS — light variant takes the default filenames, dark variant gets
  // a `-Dark` suffix that the Contents.json references.
  for (const target of IOS_TARGETS) {
    const lightOut = path.join(IOS_ICONSET, target.file);
    await rasterise(LIGHT_SVG, target.size, lightOut);
    const darkName = target.file.replace('.png', '-Dark.png');
    const darkOut = path.join(IOS_ICONSET, darkName);
    await rasterise(DARK_SVG, target.size, darkOut);
    console.log(`  iOS  ${target.file}  +  ${darkName}`);
  }

  // Android — single set (themed icons require a separate adaptive-icon
  // pipeline; for now we ship the light variant as the standard
  // launcher icon, matching the historical behaviour).
  for (const d of ANDROID_DENSITIES) {
    const folder = path.join(ANDROID_RES, d.folder);
    await rasterise(LIGHT_SVG, d.size, path.join(folder, 'ic_launcher.png'));
    await rasterise(LIGHT_SVG, d.size, path.join(folder, 'ic_launcher_round.png'));
    console.log(`  Android  ${d.folder}/ic_launcher{,_round}.png  ${d.size}x${d.size}`);
  }

  console.log('\nDone.');
})().catch(e => {
  console.error(e);
  process.exit(1);
});
