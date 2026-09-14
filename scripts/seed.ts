/**
 * Loads data/arris-seed-data.json into Firestore.
 *
 *   npm run seed                 # data only
 *   npm run seed -- --with-admin # data + the first super admin Auth user
 *   npm run seed -- --force      # overwrite documents that already exist
 *
 * Against the live project this needs GOOGLE_APPLICATION_CREDENTIALS pointing
 * at a service-account key. Against the emulators, set
 * FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 and
 * FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 instead — no key required.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

loadEnv({ path: '.env.local' });
loadEnv();

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const WITH_ADMIN = args.has('--with-admin');

interface SeedVariant {
  name: string;
  price: number;
}

interface SeedItem {
  item_number: string;
  category: string;
  name: string;
  description?: string;
  price?: number;
  variants?: SeedVariant[];
  popular?: boolean;
  featured?: boolean;
  layout?: string;
  badge?: string;
  badge_style?: string;
  loyalty_eligible?: boolean;
}

interface SeedFile {
  settings: Record<string, unknown>;
  branches: {
    slug: string;
    name: string;
    type: string;
    has_cafe?: boolean;
    parent?: string;
  }[];
  tables: { branch: string; numbers: string[] }[];
  menu_categories: {
    slug: string;
    name: string;
    script_title: string;
    sort: number;
    section: string;
  }[];
  menu_items: SeedItem[];
  loyalty_campaign: {
    name: string;
    branch: string;
    required_stamps: number;
    reward_item: string;
    reward_quantity: number;
    eligible_items: string[];
    active: boolean;
    marketing_headline: string;
    marketing_subline: string;
  };
  expense_categories: { group: string; items: string[] }[];
  sample_suppliers: { name: string; phone: string; category: string; items: string[] }[];
  sample_expenses: {
    date: string;
    branch: string;
    category: string;
    item: string;
    supplier: string | null;
    qty: number;
    unit: string;
    rate: number;
    total: number;
    payment_method: string;
  }[];
  roles: { name: string; permissions: string[] }[];
}

const ROLE_IDS: Record<string, string> = {
  'Super Admin': 'super_admin',
  Manager: 'manager',
  Staff: 'staff',
};

function initAdmin() {
  if (getApps().length) return;
  const projectId =
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'arris-local';
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const usingEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

  if (usingEmulator) {
    initializeApp({ projectId });
    return;
  }
  if (keyPath) {
    const key = JSON.parse(readFileSync(resolve(keyPath), 'utf8'));
    initializeApp({ credential: cert(key), projectId: key.project_id ?? projectId });
    return;
  }
  initializeApp({ credential: applicationDefault(), projectId });
}

/** Writes only when the document is absent, unless --force was passed. */
async function put(
  db: Firestore,
  collection: string,
  id: string,
  data: Record<string, unknown>,
  counters: { written: number; skipped: number },
) {
  const ref = db.collection(collection).doc(id);
  if (!FORCE) {
    const snap = await ref.get();
    if (snap.exists) {
      counters.skipped += 1;
      return;
    }
  }
  await ref.set(data, { merge: true });
  counters.written += 1;
}

