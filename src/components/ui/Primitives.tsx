'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-surface p-5 ${className}`}>{children}</div>;
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'danger' | 'gold';
}) {
  const valueTone =
    tone === 'success'
      ? 'text-success'
      : tone === 'danger'
        ? 'text-danger'
        : tone === 'gold'
          ? 'text-copper'
          : 'text-brown-deep';
  return (
    <div className="card-surface p-4 sm:p-5">
      <p className="label-text text-[11px] text-copper">{label}</p>
      <p className={`mt-2 text-2xl font-semibold sm:text-3xl ${valueTone}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-marble-vein">{hint}</p> : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : null}
      {!error && hint ? <span className="mt-1 block text-xs text-marble-vein">{hint}</span> : null}
    </label>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  wide = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-espresso/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-card p-5 shadow-lift outline-none sm:rounded-card ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id={titleId} className="display-title text-base text-brown-deep">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn btn-ghost -mr-2 -mt-2 h-9 min-h-0 w-9 rounded-full p-0 text-lg"
          >
            ×
          </button>
        </div>
        {children}
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="card-surface flex flex-col items-center px-6 py-12 text-center">
      <span className="block h-3 w-3 rotate-45 bg-gold-pale" />
      <p className="mt-4 font-semibold text-brown">{title}</p>
      {body ? <p className="mt-1 max-w-md text-sm text-marble-vein">{body}</p> : null}
    </div>
  );
}

export function Banner({
  tone,
  children,
}: {
  tone: 'info' | 'success' | 'danger';
  children: ReactNode;
}) {
  const styles: Record<typeof tone, string> = {
    info: 'border-gold bg-gold/10 text-brown-deep',
    success: 'border-success bg-success/10 text-success',
    danger: 'border-danger bg-danger/10 text-danger',
  };
  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${styles[tone]}`} role="status">
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-marble-vein">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      {label}
    </div>
  );
}

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="thin-scroll card-surface overflow-x-auto p-0">
      <table className="w-full min-w-[720px] border-collapse text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`label-text whitespace-nowrap border-b border-line px-3 py-3 text-[11px] text-copper ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = 'left',
  className = '',
}: {
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  return (
    <td
      className={`border-b border-marble-vein/25 px-3 py-2.5 align-middle ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${className}`}
    >
      {children}
    </td>
  );
}
