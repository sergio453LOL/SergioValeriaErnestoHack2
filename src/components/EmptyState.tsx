import type { ReactNode } from 'react';

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function EmptyState({ title, description, children }: Props) {
  return (
    <div className="rounded-xl border border-dashed border-sea-700 p-8 text-center">
      <p className="font-display text-lg text-parchment">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
