import type { WantedStatus } from '../api/types';
import { STATUS_LABELS } from '../utils/format';

const STYLES: Record<WantedStatus, string> = {
  AT_LARGE: 'bg-coral/15 text-coral ring-coral/40',
  CAPTURED: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/40',
  MISSING: 'bg-slate-500/15 text-slate-300 ring-slate-400/40',
};

export default function StatusBadge({ status }: { status: WantedStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
