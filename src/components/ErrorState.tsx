import type { ApiError } from '../api/client';

interface Props {
  error: ApiError;
  onRetry: () => void;
  title?: string;
}

export default function ErrorState({ error, onRetry, title = 'Algo salió mal en la travesía' }: Props) {
  return (
    <div role="alert" className="rounded-xl border border-coral/40 bg-coral/10 p-5 text-left">
      <p className="font-semibold text-coral">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{error.message}</p>
      {error.code && <p className="mt-1 font-mono text-xs text-slate-500">{error.code}</p>}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-lg bg-coral px-4 py-2 text-sm font-semibold text-sea-950 hover:bg-coral/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
      >
        Reintentar
      </button>
    </div>
  );
}
