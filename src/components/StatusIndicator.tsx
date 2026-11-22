import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { CheckStatus } from '../types/inventory.ts';

interface StatusIndicatorProps {
  status: CheckStatus;
}

export function StatusIndicator({ status }: StatusIndicatorProps) {
  switch (status) {
    case CheckStatus.SESUAI:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Sesuai</span>
        </span>
      );
    case CheckStatus.SELISIH:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 whitespace-nowrap">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Selisih Stok</span>
        </span>
      );
    case CheckStatus.PERLU_TINDAKAN:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Perlu Tindakan</span>
        </span>
      );
    case CheckStatus.BELUM_DICEK:
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Belum Dicek</span>
        </span>
      );
  }
}
