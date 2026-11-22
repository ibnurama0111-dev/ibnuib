import { useMemo, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { CheckLog, CycleInfo, ItemCondition } from '../types/inventory.ts';
import {
  exportLogsToCsv,
  formatDiscrepancy,
  formatTimeShort,
  getConditionTone,
} from '../utils/formatters.ts';

interface HistoryReportViewProps {
  logs: CheckLog[];
  cycleInfo: CycleInfo;
  onRequestResetCycle: () => void;
}

export function HistoryReportView({
  logs,
  cycleInfo,
  onRequestResetCycle,
}: HistoryReportViewProps) {
  const [onlyIssues, setOnlyIssues] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!onlyIssues) return logs;
    return logs.filter(
      (log) => log.discrepancy !== 0 || log.condition !== ItemCondition.BAIK,
    );
  }, [logs, onlyIssues]);

  const summary = useMemo(() => {
    const totalChecks = logs.length;
    const minusCount = logs.filter((l) => l.discrepancy < 0).length;
    const surplusCount = logs.filter((l) => l.discrepancy > 0).length;
    const damagedCount = logs.filter((l) => l.condition !== ItemCondition.BAIK).length;
    return { totalChecks, minusCount, surplusCount, damagedCount };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Cycle Header & Summary */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-medium text-slate-500">Siklus Pemeriksaan Aktif</div>
            <h2 className="mt-1 font-display text-lg font-semibold text-slate-900">
              {cycleInfo.cycleName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Dimulai pada {formatTimeShort(cycleInfo.startedAt)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportLogsToCsv(filteredLogs)}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              <span>Unduh Riwayat CSV</span>
            </button>
            <button
              type="button"
              onClick={onRequestResetCycle}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span>Mulai Siklus Baru</span>
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 sm:grid-cols-4">
          <div>
            <div className="text-xs text-slate-500">Total Catatan Cek</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-slate-900">
              {summary.totalChecks}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Temuan Minus</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-red-700">
              {summary.minusCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Temuan Surplus</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-700">
              {summary.surplusCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Kondisi Tidak Prima</div>
            <div className="mt-1 font-mono text-xl font-semibold tabular-nums text-amber-700">
              {summary.damagedCount}
            </div>
          </div>
        </div>
      </section>

      {/* Audit Log Table */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="font-display text-sm font-semibold text-slate-900">
            Riwayat Pemeriksaan Barang
          </h3>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOnlyIssues(false)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                !onlyIssues
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Catatan ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setOnlyIssues(true)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                onlyIssues
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Hanya Selisih &amp; Cacat
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada catatan pemeriksaan yang sesuai dengan filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-3 pl-5">Waktu · Pemeriksa</th>
                  <th className="px-3 py-3">Barang &amp; ISBN</th>
                  <th className="px-3 py-3 text-right">Sistem → Fisik</th>
                  <th className="px-3 py-3 text-right">Selisih</th>
                  <th className="px-3 py-3">Kondisi</th>
                  <th className="py-3 pr-5 pl-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 pr-3 pl-5 whitespace-nowrap">
                      <div className="font-mono text-xs tabular-nums text-slate-800">
                        {formatTimeShort(log.checkedAt)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">{log.inspector}</div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-slate-900">{log.title}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{log.isbn}</span>
                        <span aria-hidden="true">·</span>
                        <span>{log.rackLocation}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-800 whitespace-nowrap">
                      {log.systemStockBefore} → {log.physicalStock}
                      {log.syncedSystemStock && (
                        <div className="text-[11px] font-sans text-blue-700">
                          Stok sistem disesuaikan
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums whitespace-nowrap">
                      <span
                        className={
                          log.discrepancy === 0
                            ? 'text-emerald-700'
                            : log.discrepancy < 0
                              ? 'text-red-700'
                              : 'text-amber-700'
                        }
                      >
                        {formatDiscrepancy(log.discrepancy)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-medium ${getConditionTone(log.condition)}`}>
                        {log.condition}
                      </span>
                    </td>
                    <td className="py-3 pr-5 pl-3 text-xs text-slate-600 max-w-xs">
                      {log.notes || <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
