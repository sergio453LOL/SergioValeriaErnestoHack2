import type { NewsFilters, NewsPriority, NewsStatus, NewsType } from '../../api/types';

export const NEWS_TYPES: NewsType[] = ['BOUNTY_UPDATE', 'BATTLE', 'MARINE_OPERATION', 'WORLD_GOVERNMENT', 'DISCOVERY'];
export const NEWS_PRIORITIES: NewsPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const NEWS_STATUSES: NewsStatus[] = ['RUMOR', 'CONFIRMED', 'DEBUNKED'];

function oneOf<T extends string>(options: readonly T[], value: string | null): T | undefined {
  return options.find((option) => option === value);
}

// Filtros del feed desde la URL. Valores fuera del contrato se descartan.
export function parseNewsFilters(params: URLSearchParams): NewsFilters {
  return {
    type: oneOf(NEWS_TYPES, params.get('type')),
    priority: oneOf(NEWS_PRIORITIES, params.get('priority')),
    status: oneOf(NEWS_STATUSES, params.get('status')),
  };
}

// Forma canónica (orden fijo). También es la clave del feed en newsStore.
export function newsFiltersToParams(filters: NewsFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.status) params.set('status', filters.status);
  return params;
}
