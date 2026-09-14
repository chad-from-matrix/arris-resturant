'use client';

import { useApp } from '@/lib/app-context';
import { addDaysIso, startOfMonthIso, todayIso } from '@/lib/format';

export function BranchFilter({
  value,
  onChange,
  includeAll = true,
  label = 'Branch',
}: {
  value: string | null;
  onChange: (slug: string | null) => void;
  includeAll?: boolean;
  label?: string;
}) {
  const { branches, staff } = useApp();
  // A member of staff pinned to one branch never sees another branch's numbers.
  const scoped =
    staff && staff.branchSlug !== 'all'
      ? branches.filter((b) => b.slug === staff.branchSlug)
      : branches;

  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="field"
      >
        {includeAll ? <option value="">All branches</option> : null}
        {scoped.map((branch) => (
          <option key={branch.slug} value={branch.slug}>
            {branch.name}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface DateRange {
  from: string;
  to: string;
}

export function defaultRange(): DateRange {
  const today = todayIso();
  return { from: startOfMonthIso(today), to: today };
}

export const RANGE_PRESETS: { label: string; build: () => DateRange }[] = [
  { label: 'Today', build: () => ({ from: todayIso(), to: todayIso() }) },
  { label: 'Last 7 days', build: () => ({ from: addDaysIso(todayIso(), -6), to: todayIso() }) },
  { label: 'Last 30 days', build: () => ({ from: addDaysIso(todayIso(), -29), to: todayIso() }) },
  { label: 'This month', build: defaultRange },
];

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block">
        <span className="field-label">From</span>
        <input
          type="date"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className="field"
        />
      </label>
      <label className="block">
        <span className="field-label">To</span>
        <input
          type="date"
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className="field"
        />
      </label>
    </div>
  );
}

export function RangePresets({ onPick }: { onPick: (range: DateRange) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {RANGE_PRESETS.map((preset) => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onPick(preset.build())}
          className="label-text rounded-full border border-marble-vein/60 bg-card px-3 py-1.5 text-[10px] text-brown transition hover:border-gold"
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}

export function FilterPanel({ children }: { children: React.ReactNode }) {
  return <div className="card-surface no-print mb-5 p-4 sm:p-5">{children}</div>;
}
