import type { Timestamp } from 'firebase/firestore';

export type BranchType = 'restaurant' | 'cafe';
export type MenuSection = 'restaurant' | 'cafe';
export type RoleId = 'super_admin' | 'manager' | 'staff';

export interface Branch {
  id: string;
  slug: string;
  name: string;
  type: BranchType;
  hasCafe: boolean;
  parent?: string | null;
  address?: string;
  phone?: string;
  hours?: string;
  active: boolean;
  sort: number;
}

export interface RestaurantTable {
  id: string;
  branchSlug: string;
  number: string;
  active: boolean;
  seats?: number;
  note?: string;
  createdAt?: Timestamp | null;
}

export interface MenuCategory {
  id: string;
  slug: string;
  name: string;
  scriptTitle: string;
  section: MenuSection;
  sort: number;
  active: boolean;
  imageUrl?: string | null;
}

export interface MenuVariant {
  name: string;
  price: number;
}

export interface MenuItem {
  id: string;
  itemNumber: string;
  categorySlug: string;
  name: string;
  description?: string | null;
  /** Single price. Null when the item is priced through `variants`. */
  price: number | null;
  variants: MenuVariant[];
  imageUrl?: string | null;
  available: boolean;
  popular: boolean;
  isNew: boolean;
  featured: boolean;
  layout: 'grid' | 'full_width';
  badge?: string | null;
  badgeStyle?: string | null;
  loyaltyEligible: boolean;
  sort: number;
  updatedAt?: Timestamp | null;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  mobile: string;
  createdAt?: Timestamp | null;
}

export type LoyaltyStatus = 'collecting' | 'reward_ready';

export interface LoyaltyAccount {
  id: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  campaignId: string;
  stamps: number;
  requiredStamps: number;
  lifetimeStamps: number;
  rewardsRedeemed: number;
  status: LoyaltyStatus;
  lastStampAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type LoyaltyTxnType = 'stamp' | 'redeem';

export interface LoyaltyTransaction {
  id: string;
  txnRef: string;
  type: LoyaltyTxnType;
  customerId: string;
  customerCode: string;
  campaignId: string;
  branchSlug: string;
  staffUid: string;
  staffName: string;
  stampsBefore: number;
  stampsAfter: number;
  note?: string | null;
  createdAt?: Timestamp | null;
}

export interface LoyaltyCampaign {
  id: string;
  name: string;
  branchSlug: string;
  requiredStamps: number;
  rewardItem: string;
  rewardQuantity: number;
  eligibleItems: string[];
  active: boolean;
  marketingHeadline: string;
  marketingSubline: string;
}

export type OrderStatus = 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'preparing',
  'ready',
  'completed',
  'cancelled',
];

export interface OrderLine {
  itemId: string;
  itemNumber: string;
  name: string;
  variantName?: string | null;
  unitPrice: number;
  qty: number;
  notes?: string | null;
}

export interface Order {
  id: string;
  code: string;
  branchSlug: string;
  tableNumber: string;
  status: OrderStatus;
  lines: OrderLine[];
  itemCount: number;
  total: number;
  notes?: string | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  category: string;
  items: string[];
  active: boolean;
  note?: string;
}

export interface ExpenseCategory {
  id: string;
  group: string;
  items: string[];
  sort: number;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Bank Transfer' | 'Card' | 'Credit';

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Card',
  'Credit',
];

export interface Expense {
  id: string;
  /** ISO yyyy-mm-dd — stored as a string so day/week/month grouping needs no timezone maths. */
  date: string;
  branchSlug: string;
  categoryGroup: string;
  item: string;
  supplierId?: string | null;
  supplierName?: string | null;
  qty: number;
  unit: string;
  rate: number;
  total: number;
  paymentMethod: PaymentMethod;
  notes?: string | null;
  addedByUid: string;
  addedByName: string;
  /** Financial records are archived, never hard-deleted without a super admin. */
  archived: boolean;
  archivedByUid?: string | null;
  archivedAt?: Timestamp | null;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface Sale {
  id: string;
  date: string;
  branchSlug: string;
  amount: number;
  covers?: number | null;
  source: string;
  notes?: string | null;
  addedByUid: string;
  addedByName: string;
  archived: boolean;
  createdAt?: Timestamp | null;
}

export interface Staff {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: RoleId;
  /** 'all' grants every branch. */
  branchSlug: string;
  phone?: string;
  active: boolean;
  createdAt?: Timestamp | null;
}

export interface RoleDoc {
  id: RoleId;
  name: string;
  permissions: string[];
  sort: number;
}

export interface AuditLog {
  id: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'archive' | 'delete' | 'restore';
  field?: string | null;
  oldValue: string | null;
  newValue: string | null;
  userUid: string;
  userName: string;
  createdAt?: Timestamp | null;
}

export type NotificationType = 'call_staff' | 'request_bill' | 'order';

export interface AppNotification {
  id: string;
  type: NotificationType;
  branchSlug: string;
  tableNumber: string;
  message: string;
  status: 'open' | 'acknowledged';
  acknowledgedByUid?: string | null;
  createdAt?: Timestamp | null;
}

export interface PriceHistoryEntry {
  id: string;
  itemId: string;
  itemNumber: string;
  itemName: string;
  variantName?: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  changedByUid: string;
  changedByName: string;
  createdAt?: Timestamp | null;
}

export interface AppSettings {
  id: string;
  restaurantName: string;
  tagline: string;
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  logoUrl?: string | null;
  heroImageUrl?: string | null;
  contactPhone?: string;
  contactEmail?: string;
  instagram?: string;
  whatsapp?: string;
}
