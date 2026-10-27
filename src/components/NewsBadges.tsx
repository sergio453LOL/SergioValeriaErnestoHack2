import type { NewsPriority, NewsStatus } from '../api/types';
import { NEWS_PRIORITY_LABELS, NEWS_STATUS_LABELS } from '../utils/format';

const STATUS_STYLES: Record<NewsStatus, string> = {
  RUMOR: 'bg-gold/10 text-gold ring-gold/40',
  CONFIRMED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
  DEBUNKED: 'bg-slate-500/15 text-slate-300 ring-slate-400/40 line-through decoration-1',
};

const PRIORITY_STYLES: Record<NewsPriority, string> = {
  LOW: 'text-slate-400',
  MEDIUM: 'text-sky-300',
  HIGH: 'text-orange-300',
  CRITICAL: 'text-coral font-semibold',
};

export function NewsStatusBadge({ status }: { status: NewsStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STATUS_STYLES[status]}`}>
      {NEWS_STATUS_LABELS[status]}
    </span>
  );
}

export function NewsPriorityLabel({ priority }: { priority: NewsPriority }) {
  return <span className={`text-xs uppercase tracking-wide ${PRIORITY_STYLES[priority]}`}>● {NEWS_PRIORITY_LABELS[priority]}</span>;
}
