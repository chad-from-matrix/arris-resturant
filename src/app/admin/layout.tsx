export const metadata = {
  title: 'ARRIS Admin',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="surface-marble min-h-screen">{children}</div>;
}
