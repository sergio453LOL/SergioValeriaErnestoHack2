import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, Outlet, useSearchParams } from 'react-router';
import { ApiError, isCanceled, isLogPoseLocked, toApiError } from '../../api/client';
import { getNewsFeed } from '../../api/endpoints';
import type { NewsFilters, NewsItem } from '../../api/types';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import GrandLineLocked from '../../components/GrandLineLocked';
import { NewsPriorityLabel, NewsStatusBadge } from '../../components/NewsBadges';
import Spinner from '../../components/Spinner';
import { NEWS_PRIORITY_LABELS, NEWS_STATUS_LABELS, NEWS_TYPE_LABELS, formatDateTime } from '../../utils/format';
import { NEWS_PRIORITIES, NEWS_STATUSES, NEWS_TYPES, newsFiltersToParams, parseNewsFilters } from './newsParams';
import { appendUnique, deleteFeedEntry, getFeedEntry, setFeedEntry, subscribeNews } from './newsStore';

const FEED_LIMIT = 20;
const CURSOR_ERRORS = ['INVALID_CURSOR', 'CURSOR_FILTER_MISMATCH'];

type LoadMode = 'first' | 'more';

interface RequestStatus {
  key: string;
  loading: boolean;
  error: ApiError | null;
  mode: LoadMode;
}

const selectClass =
  'w-full rounded-lg border border-sea-700 bg-sea-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-gold/50';

function NewsCard({ item, search }: { item: NewsItem; search: string }) {
  return (
    <li>
      <Link
        to={{ pathname: `/news/${encodeURIComponent(item.id)}`, search }}
        state={{ fromFeed: true }}
        // Abrir el detalle no debe mover el scroll del feed que queda debajo.
        preventScrollReset
        className="block rounded-xl border border-sea-800 bg-sea-900/60 p-4 hover:border-gold/50 focus-visible:border-gold focus-visible:outline-none"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded bg-sea-800 px-2 py-0.5 text-slate-200">{NEWS_TYPE_LABELS[item.type]}</span>
          <NewsPriorityLabel priority={item.priority} />
          <span className="ml-auto">
            <NewsStatusBadge status={item.status} />
          </span>
        </div>
        <h2 className="mt-2 font-display text-lg text-parchment">{item.title}</h2>
        <p className="mt-1 text-sm text-slate-300">{item.summary}</p>
        <p className="mt-2 text-xs text-slate-500">
          {item.source} · {item.island} · {formatDateTime(item.publishedAt)}
        </p>
      </Link>
    </li>
  );
}

function CardSkeleton() {
  return <li className="h-36 animate-pulse rounded-xl bg-sea-900 motion-reduce:animate-none" />;
}

