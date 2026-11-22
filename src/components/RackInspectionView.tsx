import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { BookItem, CheckStatus, ItemCondition } from '../types/inventory.ts';
import { formatDiscrepancy } from '../utils/formatters.ts';
import { StatusIndicator } from './StatusIndicator.tsx';

interface RackInspectionViewProps {
  items: BookItem[];
  onCheckItem: (item: BookItem) => void;
  onViewRackInTable: (rackCode: string) => void;
}

export function RackInspectionView({
  items,
  onCheckItem,
  onViewRackInTable,
}: RackInspectionViewProps) {
  const racks = useMemo(() => {
    const grouped = new Map<string, BookItem[]>();
    for (const item of items) {
      const code = item.rackCode || 'Rak Umum';
      const list = grouped.get(code) ?? [];
      list.push(item);
      grouped.set(code, list);
    }

    return Array.from(grouped.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([rackCode, rackItems]) => {
        const checked = rackItems.filter(
          (i) => i.checkStatus !== CheckStatus.BELUM_DICEK,
        ).length;
        const discrepancies = rackItems.filter(
          (i) => i.checkStatus === CheckStatus.SELISIH,
        ).length;
        const issues = rackItems.filter(
          (i) =>
            i.condition !== ItemCondition.BAIK ||
            i.checkStatus === CheckStatus.PERLU_TINDAKAN,
        ).length;
        const totalUnits = rackItems.reduce((sum, i) => sum + i.systemStock, 0);
        const progress =
          rackItems.length > 0 ? Math.round((checked / rackItems.length) * 100) : 0;

        return {
          rackCode,
          items: rackItems,
          checked,
          discrepancies,
          issues,
          totalUnits,
          progress,
        };
      });
  }, [items]);

  const [selectedRack, setSelectedRack] = useState<string>(() => racks[0]?.rackCode ?? '');

  const activeRack = useMemo(
    () => racks.find((r) => r.rackCode === selectedRack) ?? racks[0] ?? null,
    [racks, selectedRack],
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {racks.map((rack) => {
          const isActive = activeRack?.rackCode === rack.rackCode;
          const isComplete = rack.checked === rack.items.length && rack.items.length > 0;

          return (
            <button
              key={rack.rackCode}
              type="button"
              onClick={() => setSelectedRack(rack.rackCode)}
              className={`flex flex-col justify-between rounded-lg border p-5 text-left transition-colors ${
                isActive
                  ? 'border-blue-700 bg-white ring-1 ring-blue-700'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-semibold text-slate-900">
                    {rack.rackCode}
                  </span>
                  {isComplete ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Selesai</span>
                    </span>
                  ) : (
                    <span className="font-mono text-xs font-medium tabular-nums text-slate-600">
                      {rack.checked}/{rack.items.length} SKU
                    </span>
                  )}
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                  <span className="tabular-nums">{rack.totalUnits} total unit</span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      rack.discrepancies > 0 ? 'font-medium text-red-700' : 'text-slate-500'
                    }
                  >
                    {rack.discrepancies} selisih
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    className={
                      rack.issues > 0 ? 'font-medium text-amber-700' : 'text-slate-500'
                    }
                  >
                    {rack.issues} catatan kondisi
                  </span>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Progres pemeriksaan</span>
                  <span className="font-mono font-medium tabular-nums text-slate-700">
                    {rack.progress}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full transition-all ${
                      isComplete ? 'bg-emerald-600' : 'bg-blue-700'
                    }`}
                    style={{ width: `${rack.progress}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {activeRack && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-base font-semibold text-slate-900">
                Daftar Barang di {activeRack.rackCode}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Lakukan pengecekan berurutan per sub-rak agar tidak ada judul yang terlewat.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onViewRackInTable(activeRack.rackCode)}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <span>Buka di Tabel Inventaris</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {activeRack.items.map((item) => {
              const diff =
                item.physicalStock !== null ? item.physicalStock - item.systemStock : null;

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <span className="font-medium text-slate-900">{item.title}</span>
                      <StatusIndicator status={item.checkStatus} />
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                      <span className="font-mono tabular-nums">{item.isbn}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.rackLocation}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.condition}</span>
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-xs text-slate-600">Catatan: {item.notes}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <div className="text-right text-xs">
                      <div className="text-slate-500">Sistem / Fisik</div>
                      <div className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-slate-900">
                        {item.systemStock} /{' '}
                        {item.physicalStock !== null ? item.physicalStock : '—'}
                        {diff !== null && diff !== 0 && (
                          <span
                            className={`ml-1.5 ${
                              diff < 0 ? 'text-red-700' : 'text-amber-700'
                            }`}
                          >
                            ({formatDiscrepancy(diff)})
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onCheckItem(item)}
                      className="min-h-9 rounded-md bg-blue-700 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-blue-800 whitespace-nowrap"
                    >
                      {item.checkStatus === CheckStatus.BELUM_DICEK ? 'Periksa' : 'Cek Ulang'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
