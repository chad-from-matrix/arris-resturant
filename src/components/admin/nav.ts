export interface AdminNavItem {
  href: string;
  label: string;
  permission: string;
  group: 'Overview' | 'Service' | 'Menu' | 'Finance' | 'People' | 'System';
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: '/admin', label: 'Dashboard', permission: 'dashboard.view', group: 'Overview' },
  { href: '/admin/orders', label: 'Orders', permission: 'orders.view', group: 'Service' },
  { href: '/admin/tables', label: 'Tables', permission: 'menu.view', group: 'Service' },
  { href: '/admin/qr-codes', label: 'QR Codes', permission: 'menu.view', group: 'Service' },
  { href: '/admin/menu', label: 'Menu', permission: 'menu.view', group: 'Menu' },
  { href: '/admin/categories', label: 'Categories', permission: 'menu.view', group: 'Menu' },
  { href: '/admin/loyalty', label: 'Loyalty', permission: 'loyalty.view', group: 'People' },
  { href: '/admin/customers', label: 'Customers', permission: 'customers.view', group: 'People' },
  { href: '/admin/staff', label: 'Staff', permission: 'dashboard.view', group: 'People' },
  { href: '/admin/expenses', label: 'Expenses', permission: 'expenses.view', group: 'Finance' },
  { href: '/admin/suppliers', label: 'Suppliers', permission: 'expenses.view', group: 'Finance' },
  { href: '/admin/sales', label: 'Sales', permission: 'sales.view', group: 'Finance' },
  { href: '/admin/reports', label: 'Reports', permission: 'reports.view', group: 'Finance' },
  { href: '/admin/branches', label: 'Branches', permission: 'dashboard.view', group: 'System' },
  { href: '/admin/settings', label: 'Settings', permission: 'dashboard.view', group: 'System' },
];

/** Tabs on the mobile bottom bar — the rest live behind "More". */
export const MOBILE_PRIMARY = ['/admin', '/admin/orders', '/admin/menu', '/admin/loyalty'];
