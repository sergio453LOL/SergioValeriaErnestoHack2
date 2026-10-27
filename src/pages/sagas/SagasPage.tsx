import { useCallback } from 'react';
import { Link } from 'react-router';
import { isLogPoseLocked } from '../../api/client';
import { getSagas } from '../../api/endpoints';
import useAsync from '../../hooks/useAsync';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import GrandLineLocked from '../../components/GrandLineLocked';
import { formatNumber } from '../../utils/format';
import { sagaTransitionName } from './sagaUtils';

export default function SagasPage() {
  const load = useCallback((signal: AbortSignal) => getSagas(signal), []);
  const { state, retry } = useAsync(load);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-parchment">Poneglyph</h1>
        <p className="text-sm text-slate-400">Las sagas que guardan la verdadera historia del Grand Line</p>
      </div>

      {state.status === 'loading' && (
        <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Cargando sagas">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="h-56 animate-pulse rounded-2xl bg-sea-900 motion-reduce:animate-none" />
          ))}
        </div>
      )}

      {state.status === 'error' &&
        (isLogPoseLocked(state.error) ? (
          <GrandLineLocked error={state.error} onRetry={retry} />
        ) : (
          <ErrorState error={state.error} onRetry={retry} title="No se pudieron cargar las sagas" />
        ))}

      {state.status === 'success' && state.data.length === 0 && (
        <EmptyState title="Aún no hay sagas" description="Los Poneglyphs de tu workspace todavía no cuentan ninguna historia." />
      )}

      {state.status === 'success' && state.data.length > 0 && (
        <ol className="grid gap-4 md:grid-cols-2">
          {state.data.map((saga) => (
            <li key={saga.id}>
              <Link
                to={`/sagas/${encodeURIComponent(saga.id)}`}
                state={{ saga }}
                // View Transition API cuando el navegador la soporta; si no, navegación normal.
                viewTransition
                className="flex h-full flex-col rounded-2xl p-6 ring-1 ring-white/10 transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: saga.palette.background, color: saga.palette.text }}
              >
                <p className="text-xs uppercase tracking-widest" style={{ color: saga.palette.accent }}>
                  Saga {saga.order} · {saga.stageCount} etapas
                </p>
                <h2
                  className="mt-2 font-display text-2xl"
                  style={{ color: saga.palette.primary, viewTransitionName: sagaTransitionName(saga.id) }}
                >
                  {saga.title}
                </h2>
                <p className="mt-1 italic opacity-80">{saga.subtitle}</p>
                <p className="mt-3 flex-1 text-sm opacity-90">{saga.synopsis}</p>
                <p className="mt-4 text-xs opacity-75">
                  {saga.firstIsland} → {saga.lastIsland} · {formatNumber(saga.totalDistanceNm)} mn
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
