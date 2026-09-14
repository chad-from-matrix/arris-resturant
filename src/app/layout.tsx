import type { Metadata, Viewport } from 'next';
import { Antonio, Cinzel, Great_Vibes, Inter } from 'next/font/google';
import { AppProvider } from '@/lib/app-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const cinzel = Cinzel({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-cinzel',
  display: 'swap',
});

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-great-vibes',
  display: 'swap',
});

const antonio = Antonio({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-antonio',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ARRIS — Restaurant & Café | Somali Cuisine',
  description:
    'ARRIS Restaurant & Café — authentic Somali cuisine across Arris 1, Arris 2 and Arris 2 Café. Scan your table QR for the digital menu and collect coffee stamps.',
  applicationName: 'ARRIS',
  icons: { icon: '/brand/arris-logo.png' },
};

export const viewport: Viewport = {
  themeColor: '#26110A',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${cinzel.variable} ${greatVibes.variable} ${antonio.variable}`}
    >
      <body className="surface-marble min-h-screen">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
