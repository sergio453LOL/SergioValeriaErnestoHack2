import type {
  CrewRole,
  FruitFilter,
  NewsPriority,
  NewsStatus,
  NewsType,
  StageMetric,
  WantedSort,
  WantedStatus,
} from '../api/types';

const numberFormat = new Intl.NumberFormat('es-PE');
const dateFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' });
const dateTimeFormat = new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' });

export function formatBerries(amount: number): string {
  // Espacio sin quiebre: el símbolo nunca queda separado de la cifra.
  return `฿ ${numberFormat.format(amount)}`;
}

export function formatNumber(value: number): string {
  return numberFormat.format(value);
}

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

export const STATUS_LABELS: Record<WantedStatus, string> = {
  AT_LARGE: 'Prófugo',
  CAPTURED: 'Capturado',
  MISSING: 'Desaparecido',
};

export const FRUIT_LABELS: Record<FruitFilter, string> = {
  PARAMECIA: 'Paramecia',
  ZOAN: 'Zoan',
  LOGIA: 'Logia',
  NONE: 'Sin fruta',
};

export const SORT_LABELS: Record<WantedSort, string> = {
  'bounty,desc': 'Mayor recompensa',
  'name,asc': 'Nombre (A-Z)',
  'updatedAt,desc': 'Actualizados recientemente',
};

export const ROLE_LABELS: Record<CrewRole, string> = {
  CAPTAIN: 'Capitán',
  FIRST_MATE: 'Segundo al mando',
  NAVIGATOR: 'Navegante',
  SNIPER: 'Francotirador',
  COOK: 'Cocinero',
  DOCTOR: 'Médico',
  SHIPWRIGHT: 'Carpintero',
  MUSICIAN: 'Músico',
  ARCHAEOLOGIST: 'Arqueólogo',
  HELMSMAN: 'Timonel',
  FIGHTER: 'Combatiente',
};

export const NEWS_TYPE_LABELS: Record<NewsType, string> = {
  BOUNTY_UPDATE: 'Recompensas',
  BATTLE: 'Batalla',
  MARINE_OPERATION: 'Operación de la Marina',
  WORLD_GOVERNMENT: 'Gobierno Mundial',
  DISCOVERY: 'Descubrimiento',
};

export const NEWS_PRIORITY_LABELS: Record<NewsPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const NEWS_STATUS_LABELS: Record<NewsStatus, string> = {
  RUMOR: 'Rumor',
  CONFIRMED: 'Confirmada',
  DEBUNKED: 'Desmentida',
};

// El valor de una métrica de etapa con su unidad, tal como llega del servidor.
export function formatMetric(metric: StageMetric): string {
  if (metric.unit === 'berries') return formatBerries(metric.value);
  if (metric.unit === '%') return `${formatNumber(metric.value)} %`;
  if (metric.unit.startsWith('/')) return `${formatNumber(metric.value)}${metric.unit}`;
  return `${formatNumber(metric.value)} ${metric.unit}`;
}
