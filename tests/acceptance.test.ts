/**
 * The acceptance checklist from the ARRIS build brief, run against the Firebase
 * Emulator Suite through the application's own data layer and security rules.
 *
 *   npm run emulators          # terminal 1
 *   npm run test:setup         # seed data + test logins
 *   npm test                   # this file
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { collection, doc, getDoc, getDocs, query, terminate, updateDoc, where } from 'firebase/firestore';
import { getDb } from '@/lib/firebase';
import { COL, DEFAULT_CAMPAIGN_ID } from '@/lib/db/collections';
import { getMenuItem, getPriceHistoryForItem, updateMenuItem } from '@/lib/db/menu';
import {
  LoyaltyError,
  addStamp,
  getCampaign,
  getLoyaltyAccount,
  redeemReward,
  registerCustomer,
  getCustomerHistory,
} from '@/lib/db/loyalty';
import { computeTotal, createExpense, MEAT_GROUP } from '@/lib/db/expenses';
import { formatMoney, DEFAULT_SETTINGS } from '@/lib/format';
import { parseTableSlug, tableQrUrl, extractLoyaltyCode } from '@/lib/table-link';
import { hasPermission } from '@/lib/permissions';
import type { Actor } from '@/lib/db/audit';
import type { AppSettings, Expense, LoyaltyCampaign, MenuItem } from '@/lib/types';
import { ACCOUNTS, expectPermissionDenied, signInAs, signOutAll } from './helpers';

let superAdmin: Actor;
let campaign: LoyaltyCampaign;
let settings: AppSettings;

/** Unique per run so repeated runs never collide on a transaction reference. */
const RUN = Date.now().toString(36).toUpperCase();

beforeAll(async () => {
  superAdmin = await signInAs(ACCOUNTS.superAdmin);
  const found = await getCampaign(DEFAULT_CAMPAIGN_ID);
  if (!found) throw new Error('Seed the emulator first: npm run test:setup');
  campaign = found;
  const snap = await getDoc(doc(getDb(), COL.settings, 'general'));
  settings = { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<AppSettings>) };
});

// Several tests deliberately sign out to prove the public/anonymous paths.
// Re-signing in here keeps one failure from cascading into the next test.
beforeEach(async () => {
  superAdmin = await signInAs(ACCOUNTS.superAdmin);
});

afterAll(async () => {
  await signOutAll();
  await terminate(getDb());
});

// ---------------------------------------------------------------- 1
describe('1. Scanning a table QR reaches the right branch and table', () => {
  it('resolves the printed slug to a seeded table document', async () => {
    expect(parseTableSlug('table-05')).toBe('05');
    expect(parseTableSlug('5')).toBe('05');

    const snap = await getDoc(doc(getDb(), COL.tables, 'arris-2__table-05'));
    expect(snap.exists()).toBe(true);
    expect(snap.data()?.branchSlug).toBe('arris-2');
    expect(snap.data()?.number).toBe('05');
    expect(snap.data()?.active).toBe(true);
  });

  it('builds the URL the QR encodes', () => {
    expect(tableQrUrl('https://arris.example.com/', 'arris-2', '05')).toBe(
      'https://arris.example.com/table/arris-2/table-05',
    );
  });

  it('seeds ten tables for each restaurant branch', async () => {
    for (const branch of ['arris-1', 'arris-2']) {
      const snap = await getDocs(
        query(collection(getDb(), COL.tables), where('branchSlug', '==', branch)),
      );
      expect(snap.size).toBe(10);
    }
  });
});

// ---------------------------------------------------------------- 2
describe('2. A price change reaches the customer menu and the price history', () => {
  it('moves Cappuccino / Latte from ₹100 to ₹110 and logs it', async () => {
    const before = await getMenuItem('drink-coffee-02');
    expect(before).not.toBeNull();
    expect(before!.name).toBe('Cappuccino / Latte');
    expect(before!.price).toBe(100);

    const { id: _id, updatedAt: _u, ...draft } = before as MenuItem;
    await updateMenuItem(superAdmin, before!, { ...draft, price: 110 });

    // What the customer menu reads.
    const after = await getMenuItem('drink-coffee-02');
    expect(after!.price).toBe(110);
    expect(formatMoney(after!.price, settings)).toBe('₹110');

    const history = await getPriceHistoryForItem('drink-coffee-02');
    const entry = history.find((h) => h.oldPrice === 100 && h.newPrice === 110);
    expect(entry).toBeDefined();
    expect(entry!.changedByName).toBe(ACCOUNTS.superAdmin.name);

    // Put it back so a re-run starts from the seeded price.
    await updateMenuItem(superAdmin, after!, { ...draft, price: 100 });
    expect((await getMenuItem('drink-coffee-02'))!.price).toBe(100);
  });
});