async function main() {
  initAdmin();
  const db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });

  const seed = JSON.parse(
    readFileSync(resolve(process.cwd(), 'data/arris-seed-data.json'), 'utf8'),
  ) as SeedFile;

  const counters = { written: 0, skipped: 0 };

  // ---- settings ----
  await put(
    db,
    'settings',
    'general',
    {
      restaurantName: seed.settings.restaurant_name,
      tagline: seed.settings.tagline,
      currencyCode: seed.settings.currency_code,
      currencySymbol: seed.settings.currency_symbol,
      currencyPosition: seed.settings.currency_position,
      decimalPlaces: seed.settings.decimal_places,
      logoUrl: null,
      heroImageUrl: null,
      contactPhone: '',
      contactEmail: '',
      instagram: '',
      whatsapp: '',
    },
    counters,
  );

  // ---- branches ----
  for (const [index, branch] of seed.branches.entries()) {
    await put(
      db,
      'branches',
      branch.slug,
      {
        slug: branch.slug,
        name: branch.name,
        type: branch.type,
        hasCafe: Boolean(branch.has_cafe),
        parent: branch.parent ?? null,
        address: '',
        phone: '',
        hours: '',
        active: true,
        sort: index + 1,
      },
      counters,
    );
  }

  // ---- tables ----
  for (const group of seed.tables) {
    for (const number of group.numbers) {
      await put(
        db,
        'tables',
        `${group.branch}__table-${number}`,
        {
          branchSlug: group.branch,
          number,
          seats: null,
          active: true,
          createdAt: FieldValue.serverTimestamp(),
        },
        counters,
      );
    }
  }

  // ---- menu categories ----
  for (const category of seed.menu_categories) {
    await put(
      db,
      'menuCategories',
      category.slug,
      {
        slug: category.slug,
        name: category.name,
        scriptTitle: category.script_title,
        section: category.section,
        sort: category.sort,
        active: true,
        imageUrl: null,
      },
      counters,
    );
  }

  const categorySort = new Map(seed.menu_categories.map((c) => [c.slug, c.sort]));

  // ---- menu items ----
  const perCategory = new Map<string, number>();
  for (const item of seed.menu_items) {
    const index = (perCategory.get(item.category) ?? 0) + 1;
    perCategory.set(item.category, index);
    const id = `${item.category}-${item.item_number}`;
    await put(
      db,
      'menuItems',
      id,
      {
        itemNumber: item.item_number,
        categorySlug: item.category,
        name: item.name,
        description: item.description ?? null,
        price: item.variants?.length ? null : (item.price ?? 0),
        variants: item.variants ?? [],
        imageUrl: null,
        available: true,
        popular: Boolean(item.popular),
        isNew: false,
        featured: Boolean(item.featured),
        layout: item.layout === 'full_width' ? 'full_width' : 'grid',
        badge: item.badge ?? null,
        badgeStyle: item.badge_style ?? null,
        loyaltyEligible: Boolean(item.loyalty_eligible),
        sort: (categorySort.get(item.category) ?? 9) * 1000 + index,
        updatedAt: FieldValue.serverTimestamp(),
      },
      counters,
    );
  }

  // ---- loyalty campaign ----
  const campaign = seed.loyalty_campaign;
  await put(
    db,
    'loyaltyCampaigns',
    'coffee-loyalty',
    {
      name: campaign.name,
      branchSlug: campaign.branch,
      requiredStamps: campaign.required_stamps,
      rewardItem: campaign.reward_item,
      rewardQuantity: campaign.reward_quantity,
      eligibleItems: campaign.eligible_items,
      active: campaign.active,
      marketingHeadline: campaign.marketing_headline,
      marketingSubline: campaign.marketing_subline,
    },
    counters,
  );

  // ---- expense categories ----
  for (const [index, group] of seed.expense_categories.entries()) {
    await put(
      db,
      'expenseCategories',
      group.group.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      { group: group.group, items: group.items, sort: index + 1 },
      counters,
    );
  }

  // ---- suppliers ----
  const supplierIds = new Map<string, string>();
  for (const supplier of seed.sample_suppliers) {
    const id = supplier.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    supplierIds.set(supplier.name, id);
    await put(
      db,
      'suppliers',
      id,
      {
        name: supplier.name,
        phone: supplier.phone,
        category: supplier.category,
        items: supplier.items,
        active: true,
        note: '',
      },
      counters,
    );
  }

  // ---- sample expenses ----
  for (const [index, expense] of seed.sample_expenses.entries()) {
    await put(
      db,
      'expenses',
      `seed-${expense.date}-${index + 1}`,
      {
        date: expense.date,
        branchSlug: expense.branch,
        categoryGroup: expense.category,
        item: expense.item,
        supplierId: expense.supplier ? (supplierIds.get(expense.supplier) ?? null) : null,
        supplierName: expense.supplier,
        qty: expense.qty,
        unit: expense.unit,
        rate: expense.rate,
        total: expense.total,
        paymentMethod: expense.payment_method,
        notes: 'Seed data',
        addedByUid: 'seed',
        addedByName: 'Seed',
        archived: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      counters,
    );
  }

  // ---- roles ----
  for (const [index, roleDoc] of seed.roles.entries()) {
    const id = ROLE_IDS[roleDoc.name] ?? roleDoc.name.toLowerCase().replace(/\s+/g, '_');
    await put(
      db,
      'roles',
      id,
      { name: roleDoc.name, permissions: roleDoc.permissions, sort: index + 1 },
      counters,
    );
  }

  console.log(`Seed complete — ${counters.written} written, ${counters.skipped} left untouched.`);
  if (counters.skipped && !FORCE) {
    console.log('Re-run with --force to overwrite the existing documents.');
  }

  // ---- first super admin ----
  if (WITH_ADMIN) {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME ?? 'Super Admin';
    if (!email || !password) {
      console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD to create the first admin.');
      process.exitCode = 1;
      return;
    }
    const auth = getAuth();
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(email)).uid;
      console.log(`Auth user ${email} already exists — reusing it.`);
    } catch {
      uid = (await auth.createUser({ email, password, displayName: name })).uid;
      console.log(`Created Auth user ${email}.`);
    }
    await db.collection('staff').doc(uid).set(
      {
        name,
        email,
        role: 'super_admin',
        branchSlug: 'all',
        phone: '',
        active: true,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    console.log(`Super admin ready: ${email}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
