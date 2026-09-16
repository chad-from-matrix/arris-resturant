/**
 * Signs into the admin dashboard as each role and checks that every screen
 * renders and that the sidebar offers a role only what it can actually use.
 *
 *   npm run emulators    # terminal 1
 *   npm run test:setup   # terminal 2
 *   npm run dev          # terminal 3
 *   npm run test:admin
 *
 * Rendered text is uppercased by CSS on .label-text, so the content matchers
 * are case-insensitive.
 */
import { mkdirSync } from 'node:fs';
import { chromium } from 'playwright';
const OUT = process.env.SHOT_DIR ?? '.playwright';
mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
page.on('pageerror', (e) => errs.push(String(e)));
page.on('response', (r) => {
  if (r.status() >= 400 && !/arris-logo\.png/.test(r.url())) errs.push(`${r.status()} ${r.url()}`);
});

await page.goto(`${BASE}/admin`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('input[type=email]', { timeout: 20000 });
await page.fill('input[type=email]', 'admin@arris.local');
await page.fill('input[type=password]', 'arris-super-1');
await page.click('button[type=submit]');
await page.waitForSelector('nav[aria-label="Admin"]', { timeout: 20000 });
await page.waitForTimeout(2500);

const results = [];
const pages = [
  ['/admin', 'Dashboard', /Sales today|Food cost/i],
  ['/admin/menu', 'Menu', /Cappuccino|Suqaar/i],
  ['/admin/expenses', 'Expenses', /Total in range|Daily sheet/i],
  ['/admin/reports', 'Reports', /Food cost|Arris 1 vs Arris 2/i],
  ['/admin/loyalty', 'Loyalty', /Stamp a card|Cards/i],
  ['/admin/qr-codes', 'QR Codes', /TABLE|QR base URL/i],
  ['/admin/settings', 'Settings', /Currency|Audit log/i],
  ['/admin/staff', 'Staff', /Super Admin|Manager/i],
  ['/admin/orders', 'Orders', /New|Preparing/i],
  ['/admin/tables', 'Tables', /Scan URL|In service/i],
  ['/admin/suppliers', 'Suppliers', /Al Noor|Supplier/i],
  ['/admin/sales', 'Sales', /Total sales|Record sales/i],
  ['/admin/customers', 'Customers', /Customers|Rewards ready/i],
  ['/admin/categories', 'Categories', /Breakfast Menu|Script title/i],
  ['/admin/branches', 'Branches', /Arris 1|Arris 2/i],
];
for (const [path, name, expect] of pages) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);
  const text = await page.locator('body').innerText();
  const ok = expect.test(text) && !/Application error|Unhandled/i.test(text);
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(12)} ${path}`);
  if (path === '/admin') await page.screenshot({ path: `${OUT}/admin-dashboard.png` });
  if (path === '/admin/expenses') await page.screenshot({ path: `${OUT}/admin-expenses.png` });
  if (path === '/admin/qr-codes') await page.screenshot({ path: `${OUT}/admin-qr.png` });
}

// Each role's sidebar must offer only what that role can actually use.
async function navFor(account, password) {
  await page.click('button:has-text("Sign out")').catch(() => {});
  await page.waitForSelector('input[type=email]', { timeout: 20000 });
  await page.fill('input[type=email]', account);
  await page.fill('input[type=password]', password);
  await page.click('button[type=submit]');
  await page.waitForSelector('nav[aria-label="Admin"]', { timeout: 20000 });
  await page.waitForTimeout(1200);
  return page.locator('nav[aria-label="Admin"]').first().innerText();
}

const staffNav = await navFor('staff@arris.local', 'arris-staff-1');
for (const label of ['Settings', 'Branches', 'Sales', 'Reports', 'Suppliers', 'Staff', 'Categories']) {
  results.push(`${staffNav.includes(label) ? 'FAIL' : 'PASS'}  staff nav hides ${label}`);
}
for (const label of ['Menu', 'Loyalty', 'Orders', 'Expenses', 'Customers']) {
  results.push(`${staffNav.includes(label) ? 'PASS' : 'FAIL'}  staff nav shows ${label}`);
}

const managerNav = await navFor('manager@arris.local', 'arris-manager-1');
results.push(`${managerNav.includes('Settings') ? 'FAIL' : 'PASS'}  manager nav hides Settings`);
for (const label of ['Reports', 'Sales', 'Suppliers', 'Branches', 'Staff', 'Tables', 'QR Codes']) {
  results.push(`${managerNav.includes(label) ? 'PASS' : 'FAIL'}  manager nav shows ${label}`);
}

results.push(`${errs.length === 0 ? 'PASS' : 'FAIL'}  no admin page errors${errs.length ? ` — ${errs.slice(0,3).join(' | ')}` : ''}`);

console.log(results.join('\n'));
console.log(`\n${results.filter((r) => r.startsWith('PASS')).length}/${results.length} admin checks passed`);
await browser.close();
process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
