import type { NewsFilters, NewsItem } from '../../api/types';

// Feed ya cargado por cada combinación de filtros (clave = query canónica de la URL).
// Vive fuera de los componentes: al cerrar el detalle o volver a /news no se pide otra vez lo que ya teníamos.
export interface FeedEntry {
  filters: NewsFilters;
  items: NewsItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

const entries = new Map<string, FeedEntry>();
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeNews(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getFeedEntry(key: string): FeedEntry | undefined {
  return entries.get(key);
}

export function setFeedEntry(key: string, entry: FeedEntry): void {
  entries.set(key, entry);
  notify();
}

export function deleteFeedEntry(key: string): void {
  if (entries.delete(key)) notify();
}

// Regla de Nami: agrega solo las noticias cuyo id todavía no está en la lista.
export function appendUnique(current: NewsItem[], incoming: NewsItem[]): NewsItem[] {
  const seen = new Set(current.map((item) => item.id));
  const fresh: NewsItem[] = [];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      fresh.push(item);
    }
  }
  return fresh.length > 0 ? [...current, ...fresh] : current;
}

// Tras verificar una noticia, la reflejamos en todos los feeds guardados.
// Si un feed filtra por un estado que la noticia ya no tiene (p. ej. status=RUMOR), sale de ese feed.
export function applyNewsUpdate(updated: NewsItem): void {
  let changed = false;
  for (const [key, entry] of entries) {
    if (!entry.items.some((item) => item.id === updated.id)) continue;
    const stillMatches = !entry.filters.status || entry.filters.status === updated.status;
    const items = stillMatches
      ? entry.items.map((item) => (item.id === updated.id ? { ...item, ...pickItem(updated) } : item))
      : entry.items.filter((item) => item.id !== updated.id);
    entries.set(key, { ...entry, items });
    changed = true;
  }
  if (changed) notify();
}

function pickItem(news: NewsItem): NewsItem {
  const { id, type, priority, status, title, summary, source, island, relatedWanted, publishedAt, updatedAt, verifiedAt } =
    news;
  return { id, type, priority, status, title, summary, source, island, relatedWanted, publishedAt, updatedAt, verifiedAt };
}

export function clearNewsCache(): void {
  entries.clear();
  notify();
}
