'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/brand/Logo';
import { Ornament } from '@/components/brand/Ornament';
import { useApp } from '@/lib/app-context';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/menu?section=cafe', label: 'Café' },
  { href: '/loyalty', label: 'Loyalty' },
  { href: '/#locations', label: 'Locations' },
  { href: '/#contact', label: 'Contact' },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="surface-espresso sticky top-0 z-40 border-b border-line">
      <div className="mx-auto flex max-w-shell items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="ARRIS home">
          <Logo height={44} priority />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {NAV.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`label-text rounded-full px-3 py-2 text-[11px] transition ${
                  active ? 'bg-gold/20 text-gold' : 'text-gold-pale/80 hover:text-gold'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
          <Link href="/admin" className="btn btn-gold ml-2 px-4 py-2 text-xs">
            Staff Login
          </Link>
        </nav>

        <button
          type="button"
          className="btn btn-outline-light px-3 py-2 lg:hidden"
          aria-expanded={open}
          aria-controls="site-mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="label-text text-[11px]">{open ? 'Close' : 'Menu'}</span>
        </button>
      </div>

      {open ? (
        <nav
          id="site-mobile-nav"
          className="border-t border-line px-4 pb-4 lg:hidden"
          aria-label="Main mobile"
        >
          <ul className="grid gap-1 pt-3">
            {NAV.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="label-text block rounded-xl px-3 py-3 text-xs text-gold-pale/90 hover:bg-gold/10"
                >
                  {link.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link href="/admin" onClick={() => setOpen(false)} className="btn btn-gold w-full">
                Staff Login
              </Link>
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

export function SiteFooter() {
  const { settings, branches } = useApp();
  return (
    <footer className="surface-espresso mt-16 border-t border-line" id="contact">
      <div className="mx-auto max-w-shell px-4 py-12 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <Logo height={64} />
          <p className="label-text mt-4 text-[11px] text-gold">{settings.tagline}</p>
          <Ornament className="mt-4" />
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="label-text text-[11px] text-gold">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-gold-pale/80">
              <li>
                <Link href="/menu" className="hover:text-gold">
                  Full Menu
                </Link>
              </li>
              <li>
                <Link href="/menu?section=cafe" className="hover:text-gold">
                  Café &amp; Juice Bar
                </Link>
              </li>
              <li>
                <Link href="/loyalty" className="hover:text-gold">
                  Coffee Loyalty
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-gold">
                  Staff Login
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="label-text text-[11px] text-gold">Our Places</h3>
            <ul className="mt-3 space-y-2 text-sm text-gold-pale/80">
              {branches.length ? (
                branches.map((branch) => <li key={branch.slug}>{branch.name}</li>)
              ) : (
                <>
                  <li>Arris 1</li>
                  <li>Arris 2</li>
                  <li>Arris 2 Café</li>
                </>
              )}
            </ul>
          </div>

          <div>
            <h3 className="label-text text-[11px] text-gold">Contact</h3>
            <ul className="mt-3 space-y-2 text-sm text-gold-pale/80">
              {settings.contactPhone ? (
                <li>
                  <a href={`tel:${settings.contactPhone}`} className="hover:text-gold">
                    {settings.contactPhone}
                  </a>
                </li>
              ) : null}
              {settings.contactEmail ? (
                <li>
                  <a href={`mailto:${settings.contactEmail}`} className="hover:text-gold">
                    {settings.contactEmail}
                  </a>
                </li>
              ) : null}
              {settings.whatsapp ? <li>WhatsApp {settings.whatsapp}</li> : null}
              {!settings.contactPhone && !settings.contactEmail ? (
                <li className="text-gold-pale/50">
                  Add contact details in Admin → Settings.
                </li>
              ) : null}
            </ul>
          </div>

          <div>
            <h3 className="label-text text-[11px] text-gold">At Your Table</h3>
            <p className="mt-3 text-sm leading-relaxed text-gold-pale/80">
              Scan the QR code on your table to open the menu, call a member of staff or ask for
              the bill — no app, no waiting.
            </p>
          </div>
        </div>

        <p className="mt-10 border-t border-line pt-6 text-center text-xs text-gold-pale/50">
          © {new Date().getFullYear()} {settings.restaurantName}. {settings.tagline}
        </p>
      </div>
    </footer>
  );
}

export function ConfigNotice() {
  const { firebaseReady } = useApp();
  if (firebaseReady) return null;
  return (
    <div className="bg-danger px-4 py-2 text-center text-xs text-white">
      Firebase is not configured — copy <code>.env.example</code> to <code>.env.local</code>, add
      your project keys and run <code>npm run seed</code>.
    </div>
  );
}
