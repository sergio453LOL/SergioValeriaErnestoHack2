import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ApiError, isLogPoseLocked, toApiError } from '../../api/client';
import { getNewsById, updateNewsStatus } from '../../api/endpoints';
import type { NewsDetail, NewsStatus, NewsVerdict } from '../../api/types';
import useAsync from '../../hooks/useAsync';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import GrandLineLocked from '../../components/GrandLineLocked';
import { NewsPriorityLabel, NewsStatusBadge } from '../../components/NewsBadges';
import Spinner from '../../components/Spinner';
import { NEWS_STATUS_LABELS, NEWS_TYPE_LABELS, formatDateTime } from '../../utils/format';
import { applyNewsUpdate } from './newsStore';

type VerifyState =
  | { phase: 'idle' }
  | { phase: 'pending'; target: NewsVerdict }
  | { phase: 'success'; status: NewsStatus }
  | { phase: 'conflict'; status: NewsStatus }
  | { phase: 'error'; target: NewsVerdict; error: ApiError };

function cameFromFeed(state: unknown): boolean {
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>).fromFeed === true;
}

function VerifyPanel({ news, onVerified }: { news: NewsDetail; onVerified: (updated: NewsDetail) => void }) {
  const [verify, setVerify] = useState<VerifyState>({ phase: 'idle' });
  const pending = verify.phase === 'pending';

  async function submit(target: NewsVerdict) {
    if (pending) return;
    setVerify({ phase: 'pending', target });
    try {
      const updated = await updateNewsStatus(news.id, target);
      onVerified(updated);
      setVerify({ phase: 'success', status: updated.status });
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === 'NEWS_ALREADY_VERIFIED' && apiError.current) {
        // Ya la verificaron con el otro estado: mostramos el estado real del servidor.
        onVerified(apiError.current);
        setVerify({ phase: 'conflict', status: apiError.current.status });
      } else {
        // Falla: la noticia conserva su estado anterior y se puede reintentar la misma acción.
        setVerify({ phase: 'error', target, error: apiError });
      }
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-sea-700 bg-sea-950/60 p-4" aria-labelledby="verify-title">
      <h3 id="verify-title" className="font-display text-lg text-gold">
        Verificación
      </h3>

      {news.status === 'RUMOR' ? (
        <>
          <p className="mt-1 text-sm text-slate-400">Esta noticia es un rumor. ¿La tripulación puede confirmarla o desmentirla?</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={pending}
              onClick={() => submit('CONFIRMED')}
              className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-sea-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && verify.target === 'CONFIRMED' && <Spinner />} Confirmar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => submit('DEBUNKED')}
              className="flex items-center gap-2 rounded-lg border border-slate-400 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending && verify.target === 'DEBUNKED' && <Spinner />} Desmentir
            </button>
          </div>
        </>
      ) : (
        verify.phase === 'idle' && (
          <p className="mt-1 text-sm text-slate-400">
            Ya verificada como <strong className="text-slate-200">{NEWS_STATUS_LABELS[news.status]}</strong>
            {news.verifiedAt ? ` el ${formatDateTime(news.verifiedAt)}` : ''}.
          </p>
        )
      )}

      <div aria-live="polite" className="mt-3">
        {pending && <p className="text-sm text-slate-400">Enviando verificación…</p>}
        {verify.phase === 'success' && (
          <p role="status" className="rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">
            ✓ Noticia marcada como {NEWS_STATUS_LABELS[verify.status]}. El feed ya muestra el nuevo estado.
          </p>
        )}
        {verify.phase === 'conflict' && (
          <p role="status" className="rounded-lg bg-gold/10 p-3 text-sm text-gold">
            Esta noticia ya había sido verificada como {NEWS_STATUS_LABELS[verify.status]}. Mostramos su estado actual.
          </p>
        )}
        {verify.phase === 'error' && (
          <div role="alert" className="rounded-lg border border-coral/40 bg-coral/10 p-3 text-sm">
            <p className="font-semibold text-coral">No se pudo marcar como {NEWS_STATUS_LABELS[verify.target]}.</p>
            <p className="mt-1 text-slate-300">
              {verify.error.message} La noticia sigue como {NEWS_STATUS_LABELS[news.status]}.
            </p>
            <button
              type="button"
              onClick={() => submit(verify.target)}
              className="mt-2 rounded-lg bg-coral px-3 py-1.5 font-semibold text-sea-950 hover:bg-coral/90"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function NewsDialog({ id }: { id: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dialogRef = useRef<HTMLDivElement>(null);

  const load = useCallback((signal: AbortSignal) => getNewsById(id, signal), [id]);
  const { state, retry } = useAsync(load);
  const [updated, setUpdated] = useState<NewsDetail | null>(null);
  const news = updated ?? (state.status === 'success' ? state.data : null);

  const close = useCallback(() => {
    // Volver con el historial deja el feed exactamente como estaba (mismos filtros y scroll).
    if (cameFromFeed(location.state)) navigate(-1);
    else navigate({ pathname: '/news', search: location.search }, { preventScrollReset: true });
  }, [location.state, location.search, navigate]);

  useEffect(() => {
    dialogRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [close]);

  function handleVerified(next: NewsDetail) {
    setUpdated(next);
    applyNewsUpdate(next);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/70 p-4 sm:p-8"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="news-title"
        tabIndex={-1}
        className="relative w-full max-w-2xl rounded-2xl border border-sea-700 bg-sea-900 p-6 shadow-2xl focus:outline-none"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar noticia"
          className="absolute right-4 top-4 rounded-lg px-2 py-1 text-slate-400 hover:bg-sea-800 hover:text-slate-100"
        >
          ✕
        </button>

        {state.status === 'loading' && !news && (
          <div className="space-y-3" aria-busy="true" aria-label="Cargando noticia">
            <div className="h-5 w-40 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
            <div className="h-32 animate-pulse rounded bg-sea-800 motion-reduce:animate-none" />
          </div>
        )}

        {state.status === 'error' && (
          <div className="pt-6">
            {isLogPoseLocked(state.error) ? (
              <GrandLineLocked error={state.error} onRetry={retry} />
            ) : state.error.status === 404 ? (
              <EmptyState title="Esta noticia no existe" description="Puede que el enlace esté mal o que no sea de tu workspace." />
            ) : (
              <ErrorState error={state.error} onRetry={retry} title="No se pudo cargar la noticia" />
            )}
          </div>
        )}

        {news && (
          <article>
            <div className="flex flex-wrap items-center gap-2 pr-10 text-xs text-slate-400">
              <span className="rounded bg-sea-800 px-2 py-0.5 text-slate-200">{NEWS_TYPE_LABELS[news.type]}</span>
              <NewsPriorityLabel priority={news.priority} />
              <NewsStatusBadge status={news.status} />
            </div>
            <h2 id="news-title" className="mt-3 font-display text-2xl text-parchment">
              {news.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {news.source} · {news.island} · {formatDateTime(news.publishedAt)}
            </p>
            <p className="mt-4 font-semibold text-slate-200">{news.summary}</p>
            <div className="mt-3 space-y-3 leading-relaxed text-slate-300">
              {news.body.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            {news.relatedWanted && (
              <p className="mt-4 text-sm text-slate-400">
                Cartel relacionado:{' '}
                <Link to={`/wanted/${encodeURIComponent(news.relatedWanted.id)}`} className="text-gold hover:underline">
                  {news.relatedWanted.name}
                </Link>
              </p>
            )}
            <VerifyPanel news={news} onVerified={handleVerified} />
          </article>
        )}
      </div>
    </div>
  );
}

export default function NewsDetailModal() {
  const { id = '' } = useParams();
  // key: al cambiar de noticia se reinicia todo el estado del diálogo.
  return <NewsDialog key={id} id={id} />;
}
