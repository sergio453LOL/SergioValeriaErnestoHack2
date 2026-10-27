import { Link } from 'react-router';
import type { ApiError } from '../api/client';

interface Props {
  error: ApiError;
  onRetry: () => void;
}

// 423 LOG_POSE_REQUIRED: el servidor bloquea el Grand Line hasta aprobar la inspección del CP3.
export default function GrandLineLocked({ error, onRetry }: Props) {
  return (
    <div role="alert" className="rounded-xl border border-gold/40 bg-gold/10 p-6 text-center">
      <p className="text-3xl" aria-hidden="true">
        🔒
      </p>
      <p className="mt-2 font-display text-xl text-gold">El Grand Line sigue bloqueado</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-300">{error.message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-sea-950 hover:bg-gold/90"
        >
          Volver a consultar
        </button>
        <Link to="/" className="rounded-lg border border-sea-700 px-4 py-2 text-sm text-slate-200 hover:border-gold">
          Ver estado del Log Pose
        </Link>
      </div>
    </div>
  );
}