export default function NewsFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const key = newsFiltersToParams(parseNewsFilters(searchParams)).toString();
  const filters = useMemo<NewsFilters>(() => parseNewsFilters(new URLSearchParams(key)), [key]);

  // Filtros inválidos en la URL se corrigen sin romper la vista.
  useEffect(() => {
    if (searchParams.toString() !== key) setSearchParams(new URLSearchParams(key), { replace: true });
  }, [key, searchParams, setSearchParams]);

  const entry = useSyncExternalStore(subscribeNews, () => getFeedEntry(key));
  const [status, setStatus] = useState<RequestStatus>({ key, loading: false, error: null, mode: 'first' });
  const current = status.key === key ? status : { key, loading: false, error: null, mode: 'first' as LoadMode };

  // Una sola carga en vuelo. Es un ref (no estado) para que dos disparos seguidos del observer no pasen ambos.
  const inFlight = useRef<AbortController | null>(null);
  // Filtros que el usuario ve ahora: una respuesta de otros filtros se descarta.
  const activeKey = useRef(key);
  useLayoutEffect(() => {
    activeKey.current = key;
  }, [key]);

  const load = useCallback(
    (mode: LoadMode) => {
      if (inFlight.current) return;
      const existing = getFeedEntry(key);
      if (mode === 'more' && (!existing || !existing.hasMore || !existing.nextCursor)) return;

      const controller = new AbortController();
      inFlight.current = controller;
      setStatus({ key, loading: true, error: null, mode });

      getNewsFeed(
        { ...filters, cursor: mode === 'more' ? (existing?.nextCursor ?? undefined) : undefined, limit: FEED_LIMIT },
        controller.signal,
      )
        .then((page) => {
          if (inFlight.current === controller) inFlight.current = null;
          if (controller.signal.aborted || activeKey.current !== key) return;
          const base = mode === 'more' ? (getFeedEntry(key)?.items ?? []) : [];
          setFeedEntry(key, {
            filters,
            items: appendUnique(base, page.items),
            nextCursor: page.nextCursor,
            hasMore: page.hasMore && page.nextCursor !== null,
          });
          setStatus({ key, loading: false, error: null, mode });
        })
        .catch((error: unknown) => {
          if (inFlight.current === controller) inFlight.current = null;
          if (isCanceled(error) || controller.signal.aborted || activeKey.current !== key) return;
          // Error: las noticias ya cargadas se conservan; solo guardamos el error para reintentar.
          setStatus({ key, loading: false, error: toApiError(error), mode });
        });
    },
    [key, filters],
  );

  // Cambiar filtros cancela la carga en vuelo de los filtros anteriores: nunca se mezclan resultados.
  useEffect(() => {
    if (!getFeedEntry(key)) load('first');
    return () => {
      inFlight.current?.abort();
      inFlight.current = null;
    };
  }, [key, load]);

  const retry = useCallback(() => {
    if (current.error && CURSOR_ERRORS.includes(current.error.code)) {
      // Cursor alterado o de otros filtros: el contrato pide empezar de nuevo sin cursor.
      deleteFeedEntry(key);
      load('first');
      return;
    }
    load(getFeedEntry(key) ? current.mode : 'first');
  }, [current.error, current.mode, key, load]);

  // Infinite scroll: cuando el centinela del final se acerca a la pantalla, se pide la página siguiente.
  const sentinelRef = useRef<HTMLDivElement>(null);
  const canAutoLoad = Boolean(entry?.hasMore) && !current.error;
  const loadedCount = entry?.items.length ?? 0;
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !canAutoLoad) return;
    // Se vuelve a crear tras cada página: si el centinela sigue visible, carga la siguiente.
    const observer = new IntersectionObserver(
      (records) => {
        if (records.some((record) => record.isIntersecting)) load('more');
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [canAutoLoad, load, loadedCount]);

  function updateFilters(changes: Partial<NewsFilters>) {
    const next = newsFiltersToParams({ ...filters, ...changes });
    if (next.toString() !== key) setSearchParams(next);
  }

  const locked = current.error !== null && isLogPoseLocked(current.error);
  const search = key ? `?${key}` : '';

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-parchment">News Coo</h1>
        <p className="text-sm text-slate-400">Noticias del mundo, entregadas por las gaviotas mensajeras</p>
      </div>

      <div className="grid gap-3 rounded-xl border border-sea-800 bg-sea-900/60 p-4 sm:grid-cols-3">
        <div>
          <label htmlFor="news-type" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Tipo
          </label>
          <select
            id="news-type"
            className={selectClass}
            value={filters.type ?? ''}
            onChange={(event) => updateFilters({ type: NEWS_TYPES.find((value) => value === event.target.value) })}
          >
            <option value="">Todos</option>
            {NEWS_TYPES.map((value) => (
              <option key={value} value={value}>
                {NEWS_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-priority" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Prioridad
          </label>
          <select
            id="news-priority"
            className={selectClass}
            value={filters.priority ?? ''}
            onChange={(event) => updateFilters({ priority: NEWS_PRIORITIES.find((value) => value === event.target.value) })}
          >
            <option value="">Todas</option>
            {NEWS_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {NEWS_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="news-status" className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
            Estado
          </label>
          <select
            id="news-status"
            className={selectClass}
            value={filters.status ?? ''}
            onChange={(event) => updateFilters({ status: NEWS_STATUSES.find((value) => value === event.target.value) })}
          >
            <option value="">Todos</option>
            {NEWS_STATUSES.map((value) => (
              <option key={value} value={value}>
                {NEWS_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex h-6 items-center justify-between text-sm text-slate-400" aria-live="polite">
        <span>{entry ? `${loadedCount} noticias cargadas` : current.loading ? 'Buscando noticias…' : ''}</span>
        {key && (
          <button type="button" onClick={() => setSearchParams(new URLSearchParams())} className="text-gold hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {locked && current.error ? (
        <GrandLineLocked error={current.error} onRetry={retry} />
      ) : !entry ? (
        current.error ? (
          <ErrorState error={current.error} onRetry={retry} title="No se pudo cargar el feed" />
        ) : (
          <ul className="space-y-3" aria-busy="true" aria-label="Cargando noticias">
            {Array.from({ length: 4 }, (_, index) => (
              <CardSkeleton key={index} />
            ))}
          </ul>
        )
      ) : entry.items.length === 0 && !entry.hasMore ? (
        <EmptyState title="No hay noticias con estos filtros" description="Prueba con otra combinación de filtros." />
      ) : (
        <>
          <ul className="space-y-3">
            {entry.items.map((item) => (
              <NewsCard key={item.id} item={item} search={search} />
            ))}
          </ul>

          <div className="min-h-24" aria-live="polite">
            {current.loading && current.mode === 'more' && (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
                <Spinner /> Cargando más noticias…
              </p>
            )}
            {current.error && (
              <ErrorState error={current.error} onRetry={retry} title="No se pudieron cargar más noticias" />
            )}
            {!entry.hasMore && !current.error && (
              <p className="py-6 text-center text-sm text-slate-500">⚓ Llegaste al final del feed: no hay más noticias.</p>
            )}
          </div>
        </>
      )}

      {/* Centinela del infinite scroll */}
      <div ref={sentinelRef} aria-hidden="true" />

      {/* El detalle se abre encima del feed: el feed sigue montado y conserva su posición */}
      <Outlet />
    </div>
  );
}