// ---------------------------------------------------------------- 3 & 4
describe('3–4. The loyalty cycle, and one reference is worth one stamp', () => {
  it('registers, stamps to 10/10, redeems back to 0/10 and logs every step', async () => {
    const { code } = await registerCustomer('Acceptance Tester', '9876543210', campaign);
    expect(code).toMatch(/^ARR-[A-Z0-9]{6}$/);

    const fresh = await getLoyaltyAccount(code);
    expect(fresh!.stamps).toBe(0);
    expect(fresh!.requiredStamps).toBe(10);

    for (let i = 1; i <= 10; i += 1) {
      const account = await addStamp(superAdmin, {
        customerCode: code,
        txnRef: `${RUN}-BILL-${i}`,
        branchSlug: 'arris-2-cafe',
        campaign,
      });
      expect(account.stamps).toBe(i);
    }

    const full = await getLoyaltyAccount(code);
    expect(full!.stamps).toBe(10);
    expect(full!.status).toBe('reward_ready');

    // An 11th stamp is refused while the reward is pending.
    await expect(
      addStamp(superAdmin, {
        customerCode: code,
        txnRef: `${RUN}-BILL-11`,
        branchSlug: 'arris-2-cafe',
        campaign,
      }),
    ).rejects.toThrow(/full/i);

    await redeemReward(superAdmin, {
      customerCode: code,
      txnRef: `${RUN}-REDEEM-1`,
      branchSlug: 'arris-2-cafe',
      campaign,
    });

    const reset = await getLoyaltyAccount(code);
    expect(reset!.stamps).toBe(0);
    expect(reset!.status).toBe('collecting');
    expect(reset!.rewardsRedeemed).toBe(1);
    expect(reset!.lifetimeStamps).toBe(10);

    const history = await getCustomerHistory(code);
    expect(history.filter((h) => h.type === 'stamp')).toHaveLength(10);
    expect(history.filter((h) => h.type === 'redeem')).toHaveLength(1);
  });

  it('refuses to reuse a transaction reference for a second stamp', async () => {
    const { code } = await registerCustomer('Duplicate Ref Tester', '9000000001', campaign);
    const ref = `${RUN}-DUPLICATE`;

    const first = await addStamp(superAdmin, {
      customerCode: code,
      txnRef: ref,
      branchSlug: 'arris-2-cafe',
      campaign,
    });
    expect(first.stamps).toBe(1);

    await expect(
      addStamp(superAdmin, {
        customerCode: code,
        txnRef: ref,
        branchSlug: 'arris-2-cafe',
        campaign,
      }),
    ).rejects.toBeInstanceOf(LoyaltyError);

    // The count did not move.
    expect((await getLoyaltyAccount(code))!.stamps).toBe(1);
    expect((await getCustomerHistory(code)).filter((h) => h.type === 'stamp')).toHaveLength(1);
  });

  it('treats a reference as the same one regardless of case or spacing', async () => {
    const { code } = await registerCustomer('Case Tester', '9000000002', campaign);
    await addStamp(superAdmin, {
      customerCode: code,
      txnRef: `${RUN}-case-ref`,
      branchSlug: 'arris-2-cafe',
      campaign,
    });
    await expect(
      addStamp(superAdmin, {
        customerCode: code,
        txnRef: ` ${RUN}-CASE-REF `,
        branchSlug: 'arris-2-cafe',
        campaign,
      }),
    ).rejects.toThrow(/already been used/i);
  });
});

