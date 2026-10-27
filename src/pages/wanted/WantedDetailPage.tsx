import { useCallback, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { getWantedById } from '../../api/endpoints';
import type { WantedDetail } from '../../api/types';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { FRUIT_LABELS, ROLE_LABELS, formatBerries, formatDate, formatDateTime } from '../../utils/format';

function cameFromList(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>).fromList === true;
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-ink/60">{label}</dt>
      <dd className="font-semibold text-ink">{children}</dd>
    </div>
  );
}

function Poster({ poster }: { poster: WantedDetail }) {
  return (
    <article className="mx-auto max-w-3xl rounded-2xl border-4 border-parchment-dark bg-parchment p-6 text-ink shadow-2xl shadow-black/50 sm:p-10">
      <header className="text-center">
        <p className="font-display text-5xl font-bold tracking-[0.3em] sm:text-6xl">WANTED</p>
        <p className="mt-1 text-sm uppercase tracking-[0.4em] text-ink/70">Dead or alive</p>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">{poster.name}</h1>
        <p className="mt-1 italic text-ink/80">“{poster.epithet}”</p>
        <p className="mt-4 font-display text-3xl font-bold sm:text-4xl">{formatBerries(poster.bounty)}</p>
        <div className="mt-3 flex justify-center">
          <StatusBadge status={poster.status} />
        </div>
      </header>

      <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-ink/20 pt-6 sm:grid-cols-3">
        <Fact label="Tripulación">
          <Link to={`/wanted?crewId=${encodeURIComponent(poster.crew.id)}`} className="underline hover:text-coral">
            {poster.crew.name}
          </Link>
        </Fact>
        <Fact label="Puesto">{ROLE_LABELS[poster.role]}</Fact>
        <Fact label="Amenaza">
          <span className="mt-1 flex gap-1" role="img" aria-label={`${poster.threatLevel} de 5`}>
            {Array.from({ length: 5 }, (_, index) => (
              <span
                key={index}
                className={`h-2 w-5 rounded-full ${index < poster.threatLevel ? 'bg-coral' : 'bg-ink/20'}`}
              />
            ))}
          </span>
        </Fact>
        <Fact label="Fruta del diablo">
          {poster.devilFruit ? `${poster.devilFruit.name} (${FRUIT_LABELS[poster.devilFruit.type]})` : FRUIT_LABELS.NONE}
        </Fact>
        <Fact label="Edad">{poster.age} años</Fact>
        <Fact label="Altura">{poster.heightCm} cm</Fact>
        <Fact label="Visto por última vez">
          {poster.lastSeen.island}
          <span className="block text-xs font-normal text-ink/70">{formatDateTime(poster.lastSeen.seenAt)}</span>
        </Fact>
        <Fact label="Actualizado">{formatDate(poster.updatedAt)}</Fact>
      </dl>

      <section className="mt-8 border-t border-ink/20 pt-6">
        <h2 className="font-display text-xl font-bold">Historia</h2>
        <p className="mt-2 leading-relaxed">{poster.bio}</p>
      </section>

      <section className="mt-8 border-t border-ink/20 pt-6">
        <h2 className="font-display text-xl font-bold">Historial de recompensas</h2>
        <ol className="mt-3 space-y-2">
          {poster.bountyHistory.map((entry, index) => (
            <li key={`${entry.issuedAt}-${index}`} className="flex justify-between gap-4 border-b border-dashed border-ink/20 pb-1">
              <span>{formatDate(entry.issuedAt)}</span>
              <span className="font-mono font-semibold">{formatBerries(entry.amount)}</span>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}

function PosterSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Cargando cartel"
      className="mx-auto h-[48rem] max-w-3xl animate-pulse rounded-2xl bg-sea-900 motion-reduce:animate-none"
    />
  );
}

export default function WantedDetailPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const load = useCallback((signal: AbortSignal) => getWantedById(id, signal), [id]);
  const { state, retry } = useAsync(load);

  // Volver con el historial restaura la URL exacta del listado (filtros, página) y su scroll.
  function goBack() {
    if (cameFromList(location.state)) navigate(-1);
    else navigate('/wanted');
  }

  return (
    <div className="space-y-6">
      <button type="button" onClick={goBack} className="text-sm text-gold hover:underline">
        ← Volver a los carteles
      </button>
      {state.status === 'loading' && <PosterSkeleton />}
      {state.status === 'error' &&
        (state.error.status === 404 ? (
          <EmptyState
            title="Este cartel no existe"
            description="Puede que el enlace esté mal o que el cartel no pertenezca a tu workspace."
          />
        ) : (
          <ErrorState error={state.error} onRetry={retry} title="No se pudo cargar el cartel" />
        ))}
      {state.status === 'success' && <Poster poster={state.data} />}
    </div>
  );
}
