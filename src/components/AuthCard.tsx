import type { ReactNode } from 'react';

interface Props {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthCard({ title, subtitle, children }: Props) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-sea-800 bg-sea-900/70 p-8 shadow-2xl shadow-black/40">
        <p className="text-center text-3xl" aria-hidden="true">
          🧭
        </p>
        <h1 className="mt-2 text-center font-display text-2xl text-gold">{title}</h1>
        <p className="mt-1 text-center text-sm text-slate-400">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