// ---------------------------------------------------------------- 5
describe('5. A customer can never stamp their own card', () => {
  it('rejects a stamp from an unauthenticated device', async () => {
    const { code } = await registerCustomer('Self Stamp Tester', '9000000003', campaign);
    await signOutAll();

    // The client guard.
    await expect(
      addStamp({ uid: '', name: 'Customer' }, {
        customerCode: code,
        txnRef: `${RUN}-SELF-1`,
        branchSlug: 'arris-2-cafe',
        campaign,
      }),
    ).rejects.toThrow(/staff/i);

    // And the security rules, bypassing the client guard entirely.
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.loyaltyAccounts, code), { stamps: 10 }),
    );

    expect((await getLoyaltyAccount(code))!.stamps).toBe(0);
    superAdmin = await signInAs(ACCOUNTS.superAdmin);
  });

  it('lets a customer read their own card but not list the customer directory', async () => {
    const { code } = await registerCustomer('Public Read Tester', '9000000004', campaign);
    await signOutAll();

    const card = await getDoc(doc(getDb(), COL.loyaltyAccounts, code));
    expect(card.exists()).toBe(true);
    expect(card.data()?.customerName).toBe('Public Read Tester');

    // The phone number lives on the staff-only customer record.
    await expectPermissionDenied(() => getDoc(doc(getDb(), COL.customers, code)));
    await expectPermissionDenied(() => getDocs(collection(getDb(), COL.customers)));

    superAdmin = await signInAs(ACCOUNTS.superAdmin);
  });
});

// ---------------------------------------------------------------- 6
describe('6. An expense auto-calculates and flows into every report', () => {
  it('records 20 KG of beef at ₹500 as ₹10,000', async () => {
    expect(computeTotal(20, 500)).toBe(10_000);

    const date = '2026-09-14';
    const id = await createExpense(superAdmin, {
      date,
      branchSlug: 'arris-1',
      categoryGroup: MEAT_GROUP,
      item: 'Beef',
      supplierId: 'al-noor-meat-supply',
      supplierName: 'Al Noor Meat Supply',
      qty: 20,
      unit: 'KG',
      rate: 500,
      total: 0, // deliberately wrong — the service recomputes Qty × Rate
      paymentMethod: 'Cash',
      notes: 'Acceptance test',
      addedByUid: superAdmin.uid,
      addedByName: superAdmin.name,
    });

    const saved = (await getDoc(doc(getDb(), COL.expenses, id))).data() as Expense;
    expect(saved.total).toBe(10_000);
    expect(formatMoney(saved.total, settings)).toBe('₹10,000');
    expect(saved.archived).toBe(false);

    // The daily sheet, meat report and supplier report all read the same rows.
    const dayRows = (
      await getDocs(query(collection(getDb(), COL.expenses), where('date', '==', date)))
    ).docs.map((d) => d.data() as Expense);

    const dailyTotal = dayRows.filter((r) => !r.archived).reduce((s, r) => s + r.total, 0);
    expect(dailyTotal).toBeGreaterThanOrEqual(10_000);

    const meatRows = dayRows.filter((r) => !r.archived && r.categoryGroup === MEAT_GROUP);
    expect(meatRows.some((r) => r.item === 'Beef' && r.total === 10_000)).toBe(true);

    const meatQty = meatRows.reduce((s, r) => s + r.qty, 0);
    const meatAmount = meatRows.reduce((s, r) => s + r.total, 0);
    expect(meatAmount / meatQty).toBeGreaterThan(0); // average rate is computable

    const supplierRows = dayRows.filter((r) => r.supplierName === 'Al Noor Meat Supply');
    expect(supplierRows.reduce((s, r) => s + r.total, 0)).toBeGreaterThanOrEqual(10_000);
  });
});

// ---------------------------------------------------------------- 7
describe('7. The branch filter separates Arris 1, Arris 2 and Arris 2 Café', () => {
  it('seeds the three branches with the right shape', async () => {
    const snap = await getDocs(collection(getDb(), COL.branches));
    const branches = snap.docs.map((d) => d.data());
    expect(branches).toHaveLength(3);

    const arris2 = branches.find((b) => b.slug === 'arris-2');
    expect(arris2?.hasCafe).toBe(true);
    const cafe = branches.find((b) => b.slug === 'arris-2-cafe');
    expect(cafe?.type).toBe('cafe');
    expect(cafe?.parent).toBe('arris-2');
    expect(branches.find((b) => b.slug === 'arris-1')?.hasCafe).toBe(false);
  });

  it('keeps each branch’s expenses apart', async () => {
    const snap = await getDocs(
      query(collection(getDb(), COL.expenses), where('branchSlug', '==', 'arris-2-cafe')),
    );
    const rows = snap.docs.map((d) => d.data() as Expense);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.branchSlug === 'arris-2-cafe')).toBe(true);
  });
});

