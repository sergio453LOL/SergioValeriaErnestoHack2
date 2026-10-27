import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ApiError, isCanceled, toApiError } from '../../api/client';
import { getCrews, getWanted } from '../../api/endpoints';
import type { WantedPage, WantedQuery } from '../../api/types';
import useAsync from '../../hooks/useAsync';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import { FRUIT_LABELS, ROLE_LABELS, SORT_LABELS, STATUS_LABELS, formatBerries, formatNumber } from '../../utils/format';
import { FRUITS, PAGE_SIZES, SORTS, STATUSES, hasActiveFilters, parseWantedParams, toSearchParams } from './wantedParams';
import { getCachedPage, setCachedPage } from './wantedCache';

const SEARCH_DEBOUNCE_MS = 400;

interface ListState {
  data: WantedPage | null;
  dataKey: string | null;
  loading: boolean;
  error: ApiError | null;
}

function initialState(key: string): ListState {
  const cached = getCachedPage(key);
  return cached
    ? { data: cached, dataKey: key, loading: false, error: null }
    : { data: null, dataKey: null, loading: true, error: null };
}

const selectClass =
  'w-full rounded-lg border border-sea-700 bg-sea-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold/50 disabled:opacity-60';

function ThreatLevel({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Amenaza ${level} de 5`} title={`Amenaza ${level} de 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index} className={`h-1.5 w-3 rounded-full ${index < level ? 'bg-coral' : 'bg-sea-700'}`} />
      ))}
    </span>
  );
}

function RowSkeleton() {
  return (
    <li className="flex h-20 items-center gap-4 px-4">
      <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-sea-800 motion-reduce:animate-none" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
      </div>
      <div className="h-5 w-24 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
    </li>
  );
}

function pageWindow(current: number, total: number): number[] {
  const start = Math.max(0, Math.min(current - 2, total - 5));
  const end = Math.min(total, start + 5);
  return Array.from({ length: end - start }, (_, index) => start + index);
}

