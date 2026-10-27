import type { CSSProperties } from 'react';
import type { Palette, SagaSummary } from '../../api/types';

// Nombre de View Transition compartido entre la tarjeta del resumen y el título de la historia.
export function sagaTransitionName(id: string): string {
  return `saga-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;
}

// La paleta de la etapa activa se expone como variables CSS; Tailwind las usa con bg-[var(--story-bg)].
export function paletteVars(palette: Palette): CSSProperties {
  const vars: Record<string, string> = {
    '--story-bg': palette.background,
    '--story-surface': palette.surface,
    '--story-primary': palette.primary,
    '--story-accent': palette.accent,
    '--story-text': palette.text,
  };
  return vars;
}

// El resumen viaja en el state del Link para pintar el título al instante durante la transición.
export function readSagaPreview(state: unknown): SagaSummary | null {
  if (typeof state !== 'object' || state === null) return null;
  const preview = (state as Record<string, unknown>).saga;
  if (typeof preview !== 'object' || preview === null) return null;
  const value = preview as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.title === 'string' && typeof value.palette === 'object'
    ? (preview as SagaSummary)
    : null;
}
