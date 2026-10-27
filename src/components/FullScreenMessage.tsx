import type { ReactNode } from 'react';
import Spinner from './Spinner';

interface Props {
  title: string;
  subtitle?: string;
  spinner?: boolean;
  children?: ReactNode;
}

export default function FullScreenMessage({ title, subtitle, spinner = false, children }: Props) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      {spinner && <Spinner size="lg" />}
      <h1 className="font-display text-2xl text-gold">{title}</h1>
      {subtitle && <p className="text-slate-400">{subtitle}</p>}
      {children && <div className="w-full max-w-md">{children}</div>}
    </main>
  );
}