// ---------------------------------------------------------------- 8
describe('8. A staff login cannot reach expense deletion or settings', () => {
  it('blocks price changes, expense deletion and settings writes', async () => {
    const staff = await signInAs(ACCOUNTS.staff);
    expect(hasPermission('staff', 'menu.manage')).toBe(false);
    expect(hasPermission('staff', 'loyalty.stamp')).toBe(true);

    // Prices are manager-and-above.
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.menuItems, 'drink-coffee-02'), { price: 1 }),
    );

    // Settings are super-admin only.
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.settings, 'general'), { currencySymbol: '$' }),
    );

    // Financial records cannot be deleted or revised by staff.
    const anyExpense = (await getDocs(collection(getDb(), COL.expenses))).docs[0];
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.expenses, anyExpense.id), { total: 1 }),
    );
    const { deleteDoc } = await import('firebase/firestore');
    await expectPermissionDenied(() => deleteDoc(doc(getDb(), COL.expenses, anyExpense.id)));

    // But a stamp — which staff are meant to do — still works.
    const { code } = await registerCustomer('Staff Stamp Tester', '9000000005', campaign);
    const account = await addStamp(staff, {
      customerCode: code,
      txnRef: `${RUN}-STAFF-STAMP`,
      branchSlug: 'arris-2-cafe',
      campaign,
    });
    expect(account.stamps).toBe(1);

    superAdmin = await signInAs(ACCOUNTS.superAdmin);
  });

  it('lets a manager change a price but not the currency', async () => {
    const manager = await signInAs(ACCOUNTS.manager);
    const item = await getMenuItem('breakfast-01');
    const { id: _id, updatedAt: _u, ...draft } = item as MenuItem;

    await updateMenuItem(manager, item!, { ...draft, price: 210 });
    expect((await getMenuItem('breakfast-01'))!.price).toBe(210);

    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.settings, 'general'), { currencySymbol: '$' }),
    );

    const restored = await getMenuItem('breakfast-01');
    await updateMenuItem(manager, restored!, { ...draft, price: 200 });
    superAdmin = await signInAs(ACCOUNTS.superAdmin);
  });

  it('lets a manager revise an expense without the rules erroring out', async () => {
    // Regression guard: role helpers that chain several exists()/get() calls
    // exceed the rules access-call limit and fail a legitimate write with an
    // evaluation error rather than a clean allow.
    const id = await createExpense(superAdmin, {
      date: '2026-09-14',
      branchSlug: 'arris-1',
      categoryGroup: MEAT_GROUP,
      item: 'Mutton',
      supplierId: 'al-noor-meat-supply',
      supplierName: 'Al Noor Meat Supply',
      qty: 4,
      unit: 'KG',
      rate: 750,
      total: 0,
      paymentMethod: 'Cash',
      notes: 'Manager edit guard',
      addedByUid: superAdmin.uid,
      addedByName: superAdmin.name,
    });

    const manager = await signInAs(ACCOUNTS.manager);
    await updateDoc(doc(getDb(), COL.expenses, id), { qty: 6, total: computeTotal(6, 750) });
    const revised = (await getDoc(doc(getDb(), COL.expenses, id))).data() as Expense;
    expect(revised.total).toBe(4_500);

    // Archiving is the manager's route; hard deletion is not.
    await updateDoc(doc(getDb(), COL.expenses, id), { archived: true });
    const { deleteDoc } = await import('firebase/firestore');
    await expectPermissionDenied(() => deleteDoc(doc(getDb(), COL.expenses, id)));
    expect(manager.name).toBe(ACCOUNTS.manager.name);
  });

  it('denies a signed-in user with no staff record', async () => {
    // roleOf() must collapse a missing staff document to 'none' rather than
    // throwing on a null dereference.
    const { createUserWithEmailAndPassword } = await import('firebase/auth');
    const { getAuthClient } = await import('@/lib/firebase');
    const email = `ghost-${Date.now()}@arris.local`;
    await createUserWithEmailAndPassword(getAuthClient(), email, 'ghost-password-1');

    await expectPermissionDenied(() => getDocs(collection(getDb(), COL.expenses)));
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.menuItems, 'drink-coffee-02'), { available: false }),
    );
  });

  it('lets a super admin write settings through the same role helper', async () => {
    // The deny path through role() logs a first-pass evaluation error in the
    // emulator before settling on a clean false. This proves the helper still
    // resolves correctly when the answer is allow.
    const ref = doc(getDb(), COL.settings, 'general');
    await updateDoc(ref, { contactPhone: '+91 90000 12345' });
    expect((await getDoc(ref)).data()?.contactPhone).toBe('+91 90000 12345');
    await updateDoc(ref, { contactPhone: '' });
  });

  it('keeps the audit log append-only', async () => {
    const logs = await getDocs(collection(getDb(), COL.auditLogs));
    expect(logs.size).toBeGreaterThan(0);
    const first = logs.docs[0];
    await expectPermissionDenied(() =>
      updateDoc(doc(getDb(), COL.auditLogs, first.id), { newValue: 'tampered' }),
    );
  });
});

