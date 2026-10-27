import type { FruitFilter, PageSize, WantedQuery, WantedSort, WantedStatus } from '../../api/types';

export const PAGE_SIZES: PageSize[] = [10, 20, 50];
export const SORTS: WantedSort[] = ['bounty,desc', 'name,asc', 'updatedAt,desc'];
export const STATUSES: WantedStatus[] = ['AT_LARGE', 'CAPTURED', 'MISSING'];
export const FRUITS: FruitFilter[] = ['PARAMECIA', 'ZOAN', 'LOGIA', 'NONE'];

const DEFAULT_SIZE: PageSize = 20;
const DEFAULT_SORT: WantedSort = 'bounty,desc';
const MAX_Q = 100;
const MAX_CREW_ID = 200;

function oneOf<T extends string | number>(options: readonly T[], value: string | number | null): T | undefined {
  return options.find((option) => option === value);
}

// Lee la URL y descarta cualquier valor fuera del contrato: una URL inválida nunca rompe la vista.
// En la URL la página es 1-based (?page=2 es la segunda página); la API usa 0-based.
export function parseWantedParams(params: URLSearchParams): WantedQuery {
  const rawPage = params.get('page') ?? '';
  const pageNumber = /^\d+$/.test(rawPage) ? Number(rawPage) : NaN;
  const page = Number.isSafeInteger(pageNumber) && pageNumber >= 1 ? pageNumber - 1 : 0;

  const rawSize = params.get('size');
  const size = oneOf(PAGE_SIZES, rawSize === null ? null : Number(rawSize)) ?? DEFAULT_SIZE;
  const sort = oneOf(SORTS, params.get('sort')) ?? DEFAULT_SORT;
  const status = oneOf(STATUSES, params.get('status'));
  const fruit = oneOf(FRUITS, params.get('fruit'));

  const rawCrew = params.get('crewId')?.trim() ?? '';
  const crewId = rawCrew.length >= 1 && rawCrew.length <= MAX_CREW_ID ? rawCrew : undefined;

  const rawQ = (params.get('q') ?? '').trim().slice(0, MAX_Q).trim();
  const q = rawQ.length > 0 ? rawQ : undefined;

  return { page, size, sort, status, crewId, fruit, q };
}

// Forma canónica de la URL: orden fijo y sin valores por defecto. También sirve como clave de caché.
export function toSearchParams(query: WantedQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set('q', query.q);
  if (query.status) params.set('status', query.status);
  if (query.crewId) params.set('crewId', query.crewId);
  if (query.fruit) params.set('fruit', query.fruit);
  if (query.sort !== DEFAULT_SORT) params.set('sort', query.sort);
  if (query.size !== DEFAULT_SIZE) params.set('size', String(query.size));
  if (query.page > 0) params.set('page', String(query.page + 1));
  return params;
}

export function hasActiveFilters(query: WantedQuery): boolean {
  return Boolean(query.q || query.status || query.crewId || query.fruit);
}
