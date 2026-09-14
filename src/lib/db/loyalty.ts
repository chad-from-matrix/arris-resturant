import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDb } from '../firebase';
import type {
  Customer,
  LoyaltyAccount,
  LoyaltyCampaign,
  LoyaltyTransaction,
} from '../types';
import { COL, DEFAULT_CAMPAIGN_ID } from './collections';
import type { Actor } from './audit';

/** Unambiguous alphabet — no O/0, I/1, so codes survive being read aloud. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export class LoyaltyError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'LoyaltyError';
    this.code = code;
  }
}

function randomCode(): string {
  const bytes = new Uint8Array(6);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (const byte of bytes) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  return `ARR-${out}`;
}

export function normalizeMobile(input: string): string {
  const digits = input.replace(/[^\d]/g, '');
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function maskMobile(mobile: string): string {
  if (mobile.length < 4) return '••••';
  return `•••••• ${mobile.slice(-4)}`;
}

/** One transaction reference maps to exactly one stamp document. */
export function transactionDocId(campaignId: string, txnRef: string): string {
  const clean = txnRef.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-');
  return `${campaignId}__${clean}`;
}

export async function getCampaign(
  campaignId = DEFAULT_CAMPAIGN_ID,
): Promise<LoyaltyCampaign | null> {
  const snap = await getDoc(doc(getDb(), COL.loyaltyCampaigns, campaignId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as LoyaltyCampaign) : null;
}

export function subscribeCampaign(
  campaignId: string,
  cb: (campaign: LoyaltyCampaign | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    doc(getDb(), COL.loyaltyCampaigns, campaignId),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as LoyaltyCampaign) : null),
    onError,
  );
}

/**
 * Registers a walk-in customer. The customer code doubles as the document id,
 * so the loyalty card can be fetched by code alone — no directory listing.
 * Re-registering the same mobile returns the existing card.
 */
export async function registerCustomer(
  name: string,
  rawMobile: string,
  campaign: LoyaltyCampaign,
): Promise<{ code: string; existing: boolean }> {
  const db = getDb();
  const mobile = normalizeMobile(rawMobile);
  const cleanName = name.trim();

  if (cleanName.length < 2) throw new LoyaltyError('invalid-name', 'Please enter your full name.');
  if (mobile.length !== 10) {
    throw new LoyaltyError('invalid-mobile', 'Please enter a valid 10-digit mobile number.');
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const customerRef = doc(db, COL.customers, code);
    const accountRef = doc(db, COL.loyaltyAccounts, code);

    const created = await runTransaction(db, async (tx) => {
      const existing = await tx.get(customerRef);
      if (existing.exists()) return false;

      tx.set(customerRef, {
        code,
        name: cleanName,
        mobile,
        mobileMasked: maskMobile(mobile),
        createdAt: serverTimestamp(),
      });
      tx.set(accountRef, {
        customerId: code,
        customerCode: code,
        customerName: cleanName,
        campaignId: campaign.id,
        stamps: 0,
        requiredStamps: campaign.requiredStamps,
        lifetimeStamps: 0,
        rewardsRedeemed: 0,
        status: 'collecting',
        lastStampAt: null,
        updatedAt: serverTimestamp(),
      });
      return true;
    });

    if (created) return { code, existing: false };
  }

  throw new LoyaltyError('code-collision', 'Could not allocate a loyalty code. Please try again.');
}

export async function getLoyaltyAccount(code: string): Promise<LoyaltyAccount | null> {
  const snap = await getDoc(doc(getDb(), COL.loyaltyAccounts, code.trim().toUpperCase()));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as LoyaltyAccount) : null;
}

export function subscribeLoyaltyAccount(
  code: string,
  cb: (account: LoyaltyAccount | null) => void,
  onError?: (e: Error) => void,
) {
  return onSnapshot(
    doc(getDb(), COL.loyaltyAccounts, code),
    (snap) => cb(snap.exists() ? ({ id: snap.id, ...snap.data() } as LoyaltyAccount) : null),
    onError,
  );
}

export function subscribeLoyaltyAccounts(
  cb: (rows: LoyaltyAccount[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(collection(getDb(), COL.loyaltyAccounts), orderBy('updatedAt', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoyaltyAccount)),
    onError,
  );
}

export async function getCustomerHistory(code: string): Promise<LoyaltyTransaction[]> {
  const q = query(
    collection(getDb(), COL.loyaltyTransactions),
    where('customerId', '==', code),
    orderBy('createdAt', 'desc'),
    limit(200),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoyaltyTransaction);
}

export function subscribeCustomerHistory(
  code: string,
  cb: (rows: LoyaltyTransaction[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(
    collection(getDb(), COL.loyaltyTransactions),
    where('customerId', '==', code),
    orderBy('createdAt', 'desc'),
    limit(200),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoyaltyTransaction)),
    onError,
  );
}

export function subscribeRecentLoyaltyTransactions(
  max: number,
  cb: (rows: LoyaltyTransaction[]) => void,
  onError?: (e: Error) => void,
) {
  const q = query(
    collection(getDb(), COL.loyaltyTransactions),
    orderBy('createdAt', 'desc'),
    limit(max),
  );
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LoyaltyTransaction)),
    onError,
  );
}

export interface StampInput {
  customerCode: string;
  txnRef: string;
  branchSlug: string;
  campaign: LoyaltyCampaign;
  note?: string;
}

