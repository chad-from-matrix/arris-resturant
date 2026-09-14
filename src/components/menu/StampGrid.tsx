import { Ornament } from '@/components/brand/Ornament';

/** The stamp card face: filled gold stamps, empty pale-gold rings. */
export function StampGrid({
  stamps,
  required,
  size = 'md',
}: {
  stamps: number;
  required: number;
  size?: 'sm' | 'md';
}) {
  const cells = Array.from({ length: required });
  const dim = size === 'sm' ? 'text-[10px]' : 'text-xs sm:text-sm';
  return (
    <div className={`grid grid-cols-5 gap-2 sm:gap-3 ${dim}`} role="img"
      aria-label={`${stamps} of ${required} stamps collected`}>
      {cells.map((_, index) => {
        const filled = index < stamps;
        return (
          <span
            key={index}
            aria-hidden="true"
            className={`flex aspect-square items-center justify-center rounded-full border-2 font-semibold transition ${
              filled
                ? 'border-gold bg-gold text-espresso shadow-card'
                : 'border-gold/50 bg-gold-pale/30 text-brown/40'
            }`}
          >
            {filled ? '★' : index + 1}
          </span>
        );
      })}
    </div>
  );
}

export function StampProgress({ stamps, required }: { stamps: number; required: number }) {
  const pct = Math.min(100, Math.round((stamps / Math.max(required, 1)) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="label-text text-[11px] text-copper">Progress</span>
        <span className="text-sm font-semibold text-brown">
          {stamps}/{required}
        </span>
      </div>
      <div
        className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gold-pale/50"
        role="progressbar"
        aria-valuenow={stamps}
        aria-valuemin={0}
        aria-valuemax={required}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RewardBanner({ rewardItem }: { rewardItem: string }) {
  return (
    <div className="rounded-2xl border-2 border-gold bg-gold/15 p-5 text-center">
      <p className="display-title text-sm text-brown-deep">Reward unlocked</p>
      <Ornament className="mt-2" width="w-12" />
      <p className="mt-3 text-lg font-semibold text-brown-deep">1 free {rewardItem}</p>
      <p className="mt-1 text-xs text-marble-vein">
        Show this card at the counter — a member of staff will redeem it for you.
      </p>
    </div>
  );
}
