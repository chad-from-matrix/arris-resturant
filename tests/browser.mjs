/**
 * Browser checks for the brand rules the printed menu fixes in place — the gold
 * ring, the numbered badge, the ornament divider, variant price rows, the
 * rupee symbol — plus the QR table landing and mobile layout.
 *
 * Needs the emulators seeded and `npm run dev` running:
 *   npm run emulators   # terminal 1
 *   npm run test:setup  # terminal 2
 *   npm run dev         # terminal 3
 *   npm run test:browser
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = process.env.SHOT_DIR ?? '.playwright';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const results = [];
const check = (name, pass, detail = '') =>
  results.push({ name, pass, detail });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);

// Phone-sized viewport — most customers arrive by scanning a table QR.
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
// The brand logo file is supplied by the restaurant; until it is dropped into
// public/brand/ the component falls back to the wordmark and the browser logs
// one 404 for it. Every other failed request is a real error.
// Firestore's long-poll listen channel is aborted whenever we navigate away —
// that is normal listener teardown, not a failure.
const ignorable = (t) =>
  /arris-logo\.png/.test(t) || /google\.firestore\.v1\.Firestore\/Listen/.test(t);
// The console message for a failed subresource does not carry the URL, so
// judge network failures from the response itself.
const GENERIC_RESOURCE_ERROR = /Failed to load resource/i;
page.on('console', (m) => {
  if (m.type() === 'error' && !GENERIC_RESOURCE_ERROR.test(m.text())) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push(String(e)));
page.on('response', (r) => {
  if (r.status() >= 400 && !ignorable(r.url())) errors.push(`${r.status()} ${r.url()}`);
});
page.on('requestfailed', (r) => {
  if (!ignorable(r.url())) errors.push(`${r.url()} ${r.failure()?.errorText ?? ''}`);
});

// ---- digital menu ----
await page.goto(`${BASE}/menu`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('[data-testid="menu-card"]', { timeout: 20000 });

const cardCount = await page.locator('[data-testid="menu-card"]').count();
check('menu renders grid cards', cardCount > 20, `${cardCount} cards`);

const fullWidth = await page.locator('[data-testid="menu-card-full"]').count();
check('full-width feature cards render', fullWidth === 4, `${fullWidth} full-width cards`);

const badges = await page.locator('.item-badge').allTextContents();
check('every card carries a numbered badge', badges.length >= cardCount && badges.every((b) => /^\d{2}$/.test(b.trim())),
  `${badges.length} badges, first: ${badges.slice(0, 3).join(',')}`);

// Acceptance 9: gold ring + numbered badge + ornament divider on every card.
const dividers = await page.evaluate(() => {
  const cards = document.querySelectorAll('[data-testid="menu-card"]');
  let withDivider = 0;
  let goldDiamond = 0;
  for (const card of cards) {
    // The divider is a hairline rule either side of a rotated gold diamond.
    const diamond = card.querySelector('div[aria-hidden="true"] > span.rotate-45');
    if (!diamond) continue;
    withDivider += 1;
    const bg = getComputedStyle(diamond).backgroundColor;
    const rules = diamond.parentElement.querySelectorAll('span.h-px');
    if (bg === 'rgb(230, 151, 25)' && rules.length === 2) goldDiamond += 1;
  }
  return { cards: cards.length, withDivider, goldDiamond };
});
check('every card carries the gold ornament divider',
  dividers.withDivider === dividers.cards && dividers.goldDiamond === dividers.cards,
  JSON.stringify(dividers));

const ring = await page.locator('.photo-ring').first().evaluate((el) => {
  const s = getComputedStyle(el);
  return { width: s.borderTopWidth, color: s.borderTopColor, radius: s.borderTopLeftRadius };
});
check('photo ring is a 4px gold circle', ring.width === '4px' && ring.color === 'rgb(230, 151, 25)',
  JSON.stringify(ring));

const bodyText = await page.locator('main').innerText();
check('prices render with the rupee symbol', /₹\d/.test(bodyText), bodyText.match(/₹[\d,]+/g)?.slice(0, 5).join(' '));
check('no price shows decimals', !/₹[\d,]+\.\d/.test(bodyText));

// Variant item keeps every price row on one card.
await page.getByPlaceholder(/Search a dish/i).fill('Bariis');
await page.waitForTimeout(600);
const bariisCard = page.locator('[data-testid="menu-card"]').first();
const bariisText = await bariisCard.innerText();
const bariisRows = (bariisText.match(/₹[\d,]+/g) ?? []);
check('variant card shows all four Bariis rows', bariisRows.length >= 4, bariisRows.join(' '));

// Clear the variant search before filtering by branch.
await page.getByPlaceholder(/Search a dish/i).fill('');
await page.waitForTimeout(600);

// Acceptance 7: the branch filter separates the three operations.
const categoriesFor = async (branchSlug) => {
  await page.selectOption('select[aria-label="Filter by branch"]', branchSlug);
  await page.waitForTimeout(800);
  return (await page.locator('section[id] h2.script-title').allTextContents()).map((t) => t.trim());
};
const cafeOnly = await categoriesFor('arris-2-cafe');
check('Arris 2 Café shows only café categories',
  cafeOnly.length > 0 && cafeOnly.every((c) => /Fresh Juice|Drink & Coffee/i.test(c)),
  cafeOnly.join(' / '));
const arris1 = await categoriesFor('arris-1');
check('Arris 1 shows only restaurant categories',
  arris1.length > 0 && arris1.every((c) => /Breakfast|Lunch & Dinner/i.test(c)),
  arris1.join(' / '));
const arris2 = await categoriesFor('arris-2');
check('Arris 2 shows restaurant and café categories',
  arris2.some((c) => /Breakfast|Lunch & Dinner/i.test(c)) &&
    arris2.some((c) => /Fresh Juice|Drink & Coffee/i.test(c)),
  arris2.join(' / '));
await page.selectOption('select[aria-label="Filter by branch"]', '');
await page.waitForTimeout(600);

// Script section title uses Great Vibes.
await page.getByPlaceholder(/Search a dish/i).fill('');
await page.waitForTimeout(600);
const scriptFont = await page.locator('.script-title').first().evaluate((el) => getComputedStyle(el).fontFamily);
check('section titles use the script face', /Great Vibes/i.test(scriptFont), scriptFont);

// No horizontal scrolling at phone width.
const overflow = await page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
}));
check('no horizontal overflow at 390px', overflow.scroll <= overflow.client + 1, JSON.stringify(overflow));
await page.screenshot({ path: `${OUT}/menu-mobile.png`, fullPage: false });

// ---- table QR landing ----
await page.goto(`${BASE}/table/arris-2/table-05`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const tableText = await page.locator('main').innerText();
check('table page greets the right branch', /Welcome to Arris 2/i.test(tableText));
check('table page shows the table number', /\b05\b/.test(tableText));
for (const label of ['View Menu', 'Café', 'Loyalty Card', 'Call Staff', 'Request Bill']) {
  check(`table page offers "${label}"`, tableText.includes(label));
}
await page.screenshot({ path: `${OUT}/table-mobile.png` });

// ---- loyalty ----
await page.goto(`${BASE}/loyalty`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
const loyaltyText = await page.locator('main').innerText();
check('loyalty page shows the campaign headline', /YOUR COFFEE\. YOUR REWARD\./i.test(loyaltyText));
await page.screenshot({ path: `${OUT}/loyalty-mobile.png` });

// ---- desktop menu ----
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await desktop.goto(`${BASE}/menu`, { waitUntil: 'domcontentloaded' });
await desktop.waitForSelector('[data-testid="menu-card"]', { timeout: 20000 });
const railVisible = await desktop.locator('.fixed.right-3').first().isVisible().catch(() => false);
check('gold ornament rail shows on desktop', railVisible);
const cols = await desktop.locator('[data-testid="menu-card"]').first().evaluate((el) => {
  const grid = el.parentElement;
  return getComputedStyle(grid).gridTemplateColumns.split(' ').length;
});
check('desktop menu uses 3–4 columns', cols >= 3 && cols <= 4, `${cols} columns`);
const desktopCards = await desktop.evaluate(() => {
  const cards = document.querySelectorAll('[data-testid="menu-card"]');
  let complete = 0;
  for (const card of cards) {
    const badge = card.querySelector('.item-badge');
    const ring = card.querySelector('.photo-ring');
    const diamond = card.querySelector('div[aria-hidden="true"] > span.rotate-45');
    if (badge && ring && diamond) complete += 1;
  }
  return { cards: cards.length, complete };
});
check('desktop cards keep ring, badge and divider',
  desktopCards.cards > 0 && desktopCards.complete === desktopCards.cards,
  JSON.stringify(desktopCards));
await desktop.screenshot({ path: `${OUT}/menu-desktop.png`, fullPage: false });

// ---- admin login gate ----
await desktop.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
// Wait for the auth check to resolve rather than guessing at a delay.
const signInVisible = await desktop
  .waitForSelector('input[type=email]', { timeout: 20000 })
  .then(() => true)
  .catch(() => false);
const adminText = await desktop.locator('body').innerText();
check(
  'admin is gated behind a sign-in',
  signInVisible && /Sign in/i.test(adminText),
  signInVisible ? '' : adminText.slice(0, 80),
);
await desktop.screenshot({ path: `${OUT}/admin-login.png` });

check('no page errors or failed requests', errors.length === 0, errors.slice(0, 3).join(' | '));

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.pass) failed += 1;
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
console.log(`\n${results.length - failed}/${results.length} browser checks passed`);
process.exit(failed ? 1 : 0);
