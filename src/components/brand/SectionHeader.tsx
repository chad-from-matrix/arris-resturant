import type { ReactNode } from 'react';
import { Ornament } from './Ornament';

/**
 * Script title → gold ornament divider → content.
 * The one section-heading pattern, used on the customer site and in admin.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  tone = 'light',
  size = 'lg',
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: 'light' | 'dark';
  size?: 'sm' | 'lg';
  children?: ReactNode;
}) {
  const titleColor = tone === 'dark' ? 'text-gold-pale' : 'text-brown-deep';
  const subColor = tone === 'dark' ? 'text-gold-pale/70' : 'text-marble-vein';
  const titleSize = size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl';

  return (
    <header className="flex flex-col items-center text-center">
      {eyebrow ? (
        <p className={`label-text mb-2 text-xs ${tone === 'dark' ? 'text-gold' : 'text-copper'}`}>
          {eyebrow}
        </p>
      ) : null}
      <h2 className={`script-title ${titleSize} ${titleColor}`}>{title}</h2>
      <Ornament className="mt-3" />
      {subtitle ? (
        <p className={`mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${subColor}`}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </header>
  );
}
