import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router';
import { isLogPoseLocked } from '../../api/client';
import { getSagaStory } from '../../api/endpoints';
import type { SagaStory } from '../../api/types';
import useAsync from '../../hooks/useAsync';
import EmptyState from '../../components/EmptyState';
import ErrorState from '../../components/ErrorState';
import GrandLineLocked from '../../components/GrandLineLocked';
import { formatMetric, formatNumber } from '../../utils/format';
import GrandLineMap from './GrandLineMap';
import { paletteVars, readSagaPreview, sagaTransitionName } from './sagaUtils';

// Línea horizontal (al 65 % del alto de la ventana) que decide qué etapa está activa.
// Queda por debajo del panel fijo en mobile, así que funciona igual en ambos tamaños.
const ACTIVE_LINE_MARGIN = '-65% 0px -35% 0px';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function supportsScrollTimeline(kind: 'scroll' | 'view'): boolean {
  return typeof CSS !== 'undefined' && CSS.supports(`animation-timeline: ${kind}()`);
}

function BackToSagas() {
  return (
    <Link to="/sagas" viewTransition className="text-sm underline-offset-4 hover:underline">
      ← Todas las sagas
    </Link>
  );
}

function Story({ story }: { story: SagaStory }) {
  const { saga, map, stages } = story;
  const [searchParams, setSearchParams] = useSearchParams();

  // Etapa inicial desde la URL (?stage=slug). Un slug desconocido empieza por la primera.
  const [initialIndex] = useState(() => Math.max(0, stages.findIndex((stage) => stage.slug === searchParams.get('stage'))));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const active = stages[activeIndex];

  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);
  // Hasta terminar el salto inicial a la etapa de la URL, el observer no cambia la etapa activa.
  const ready = useRef(false);

  // Abrir la URL de una etapa lleva directo a esa etapa.
  useEffect(() => {
    if (searchParams.get('stage') && initialIndex > 0) {
      sectionRefs.current[initialIndex]?.scrollIntoView({ block: 'start' });
    }
    const frame = requestAnimationFrame(() => {
      ready.current = true;
    });
    return () => cancelAnimationFrame(frame);
    // Solo al montar la historia: después, la URL sigue al scroll y no al revés.
  }, []);

  // Etapa activa según el scroll: la sección que cruza la línea de activación.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (records) => {
        if (!ready.current) return;
        for (const record of records) {
          if (record.isIntersecting) setActiveIndex(Number((record.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: ACTIVE_LINE_MARGIN },
    );
    sectionRefs.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [stages]);

  // La URL indica la etapa activa (replace: no llena el historial; preventScrollReset: no salta al inicio).
  useEffect(() => {
    if (searchParams.get('stage') === active.slug) return;
    const next = new URLSearchParams(searchParams);
    next.set('stage', active.slug);
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }, [active.slug, searchParams, setSearchParams]);

  // Equivalente sin CSS Scroll-driven Animations: la aparición de cada etapa la marca un IntersectionObserver.
  useEffect(() => {
    if (supportsScrollTimeline('view')) return;
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) {
          if (record.isIntersecting) (record.target as HTMLElement).dataset.seen = 'true';
        }
      },
      { threshold: 0.15 },
    );
    sectionRefs.current.forEach((section) => section && observer.observe(section));
    return () => observer.disconnect();
  }, [stages]);

  // Equivalente sin animation-timeline: scroll(): la barra de progreso se actualiza con el evento scroll.
  useEffect(() => {
    if (supportsScrollTimeline('scroll')) return;
    let frame = 0;
    function update() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(Math.max(window.scrollY / max, 0), 1) : 0;
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${ratio})`;
    }
    function onScroll() {
      if (!frame) frame = requestAnimationFrame(update);
    }
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const goTo = useCallback(
    (index: number) => {
      const target = Math.min(Math.max(index, 0), stages.length - 1);
      const section = sectionRefs.current[target];
      if (!section) return;
      setActiveIndex(target);
      section.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      // El foco va a la etapa para que el teclado y los lectores de pantalla sigan el contenido.
      section.focus({ preventScroll: true });
    },
    [stages.length],
  );

  // Teclado: ← y → (o j / k) recorren las etapas.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' || event.key === 'j') {
        event.preventDefault();
        goTo(activeIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'k') {
        event.preventDefault();
        goTo(activeIndex - 1);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, goTo]);

  const progress = ((activeIndex + 1) / stages.length) * 100;

  return (
    <div
      className="story-root -mx-4 -my-6 min-h-screen bg-[var(--story-bg)] px-4 pb-[40vh] pt-6 text-[var(--story-text)]"
      style={paletteVars(active.palette)}
    >
      <div
        ref={progressRef}
        className="story-progress fixed inset-x-0 top-0 z-30 h-1 bg-[var(--story-primary)]"
        aria-hidden="true"
      />

      <header className="mx-auto max-w-3xl py-10 text-center">
        <BackToSagas />
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[var(--story-accent)]">
          Saga {saga.order} · {saga.stageCount} etapas · {formatNumber(saga.totalDistanceNm)} mn
        </p>
        <h1
          className="mt-3 font-display text-4xl text-[var(--story-primary)] sm:text-5xl"
          style={{ viewTransitionName: sagaTransitionName(saga.id) }}
        >
          {saga.title}
        </h1>
        <p className="mt-2 text-lg italic opacity-80">{saga.subtitle}</p>
        <p className="mt-6 leading-relaxed opacity-90">{saga.intro}</p>
        <p className="mt-6 text-xs opacity-70">Desplázate, usa ← → o elige una etapa en el mapa para navegar.</p>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        {/* Panel persistente: mapa, progreso y métricas de la etapa activa */}
        <aside className="sticky top-0 z-20 self-start rounded-2xl bg-[var(--story-bg)]/95 py-2 lg:top-20 lg:order-2 lg:py-0">
          <GrandLineMap
            width={map.width}
            height={map.height}
            stages={stages}
            activeIndex={activeIndex}
            onSelect={goTo}
          />

          <div className="mt-2 lg:mt-4" aria-live="polite">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-semibold">
                Etapa {activeIndex + 1} de {stages.length}
              </span>
              <span className="truncate pl-3 opacity-80">{active.island.name}</span>
            </div>
            <div
              className="mt-1 h-1.5 rounded-full bg-[var(--story-surface)]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={stages.length}
              aria-valuenow={activeIndex + 1}
              aria-label="Progreso del recorrido"
            >
              <div className="story-bar h-1.5 rounded-full bg-[var(--story-primary)]" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Métricas: siempre las de la etapa activa, sin conteos animados intermedios */}
          <dl className="mt-2 grid grid-cols-2 gap-2 lg:mt-4 lg:gap-3">
            {active.metrics.map((metric) => (
              <div key={metric.key} className="rounded-xl bg-[var(--story-surface)] px-3 py-2 lg:p-3">
                <dt className="truncate text-[0.65rem] uppercase tracking-wide opacity-75 lg:text-xs">{metric.label}</dt>
                <dd className="font-display text-base text-[var(--story-primary)] lg:text-xl">{formatMetric(metric)}</dd>
              </div>
            ))}
          </dl>

          <nav className="mt-3 hidden flex-wrap gap-2 lg:flex" aria-label="Etapas">
            {stages.map((stage, index) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => goTo(index)}
                aria-current={index === activeIndex ? 'step' : undefined}
                className={`h-8 min-w-8 rounded-full px-2 text-sm font-semibold ring-1 ring-[var(--story-text)]/30 ${
                  index === activeIndex ? 'bg-[var(--story-primary)] text-[var(--story-bg)]' : 'bg-[var(--story-surface)]'
                }`}
                title={stage.title}
              >
                {stage.order}
              </button>
            ))}
          </nav>
        </aside>

        {/* Narrativa por etapas: cada sección se activa al cruzar la línea de activación */}
        <ol className="space-y-[30vh] lg:order-1">
          {stages.map((stage, index) => (
            <li key={stage.id}>
              <section
                ref={(node) => {
                  sectionRefs.current[index] = node;
                }}
                data-index={index}
                id={stage.slug}
                tabIndex={-1}
                aria-labelledby={`${stage.slug}-title`}
                className="stage-card scroll-mt-[60vh] rounded-2xl bg-[var(--story-surface)] p-6 ring-1 ring-[var(--story-text)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--story-primary)]"
              >
                <p className="text-xs uppercase tracking-widest text-[var(--story-accent)]">
                  Etapa {stage.order} · {stage.island.name}
                </p>
                <h2 id={`${stage.slug}-title`} className="mt-2 font-display text-2xl text-[var(--story-primary)]">
                  {stage.title}
                </h2>
                <div className="mt-3 space-y-3 leading-relaxed">
                  {stage.narrative.map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex}>{paragraph}</p>
                  ))}
                </div>
                <div className="mt-5 flex justify-between gap-3 text-sm">
                  <button
                    type="button"
                    onClick={() => goTo(index - 1)}
                    disabled={index === 0}
                    className="rounded-lg px-3 py-1.5 ring-1 ring-[var(--story-text)]/30 disabled:opacity-30"
                  >
                    ← Etapa anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(index + 1)}
                    disabled={index === stages.length - 1}
                    className="rounded-lg px-3 py-1.5 ring-1 ring-[var(--story-text)]/30 disabled:opacity-30"
                  >
                    Etapa siguiente →
                  </button>
                </div>
              </section>
            </li>
          ))}
          <li className="py-10 text-center">
            <p className="font-display text-2xl text-[var(--story-primary)]">Fin de la saga</p>
            <p className="mt-2 opacity-80">
              {saga.firstIsland} → {saga.lastIsland} · {formatNumber(saga.totalDistanceNm)} millas náuticas
            </p>
            <div className="mt-4">
              <BackToSagas />
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

export default function SagaStoryPage() {
  const { id = '' } = useParams();
  const location = useLocation();
  const preview = readSagaPreview(location.state);

  const load = useCallback((signal: AbortSignal) => getSagaStory(id, signal), [id]);
  const { state, retry } = useAsync(load);

  if (state.status === 'success') {
    if (state.data.stages.length === 0) {
      return <EmptyState title="Esta saga no tiene etapas" description="El Poneglyph todavía no cuenta esta historia." />;
    }
    return <Story key={id} story={state.data} />;
  }

  return (
    <div className="space-y-6">
      <BackToSagas />
      {/* Mientras carga, el título del resumen ya está en su lugar para la View Transition */}
      {preview && (
        <h1
          className="text-center font-display text-4xl sm:text-5xl"
          style={{ color: preview.palette.primary, viewTransitionName: sagaTransitionName(preview.id) }}
        >
          {preview.title}
        </h1>
      )}
      {state.status === 'loading' && (
        <div className="space-y-4" aria-busy="true" aria-label="Cargando la historia">
          <div className="mx-auto h-64 max-w-3xl animate-pulse rounded-2xl bg-sea-900 motion-reduce:animate-none" />
          <div className="mx-auto h-40 max-w-3xl animate-pulse rounded-2xl bg-sea-900 motion-reduce:animate-none" />
        </div>
      )}
      {state.status === 'error' &&
        (isLogPoseLocked(state.error) ? (
          <GrandLineLocked error={state.error} onRetry={retry} />
        ) : state.error.status === 404 ? (
          <EmptyState title="Esta saga no existe" description="Puede que el enlace esté mal o que no sea de tu workspace." />
        ) : (
          <ErrorState error={state.error} onRetry={retry} title="No se pudo cargar la historia" />
        ))}
    </div>
  );
}