/**
 * Adds one stamp inside a Firestore transaction. The reference document is
 * created — never overwritten — so replaying the same bill number is rejected
 * atomically even if two staff phones fire at once. `actor` is the signed-in
 * staff member; the security rules refuse the write for anyone else, which is
 * what stops a customer stamping their own card.
 */
export async function addStamp(actor: Actor, input: StampInput): Promise<LoyaltyAccount> {
  if (!actor.uid) {
    throw new LoyaltyError('not-staff', 'Only signed-in staff can add a stamp.');
  }
  const code = input.customerCode.trim().toUpperCase();
  const txnRef = input.txnRef.trim();
  if (!txnRef) {
    throw new LoyaltyError('missing-ref', 'A bill / transaction reference is required.');
  }

  const db = getDb();
  const accountRef = doc(db, COL.loyaltyAccounts, code);
  const txnRefDoc = doc(db, COL.loyaltyTransactions, transactionDocId(input.campaign.id, txnRef));

  return runTransaction(db, async (tx) => {
    const [accountSnap, txnSnap] = await Promise.all([tx.get(accountRef), tx.get(txnRefDoc)]);

    if (!accountSnap.exists()) {
      throw new LoyaltyError('no-account', `No loyalty card found for ${code}.`);
    }
    if (txnSnap.exists()) {
      throw new LoyaltyError(
        'duplicate-ref',
        `Transaction ${txnRef} has already been used for a stamp.`,
      );
    }

    const account = accountSnap.data() as LoyaltyAccount;
    const required = account.requiredStamps || input.campaign.requiredStamps;

    if (account.stamps >= required) {
      throw new LoyaltyError(
        'reward-pending',
        'This card is full. Redeem the free coffee before adding more stamps.',
      );
    }

    const stampsAfter = account.stamps + 1;
    const status = stampsAfter >= required ? 'reward_ready' : 'collecting';

    tx.set(txnRefDoc, {
      txnRef,
      type: 'stamp',
      customerId: code,
      customerCode: code,
      campaignId: input.campaign.id,
      branchSlug: input.branchSlug,
      staffUid: actor.uid,
      staffName: actor.name,
      stampsBefore: account.stamps,
      stampsAfter,
      note: input.note ?? null,
      createdAt: serverTimestamp(),
    });

    tx.update(accountRef, {
      stamps: stampsAfter,
      lifetimeStamps: (account.lifetimeStamps ?? 0) + 1,
      status,
      requiredStamps: required,
      lastStampAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return { ...account, id: code, stamps: stampsAfter, status } as LoyaltyAccount;
  });
}

export interface RedeemInput {
  customerCode: string;
  txnRef: string;
  branchSlug: string;
  campaign: LoyaltyCampaign;
}

/** Redeems a full card: 10/10 → 0/10, logged as its own transaction. */
export async function redeemReward(actor: Actor, input: RedeemInput): Promise<LoyaltyAccount> {
  if (!actor.uid) {
    throw new LoyaltyError('not-staff', 'Only signed-in staff can redeem a reward.');
  }
  const code = input.customerCode.trim().toUpperCase();
  const txnRef = input.txnRef.trim();
  if (!txnRef) {
    throw new LoyaltyError('missing-ref', 'A redemption reference is required.');
  }

  const db = getDb();
  const accountRef = doc(db, COL.loyaltyAccounts, code);
  const txnRefDoc = doc(db, COL.loyaltyTransactions, transactionDocId(input.campaign.id, txnRef));

  return runTransaction(db, async (tx) => {
    const [accountSnap, txnSnap] = await Promise.all([tx.get(accountRef), tx.get(txnRefDoc)]);

    if (!accountSnap.exists()) {
      throw new LoyaltyError('no-account', `No loyalty card found for ${code}.`);
    }
    if (txnSnap.exists()) {
      throw new LoyaltyError('duplicate-ref', `Reference ${txnRef} has already been used.`);
    }

    const account = accountSnap.data() as LoyaltyAccount;
    const required = account.requiredStamps || input.campaign.requiredStamps;

    if (account.stamps < required) {
      throw new LoyaltyError(
        'not-ready',
        `Card is at ${account.stamps}/${required}. The reward is not unlocked yet.`,
      );
    }

    tx.set(txnRefDoc, {
      txnRef,
      type: 'redeem',
      customerId: code,
      customerCode: code,
      campaignId: input.campaign.id,
      branchSlug: input.branchSlug,
      staffUid: actor.uid,
      staffName: actor.name,
      stampsBefore: account.stamps,
      stampsAfter: 0,
      note: `Redeemed ${input.campaign.rewardQuantity} × ${input.campaign.rewardItem}`,
      createdAt: serverTimestamp(),
    });

    tx.update(accountRef, {
      stamps: 0,
      status: 'collecting',
      rewardsRedeemed: (account.rewardsRedeemed ?? 0) + 1,
      updatedAt: serverTimestamp(),
    });

    return { ...account, id: code, stamps: 0, status: 'collecting' } as LoyaltyAccount;
  });
}

export async function getCustomer(code: string): Promise<Customer | null> {
  const snap = await getDoc(doc(getDb(), COL.customers, code.trim().toUpperCase()));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Customer) : null;
}

export function subscribeCustomers(cb: (rows: Customer[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(getDb(), COL.customers), orderBy('createdAt', 'desc'), limit(500));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Customer)),
    onError,
  );
}

export async function updateCampaign(
  campaignId: string,
  patch: Partial<LoyaltyCampaign>,
): Promise<void> {
  await updateDoc(doc(getDb(), COL.loyaltyCampaigns, campaignId), patch);
}
