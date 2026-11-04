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

// --- Command button, at rest (no hover) ---
const btn = page.locator('.quick-cmd-command-button').first();
const btnStyles = await btn.evaluate(el => {
  const cs = getComputedStyle(el);
  const panel = el.closest('.quick-cmd-panel');
  const panelBg = panel ? getComputedStyle(panel).backgroundColor : getComputedStyle(document.body).backgroundColor;
  return { border: cs.borderTopColor, text: cs.color, panelBg };
});
{
  const border = parseColor(btnStyles.border);
  const text = parseColor(btnStyles.text);
  const panelBg = parseColor(btnStyles.panelBg);

  if (border && border.a > 0) pass(`button border not transparent (${btnStyles.border})`);
  else fail(`button border is transparent at rest (${btnStyles.border})`);

  if (border && panelBg && border.a > 0 && channelDistance(border, panelBg) >= MIN_DISTANCE)
    pass(`button border distinguishable from panel (${btnStyles.border} vs ${btnStyles.panelBg})`);
  else fail(`button border blends into panel (${btnStyles.border} vs ${btnStyles.panelBg})`);

  if (text && panelBg && channelDistance(text, panelBg) >= MIN_DISTANCE)
    pass(`button label readable against panel (${btnStyles.text} vs ${btnStyles.panelBg})`);
  else fail(`button label blends into panel (${btnStyles.text} vs ${btnStyles.panelBg})`);
}

// --- Inactive tab header, at rest (not active, not hovered) ---
const tab = page.locator('.tabs-component-tab:not(.is-active) .tabs-component-tab-a').first();
const tabStyles = await tab.evaluate(el => {
  const cs = getComputedStyle(el);
  const bar = el.closest('.tabs-component-tabs');
  const barBg = bar ? getComputedStyle(bar).backgroundColor : getComputedStyle(document.body).backgroundColor;
  return { text: cs.color, barBg };
});
{
  const text = parseColor(tabStyles.text);
  const barBg = parseColor(tabStyles.barBg);
  if (text && barBg && channelDistance(text, barBg) >= MIN_DISTANCE)
    pass(`inactive tab header readable against tab bar (${tabStyles.text} vs ${tabStyles.barBg})`);
  else fail(`inactive tab header blends into tab bar (${tabStyles.text} vs ${tabStyles.barBg})`);
}

await browser.close();

console.log(`\n${failed === 0 ? 'ALL PASS' : failed + ' failed'}`);
process.exit(failed > 0 ? 1 : 0);