export default function WantedListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parseWantedParams(searchParams), [searchParams]);
  const key = toSearchParams(query).toString();

  // Una URL con valores inválidos se corrige en el lugar (replace) sin romper la vista.
  useEffect(() => {
    if (searchParams.toString() !== key) {
      setSearchParams(new URLSearchParams(key), { replace: true });
    }
  }, [key, searchParams, setSearchParams]);

  // La URL es la única fuente de verdad: todo cambio pasa por aquí.
  const updateQuery = useCallback(
    (changes: Partial<WantedQuery>, options: { resetPage?: boolean; replace?: boolean } = {}) => {
      const { resetPage = true, replace = false } = options;
      const next: WantedQuery = { ...query, ...changes };
      // Cambiar filtros, búsqueda, orden o tamaño vuelve a la primera página: la actual podría ya no existir.
      if (resetPage) next.page = 0;
      const nextKey = toSearchParams(next).toString();
      if (nextKey === key) return;
      setSearchParams(new URLSearchParams(nextKey), { replace });
    },
    [query, key, setSearchParams],
  );

  // ---- Carga de la página ----
  const [state, setState] = useState<ListState>(() => initialState(key));
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    // Cada request tiene un id; si llega una respuesta de una request anterior, se descarta.
    const id = ++requestId.current;
    const cached = getCachedPage(key);
    if (cached) {
      setState({ data: cached, dataKey: key, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((previous) => ({ ...previous, loading: true, error: null }));
    getWanted(query, controller.signal)
      .then((data) => {
        if (id !== requestId.current) return;
        setCachedPage(key, data);
        setState({ data, dataKey: key, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (isCanceled(error) || id !== requestId.current) return;
        setState((previous) => ({ ...previous, loading: false, error: toApiError(error) }));
      });
    // Además, al cambiar la query se cancela la request en vuelo.
    return () => controller.abort();
    // `query` se deriva de `key`: basta con depender de la clave.
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  // Si la página pedida ya no existe (p. ej. ?page=99), llevar al usuario a la última que sí existe.
  const current = state.dataKey === key ? state.data : null;
  const outOfRange = current !== null && query.page > 0 && query.page >= current.totalPages;
  useEffect(() => {
    if (!outOfRange || !current) return;
    updateQuery({ page: Math.max(current.totalPages - 1, 0) }, { resetPage: false, replace: true });
  }, [outOfRange, current, updateQuery]);

  // ---- Búsqueda con debounce: una sola request cuando el usuario deja de escribir ----
  const urlQ = query.q ?? '';
  const [draft, setDraft] = useState(urlQ);

  // Si la URL cambia desde afuera (atrás/adelante, link compartido), el input la refleja.
  useEffect(() => {
    setDraft(urlQ);
  }, [urlQ]);

  useEffect(() => {
    if (draft.trim() === urlQ) return;
    const timer = window.setTimeout(() => updateQuery({ q: draft.trim() || undefined }), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [draft, urlQ, updateQuery]);

  // ---- Tripulaciones para el filtro ----
  const loadCrews = useCallback((signal: AbortSignal) => getCrews(signal), []);
  const crews = useAsync(loadCrews);
  const crewList = crews.state.status === 'success' ? crews.state.data : [];
  const unknownCrew = Boolean(query.crewId) && crews.state.status === 'success' && !crewList.some((crew) => crew.id === query.crewId);

  // ---- Render ----
  const shown = state.data;
  const showSkeleton = (!shown && !state.error) || outOfRange;
  const totalPages = current?.totalPages ?? 0;

  let statusLine = 'Buscando carteles…';
  if (state.error) statusLine = 'No se pudieron cargar los carteles';
  else if (current && !outOfRange) {
    statusLine =
      current.totalElements === 0
        ? 'Sin resultados'
        : `${formatNumber(current.totalElements)} carteles · página ${query.page + 1} de ${current.totalPages}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-parchment">Carteles de “Se Busca”</h1>
        <p className="text-sm text-slate-400">Recompensas emitidas por el Gobierno Mundial</p>
      </div>

      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          updateQuery({ q: draft.trim() || undefined });
        }}
        className="grid gap-3 rounded-xl border border-sea-800 bg-sea-900/60 p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="sm:col-span-2">
          <label htmlFor="wanted-q" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Buscar
          </label>
          <div className="relative">
            <input
              id="wanted-q"
              type="search"
              value={draft}
              maxLength={100}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Nombre o epíteto…"
              className="w-full rounded-lg border border-sea-700 bg-sea-900 px-3 py-2 pr-8 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
          </div>
        </div>

        <div>
          <label htmlFor="wanted-status" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Estado
          </label>
          <select
            id="wanted-status"
            className={selectClass}
            value={query.status ?? ''}
            onChange={(event) => updateQuery({ status: STATUSES.find((s) => s === event.target.value) })}
          >
            <option value="">Todos</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wanted-crew" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Tripulación
          </label>
          <select
            id="wanted-crew"
            className={selectClass}
            value={query.crewId ?? ''}
            disabled={crews.state.status === 'loading'}
            onChange={(event) => updateQuery({ crewId: event.target.value || undefined })}
          >
            <option value="">{crews.state.status === 'loading' ? 'Cargando…' : 'Todas'}</option>
            {crews.state.status === 'error' && query.crewId && <option value={query.crewId}>Tripulación seleccionada</option>}
            {unknownCrew && query.crewId && <option value={query.crewId}>Tripulación desconocida</option>}
            {crewList.map((crew) => (
              <option key={crew.id} value={crew.id}>
                {crew.name}
              </option>
            ))}
          </select>
          {crews.state.status === 'error' && (
            <button type="button" onClick={crews.retry} className="mt-1 text-xs text-coral hover:underline">
              No se cargaron las tripulaciones. Reintentar
            </button>
          )}
        </div>

        <div>
          <label htmlFor="wanted-fruit" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Fruta del diablo
          </label>
          <select
            id="wanted-fruit"
            className={selectClass}
            value={query.fruit ?? ''}
            onChange={(event) => updateQuery({ fruit: FRUITS.find((f) => f === event.target.value) })}
          >
            <option value="">Todas</option>
            {FRUITS.map((fruit) => (
              <option key={fruit} value={fruit}>
                {FRUIT_LABELS[fruit]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="wanted-sort" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Ordenar por
          </label>
          <select
            id="wanted-sort"
            className={selectClass}
            value={query.sort}
            onChange={(event) => {
              const sort = SORTS.find((s) => s === event.target.value);
              if (sort) updateQuery({ sort: sort });
            }}
          >
            {SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="flex h-8 items-center justify-between gap-3 text-sm text-slate-400" aria-live="polite">
        <span className="flex items-center gap-2">
          <span className="inline-flex w-4 justify-center">{state.loading && <Spinner />}</span>
          {statusLine}
        </span>
        {hasActiveFilters(query) && (
          <button
            type="button"
            onClick={() => {
              setDraft('');
              updateQuery({ q: undefined, status: undefined, crewId: undefined, fruit: undefined });
            }}
            className="text-gold hover:underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Altura mínima fija: loading, error y vacío ocupan el mismo espacio y el layout no salta */}
      <section className="relative min-h-[32rem] rounded-xl border border-sea-800 bg-sea-900/40" aria-busy={state.loading}>
        {state.error ? (
          <div className="p-6">
            <ErrorState error={state.error} onRetry={retry} title="No se pudieron cargar los carteles" />
          </div>
        ) : showSkeleton ? (
          <ul className="divide-y divide-sea-800" aria-label="Cargando carteles">
            {Array.from({ length: query.size }, (_, index) => (
              <RowSkeleton key={index} />
            ))}
          </ul>
        ) : shown && shown.content.length === 0 && !state.loading ? (
          <div className="p-6">
            <EmptyState
              title="Ningún cartel coincide"
              description="Prueba con otra búsqueda o quita algunos filtros."
            />
          </div>
        ) : (
          <ul
            className={`divide-y divide-sea-800 transition-opacity motion-reduce:transition-none ${
              state.loading ? 'pointer-events-none opacity-50' : ''
            }`}
          >
            {shown?.content.map((poster) => (
              <li key={poster.id}>
                <Link
                  to={`/wanted/${encodeURIComponent(poster.id)}`}
                  state={{ fromList: true }}
                  className="flex h-20 items-center gap-4 px-4 hover:bg-sea-800/50 focus-visible:bg-sea-800/50 focus-visible:outline-none"
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-parchment font-display text-lg text-ink"
                    aria-hidden="true"
                  >
                    {poster.name.charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-100">{poster.name}</p>
                    <p className="truncate text-xs text-slate-400">
                      “{poster.epithet}” · {poster.crew.name} · {ROLE_LABELS[poster.role]}
                      {poster.devilFruit ? ` · ${poster.devilFruit.name}` : ''}
                    </p>
                  </div>
                  <div className="hidden flex-col items-end gap-1 sm:flex">
                    <StatusBadge status={poster.status} />
                    <ThreatLevel level={poster.threatLevel} />
                  </div>
                  <span className="w-36 text-right font-mono text-sm text-gold">{formatBerries(poster.bounty)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <label htmlFor="wanted-size">Por página</label>
          <select
            id="wanted-size"
            className="rounded-lg border border-sea-700 bg-sea-900 px-2 py-1 text-slate-100"
            value={query.size}
            onChange={(event) => {
              const size = PAGE_SIZES.find((s) => s === Number(event.target.value));
              if (size) updateQuery({ size: size });
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={query.page === 0}
            onClick={() => updateQuery({ page: query.page - 1 }, { resetPage: false })}
            className="rounded-lg border border-sea-700 px-3 py-1.5 text-sm hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Anterior
          </button>
          {pageWindow(query.page, totalPages).map((page) => (
            <button
              key={page}
              type="button"
              aria-current={page === query.page ? 'page' : undefined}
              onClick={() => updateQuery({ page }, { resetPage: false })}
              className={`min-w-9 rounded-lg px-2 py-1.5 text-sm ${
                page === query.page ? 'bg-gold font-semibold text-sea-950' : 'border border-sea-700 hover:border-gold'
              }`}
            >
              {page + 1}
            </button>
          ))}
          <button
            type="button"
            disabled={totalPages === 0 || query.page >= totalPages - 1}
            onClick={() => updateQuery({ page: query.page + 1 }, { resetPage: false })}
            className="rounded-lg border border-sea-700 px-3 py-1.5 text-sm hover:border-gold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      </nav>
    </div>
  );
}
