import type { RoleId } from './types';

/**
 * Permission sets mirror `roles` in arris-seed-data.json and the Firestore
 * security rules. The rules are the real gate — this drives the UI.
 *
 * Every admin screen needs a permission only the roles meant to open it hold.
 * Keying a screen off a broad permission like `dashboard.view` puts it in the
 * staff sidebar even though the rules would refuse the writes behind it.
 * `settings.manage` is deliberately super-admin only.
 */
export const ROLE_PERMISSIONS: Record<RoleId, string[]> = {
  super_admin: ['*'],
  manager: [
    'dashboard.view',
    'menu.view',
    'menu.manage',
    'categories.manage',
    'tables.manage',
    'loyalty.view',
    'loyalty.manage',
    'loyalty.stamp',
    'loyalty.redeem',
    'customers.view',
    'expenses.view',
    'expenses.create',
    'expenses.edit',
    'suppliers.view',
    'suppliers.manage',
    'sales.view',
    'sales.create',
    'reports.view',
    'orders.view',
    'orders.manage',
    'staff.view',
    'branches.view',
  ],
  staff: [
    'dashboard.view',
    'menu.view',
    'loyalty.view',
    'loyalty.stamp',
    'loyalty.redeem',
    'customers.view',
    'orders.view',
    'expenses.create',
    'expenses.view',
  ],
};

export const ROLE_LABELS: Record<RoleId, string> = {
  super_admin: 'Super Admin',
  manager: 'Manager',
  staff: 'Staff',
};

export function hasPermission(role: RoleId | null | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.includes('*') || perms.includes(permission);
}

export function hasAnyPermission(role: RoleId | null | undefined, permissions: string[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}
