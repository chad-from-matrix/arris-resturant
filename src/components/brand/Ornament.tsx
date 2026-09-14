/**
 * The gold ornament divider from the printed menu: a hairline rule broken by a
 * small gold diamond. Used under every script section title and under the item
 * name on every menu card.
 */
export function Ornament({
  width = 'w-24',
  tone = 'gold',
  className = '',
}: {
  width?: string;
  tone?: 'gold' | 'pale';
  className?: string;
}) {
  const line = tone === 'pale' ? 'bg-gold-pale' : 'bg-gold';
  const diamond = tone === 'pale' ? 'bg-gold-pale' : 'bg-gold';
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} aria-hidden="true">
      <span className={`h-px ${width} ${line} opacity-80`} />
      <span className={`block h-2 w-2 rotate-45 ${diamond}`} />
      <span className={`h-px ${width} ${line} opacity-80`} />
    </div>
  );
}

/**
 * Vertical gold ornament rail down the right edge of the menu pages,
 * mirroring the print layout. Hidden on small screens.
 */
export function OrnamentRail({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed right-3 top-0 hidden h-full flex-col items-center justify-center gap-3 lg:flex ${className}`}
    >
      <span className="h-24 w-px bg-gradient-to-b from-transparent via-gold to-transparent" />
      <span className="block h-2.5 w-2.5 rotate-45 bg-gold" />
      <span className="h-40 w-px bg-gold/60" />
      <span className="block h-3.5 w-3.5 rotate-45 border border-gold" />
      <span className="h-40 w-px bg-gold/60" />
      <span className="block h-2.5 w-2.5 rotate-45 bg-gold" />
      <span className="h-24 w-px bg-gradient-to-t from-transparent via-gold to-transparent" />
    </div>
  );
}
