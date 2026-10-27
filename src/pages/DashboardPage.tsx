import { useCallback } from 'react';
import { Link } from 'react-router';
import { getDashboardSummary, getLogPose } from '../api/endpoints';
import type { DashboardSummary, FruitFilter, LogPose, WantedStatus } from '../api/types';
import useAsync, { type AsyncState } from '../hooks/useAsync';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import { FRUIT_LABELS, STATUS_LABELS, formatBerries, formatDateTime, formatNumber } from '../utils/format';

const STATUS_ORDER: WantedStatus[] = ['AT_LARGE', 'CAPTURED', 'MISSING'];
const FRUIT_ORDER: FruitFilter[] = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'];

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-sea-800 bg-sea-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p title={value} className="mt-1 truncate whitespace-nowrap font-display text-xl tabular-nums text-parchment">
        {value}
      </p>
      {hint && <p className="mt-1 truncate text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

function Breakdown<K extends string>({
  title,
  order,
  counts,
  labels,
  total,
  linkParam,
}: {
  title: string;
  order: K[];
  counts: Record<K, number>;
  labels: Record<K, string>;
  total: number;
  linkParam: 'status' | 'fruit';
}) {
  return (
    <section className="rounded-xl border border-sea-800 bg-sea-900/60 p-4">
      <h2 className="font-display text-lg text-gold">{title}</h2>
      <ul className="mt-3 space-y-3">
        {order.map((key) => {
          const count = counts[key];
          const percent = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <li key={key}>
              <div className="flex justify-between text-sm">
                <Link to={`/wanted?${linkParam}=${key}`} className="text-slate-200 hover:text-gold hover:underline">
                  {labels[key]}
                </Link>
                <span className="text-slate-400">
                  {formatNumber(count)} · {percent}%
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-sea-800">
                <div className="h-2 rounded-full bg-gold" style={{ width: `${percent}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function LogPoseCard({ state, onRetry }: { state: AsyncState<LogPose>; onRetry: () => void }) {
  return (
    <section className="rounded-xl border border-sea-800 bg-sea-900/60 p-4" aria-live="polite">
      <h2 className="font-display text-lg text-gold">Log Pose</h2>
      {state.status === 'loading' && (
        <div className="mt-3 space-y-2" aria-busy="true">
          <div className="h-6 w-32 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
          <div className="h-4 w-full animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
        </div>
      )}
      {state.status === 'error' && (
        <div className="mt-3">
          <ErrorState error={state.error} onRetry={onRetry} title="No se pudo leer el Log Pose" />
        </div>
      )}
      {state.status === 'success' && (
        <div className="mt-3">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ring-1 ${
              state.data.grandLineUnlocked
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40'
                : 'bg-gold/10 text-gold ring-gold/40'
            }`}
          >
            {state.data.grandLineUnlocked ? '🧭 Grand Line desbloqueado' : '🔒 Grand Line bloqueado'}
          </span>
          <p className="mt-3 text-sm text-slate-300">{state.data.message}</p>
          {state.data.unlockedAt && (
            <p className="mt-1 text-xs text-slate-500">Obtenido el {formatDateTime(state.data.unlockedAt)}</p>
          )}
        </div>
      )}
    </section>
  );
}

function SummarySkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando indicadores" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-sea-900 motion-reduce:animate-none" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-48 animate-pulse rounded-xl bg-sea-900 motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-xl bg-sea-900 motion-reduce:animate-none" />
      </div>
    </div>
  );
}

function SummaryContent({ summary }: { summary: DashboardSummary }) {
  const { wanted, crews, topBounties } = summary;

  if (wanted.total === 0) {
    return (
      <EmptyState
        title="El tablón de carteles está vacío"
        description="Tu workspace todavía no tiene carteles de Se Busca. Cuando lleguen, sus indicadores aparecerán aquí."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Carteles activos" value={formatNumber(wanted.total)} />
        <StatCard label="Recompensa total" value={formatBerries(wanted.totalBounty)} />
        <StatCard label="Recompensa promedio" value={formatBerries(wanted.averageBounty)} />
        <StatCard
          label="Tripulaciones"
          value={formatNumber(crews.total)}
          hint={crews.mostWanted ? `Más buscada: ${crews.mostWanted.name}` : undefined}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Por estado"
          order={STATUS_ORDER}
          counts={wanted.byStatus}
          labels={STATUS_LABELS}
          total={wanted.total}
          linkParam="status"
        />
        <Breakdown
          title="Por fruta del diablo"
          order={FRUIT_ORDER}
          counts={wanted.byFruit}
          labels={FRUIT_LABELS}
          total={wanted.total}
          linkParam="fruit"
        />
      </div>
      {crews.mostWanted && (
        <section className="rounded-xl border border-sea-800 bg-sea-900/60 p-4">
          <h2 className="font-display text-lg text-gold">Tripulación más buscada</h2>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span
              className="h-10 w-10 shrink-0 rounded-full ring-2 ring-parchment/40"
              style={{ backgroundColor: crews.mostWanted.jollyRogerColor }}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <Link
                to={`/wanted?crewId=${encodeURIComponent(crews.mostWanted.id)}`}
                className="font-semibold text-parchment hover:text-gold hover:underline"
              >
                {crews.mostWanted.name}
              </Link>
              <p className="text-sm text-slate-400">
                Barco: {crews.mostWanted.shipName} · {formatNumber(crews.mostWanted.memberCount)} carteles
              </p>
            </div>
            <p className="ml-auto font-display text-xl text-gold">{formatBerries(crews.mostWanted.totalBounty)}</p>
          </div>
        </section>
      )}
      <section className="rounded-xl border border-sea-800 bg-sea-900/60 p-4">
        <h2 className="font-display text-lg text-gold">Mayores recompensas</h2>
        <ol className="mt-3 divide-y divide-sea-800">
          {topBounties.map((poster, index) => (
            <li key={poster.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-6 text-right font-mono text-slate-500">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <Link to={`/wanted/${encodeURIComponent(poster.id)}`} className="font-semibold hover:text-gold hover:underline">
                  {poster.name}
                </Link>
                <p className="truncate text-xs text-slate-400">
                  “{poster.epithet}” · {poster.crew.name}
                </p>
              </div>
              <StatusBadge status={poster.status} />
              <span className="font-mono text-sm text-gold">{formatBerries(poster.bounty)}</span>
            </li>
          ))}
        </ol>
      </section>
      <p className="text-right text-xs text-slate-500">Calculado el {formatDateTime(summary.generatedAt)}</p>
    </div>
  );
}

export default function DashboardPage() {
  const loadSummary = useCallback((signal: AbortSignal) => getDashboardSummary(signal), []);
  const loadLogPose = useCallback((signal: AbortSignal) => getLogPose(signal), []);
  const summary = useAsync(loadSummary);
  const logPose = useAsync(loadLogPose);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-parchment">Puente de mando</h1>
        <p className="text-sm text-slate-400">Indicadores de tu tripulación de cazarrecompensas</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          {summary.state.status === 'loading' && <SummarySkeleton />}
          {summary.state.status === 'error' && (
            <ErrorState error={summary.state.error} onRetry={summary.retry} title="No se pudieron cargar los indicadores" />
          )}
          {summary.state.status === 'success' && <SummaryContent summary={summary.state.data} />}
        </div>
        <aside>
          <LogPoseCard state={logPose.state} onRetry={logPose.retry} />
        </aside>
      </div>
    </div>
  );
}
