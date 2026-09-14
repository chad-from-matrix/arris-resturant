'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { Banner, Field, Spinner } from '@/components/ui/Primitives';
import { useApp } from '@/lib/app-context';
import { ROLE_LABELS } from '@/lib/permissions';
import { ADMIN_NAV, MOBILE_PRIMARY, type AdminNavItem } from './nav';

function LoginScreen() {
  const { signIn, accessError, firebaseReady, signOutUser, user } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch {
      setError('That email and password combination was not accepted.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="surface-espresso flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center">
          <Logo height={72} priority />
          <p className="label-text mt-4 text-[11px] text-gold">Staff &amp; Admin</p>
          <Ornament className="mt-3" width="w-14" />
        </div>

        <form onSubmit={submit} className="card-surface mt-8 space-y-4 p-6">
          {!firebaseReady ? (
            <Banner tone="danger">
              Firebase is not configured. Add your keys to <code>.env.local</code> and restart.
            </Banner>
          ) : null}
          {error ? <Banner tone="danger">{error}</Banner> : null}
          {accessError ? <Banner tone="danger">{accessError}</Banner> : null}

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="field"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="field"
            />
          </Field>
          <button type="submit" disabled={busy || !firebaseReady} className="btn btn-gold w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
          {user ? (
            <button type="button" onClick={() => void signOutUser()} className="btn btn-ghost w-full">
              Sign out {user.email}
            </button>
          ) : null}
          <p className="text-center text-xs text-marble-vein">
            <Link href="/" className="hover:text-gold">
              Back to the website
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: AdminNavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const groups = Array.from(new Set(items.map((item) => item.group)));
  return (
    <nav aria-label="Admin">
      {groups.map((group) => (
        <div key={group} className="mb-5">
          <p className="label-text px-3 text-[10px] text-gold/70">{group}</p>
          <ul className="mt-2 space-y-0.5">
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const active =
                  item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                        active
                          ? 'bg-gold text-espresso font-semibold'
                          : 'text-gold-pale/80 hover:bg-gold/10 hover:text-gold'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { staff, authLoading, signOutUser, can } = useApp();
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (authLoading) {
    return (
      <main className="surface-espresso flex min-h-screen items-center justify-center">
        <Spinner label="Checking your access…" />
      </main>
    );
  }

  if (!staff) return <LoginScreen />;

  const items = ADMIN_NAV.filter((item) => can(item.permission));
  const mobileItems = items.filter((item) => MOBILE_PRIMARY.includes(item.href));

  return (
    <div className="flex min-h-screen">
      {/* ---- desktop sidebar ---- */}
      <aside className="surface-espresso sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-line px-3 py-5 lg:flex">
        <Link href="/admin" className="mb-6 flex justify-center px-3">
          <Logo height={44} priority />
        </Link>
        <NavList items={items} pathname={pathname} />
        <div className="mt-auto border-t border-line px-3 pt-4">
          <p className="truncate text-sm font-semibold text-gold-pale">{staff.name}</p>
          <p className="label-text mt-0.5 text-[10px] text-gold">{ROLE_LABELS[staff.role]}</p>
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="btn btn-outline-light mt-3 w-full py-2 text-xs"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ---- mobile drawer ---- */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-espresso/70"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="surface-espresso absolute inset-y-0 left-0 w-72 overflow-y-auto px-3 py-5">
            <div className="mb-6 flex items-center justify-between px-3">
              <Logo height={40} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="btn btn-ghost h-9 min-h-0 w-9 p-0 text-lg text-gold-pale"
                aria-label="Close navigation"
              >
                ×
              </button>
            </div>
            <NavList items={items} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <div className="border-t border-line px-3 pt-4">
              <p className="truncate text-sm font-semibold text-gold-pale">{staff.name}</p>
              <p className="label-text mt-0.5 text-[10px] text-gold">{ROLE_LABELS[staff.role]}</p>
              <button
                type="button"
                onClick={() => void signOutUser()}
                className="btn btn-outline-light mt-3 w-full py-2 text-xs"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---- content ---- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-marble/95 backdrop-blur lg:static lg:bg-transparent lg:backdrop-blur-none">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="btn btn-outline h-10 min-h-0 w-10 p-0 lg:hidden"
              aria-label="Open navigation"
            >
              ☰
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="display-title truncate text-sm text-brown-deep sm:text-base">
                {title}
              </h1>
              {description ? (
                <p className="mt-0.5 truncate text-xs text-marble-vein">{description}</p>
              ) : null}
            </div>
            {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="flex-1 px-4 pb-28 pt-4 sm:px-6 lg:pb-10">{children}</main>

        {/* ---- mobile bottom bar ---- */}
        <nav
          aria-label="Admin quick navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 backdrop-blur lg:hidden"
        >
          <ul className="grid grid-cols-5">
            {mobileItems.map((item) => {
              const active =
                item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`label-text flex h-16 flex-col items-center justify-center gap-1 text-[10px] ${
                      active ? 'text-gold' : 'text-brown/70'
                    }`}
                  >
                    <span
                      className={`block h-1.5 w-1.5 rotate-45 ${active ? 'bg-gold' : 'bg-transparent'}`}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="label-text flex h-16 w-full flex-col items-center justify-center gap-1 text-[10px] text-brown/70"
              >
                <span className="block h-1.5 w-1.5 rotate-45 bg-transparent" />
                More
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

/** Wraps a page whose permission the signed-in role does not carry. */
export function PermissionGate({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useApp();
  if (can(permission)) return <>{children}</>;
  return (
    <Banner tone="danger">
      Your role does not have access to this section. Ask a super admin if you need it.
    </Banner>
  );
}
