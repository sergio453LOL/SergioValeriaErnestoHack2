import type { WantedPage } from '../../api/types';

// Caché en memoria de páginas ya recibidas, por clave de URL canónica.
// Al volver del detalle el listado se pinta al instante, igual que se dejó, sin pedirlo otra vez.
const MAX_ENTRIES = 30;
const pages = new Map<string, WantedPage>();

export function getCachedPage(key: string): WantedPage | undefined {
  return pages.get(key);
}

export function setCachedPage(key: string, page: WantedPage): void {
  pages.delete(key);
  pages.set(key, page);
  if (pages.size > MAX_ENTRIES) {
    const oldest = pages.keys().next().value;
    if (oldest !== undefined) pages.delete(oldest);
  }
}

// Se limpia al cambiar de sesión: cada tripulación tiene su propio workspace.
export function clearWantedCache(): void {
  pages.clear();
}
