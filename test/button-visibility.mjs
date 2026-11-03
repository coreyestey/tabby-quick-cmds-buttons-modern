import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = `file:///${path.resolve(__dirname, 'button-visibility.html').replace(/\\/g, '/')}`;

// Parse "rgb(r, g, b)" / "rgba(r, g, b, a)" into {r,g,b,a}.
function parseColor(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(s => parseFloat(s.trim()));
  return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
}

// Rough per-channel distance; "distinguishable" needs a visible gap.
function channelDistance(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

const MIN_DISTANCE = 30; // sum of channel deltas that reads as a visible difference

let failed = 0;
const fail = msg => { console.log(`FAIL ${msg}`); failed++; };
const pass = msg => console.log(`PASS ${msg}`);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(htmlPath);
await page.waitForSelector('.quick-cmd-command-button');

const btn = page.locator('.quick-cmd-command-button').first();

// Read computed styles of the button AT REST (no hover) and the panel behind it.
const styles = await btn.evaluate(el => {
  const cs = getComputedStyle(el);
  const panel = el.closest('.quick-cmd-panel');
  const panelBg = panel ? getComputedStyle(panel).backgroundColor : getComputedStyle(document.body).backgroundColor;
  return { border: cs.borderTopColor, text: cs.color, panelBg };
});

const border = parseColor(styles.border);
const text = parseColor(styles.text);
const panelBg = parseColor(styles.panelBg);

// 1. Border must not be fully transparent at rest (the original bug).
if (border && border.a > 0) pass(`border not transparent (${styles.border})`);
else fail(`border is transparent at rest (${styles.border})`);

// 2. Border must be distinguishable from the panel background.
if (border && panelBg && border.a > 0 && channelDistance(border, panelBg) >= MIN_DISTANCE) {
  pass(`border distinguishable from panel (${styles.border} vs ${styles.panelBg})`);
} else {
  fail(`border blends into panel (${styles.border} vs ${styles.panelBg})`);
}

// 3. Label text must be readable against the panel background.
if (text && panelBg && channelDistance(text, panelBg) >= MIN_DISTANCE) {
  pass(`label readable against panel (${styles.text} vs ${styles.panelBg})`);
} else {
  fail(`label blends into panel (${styles.text} vs ${styles.panelBg})`);
}

await browser.close();

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' failed'}`);
process.exit(failed > 0 ? 1 : 0);