// ---------------------------------------------------------------- 9 & 10
describe('9–10. Menu cards carry their badge number, and variants keep every row', () => {
  it('gives every seeded item the printed badge number and a category', async () => {
    const snap = await getDocs(collection(getDb(), COL.menuItems));
    expect(snap.size).toBe(72);

    for (const docSnap of snap.docs) {
      const item = docSnap.data();
      expect(String(item.itemNumber)).toMatch(/^\d{2}$/);
      expect(item.categorySlug).toBeTruthy();
      // Exactly one pricing model per card: a single price or variant rows.
      const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
      expect(hasVariants ? item.price === null : typeof item.price === 'number').toBe(true);
    }
  });

  it('keeps all four Bariis rows and the three full-width feature cards', async () => {
    const bariis = await getMenuItem('lunch-dinner-13');
    expect(bariis!.name).toBe('Bariis');
    expect(bariis!.price).toBeNull();
    expect(bariis!.variants).toHaveLength(4);
    expect(bariis!.variants.map((v) => v.price)).toEqual([130, 200, 200, 400]);
    expect(bariis!.variants.map((v) => formatMoney(v.price, settings))).toEqual([
      '₹130',
      '₹200',
      '₹200',
      '₹400',
    ]);

    for (const id of ['lunch-dinner-41', 'lunch-dinner-42', 'lunch-dinner-43', 'lunch-dinner-44']) {
      const item = await getMenuItem(id);
      expect(item!.layout).toBe('full_width');
      expect(item!.featured).toBe(true);
    }

    const friday = await getMenuItem('lunch-dinner-43');
    expect(friday!.name).toBe('Hilib Dhaylo Waslad');
    expect(friday!.badge).toBe('Only for special Fridays');
    expect(friday!.price).toBe(1300);
  });

  it('marks the loyalty-eligible coffees', async () => {
    expect((await getMenuItem('drink-coffee-02'))!.loyaltyEligible).toBe(true);
    expect((await getMenuItem('drink-coffee-03'))!.loyaltyEligible).toBe(true);
    expect((await getMenuItem('fresh-juice-01'))!.loyaltyEligible).toBe(false);
  });
});

// ---------------------------------------------------------------- 11
describe('11. Every price renders in rupees, with no decimals', () => {
  it('formats through the seeded settings', () => {
    expect(settings.currencySymbol).toBe('₹');
    expect(settings.currencyPosition).toBe('before');
    expect(settings.decimalPlaces).toBe(0);

    expect(formatMoney(200, settings)).toBe('₹200');
    expect(formatMoney(1300, settings)).toBe('₹1,300');
    expect(formatMoney(1600, settings)).toBe('₹1,600');
    expect(formatMoney(10_000, settings)).toBe('₹10,000');
    expect(formatMoney(0, settings)).toBe('₹0');
    expect(formatMoney(null, settings)).toBe('—');
  });

  it('formats every seeded price without a decimal point', async () => {
    const snap = await getDocs(collection(getDb(), COL.menuItems));
    for (const docSnap of snap.docs) {
      const item = docSnap.data();
      const prices: number[] = item.variants?.length
        ? item.variants.map((v: { price: number }) => v.price)
        : [item.price];
      for (const price of prices) {
        const rendered = formatMoney(price, settings);
        expect(rendered.startsWith('₹')).toBe(true);
        expect(rendered).not.toContain('.');
      }
    }
  });
});

// ---------------------------------------------------------------- extras
describe('Loyalty QR round-trip', () => {
  it('reads a code back out of a scanned card URL', () => {
    expect(extractLoyaltyCode('https://arris.example.com/loyalty/card/ARR-4F82K1')).toBe(
      'ARR-4F82K1',
    );
    expect(extractLoyaltyCode('arr-4f82k1')).toBe('ARR-4F82K1');
    expect(extractLoyaltyCode('https://example.com/not-a-card')).toBeNull();
    expect(extractLoyaltyCode('hello')).toBeNull();
  });
});
