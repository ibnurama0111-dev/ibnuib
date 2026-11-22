import { useMemo, useState } from 'react';
import { Download, Edit3, Search, Trash2 } from 'lucide-react';
import { BookCategory, BookItem, CheckStatus, ItemCondition } from '../types/inventory.ts';
import {
  exportInventoryToCsv,
  formatDiscrepancy,
  formatRupiah,
  formatTimeShort,
  getConditionTone,
} from '../utils/formatters.ts';
import { BookCoverThumb } from './BookCoverThumb.tsx';
import { StatusIndicator } from './StatusIndicator.tsx';

interface InventoryTableViewProps {
  items: BookItem[];
  cycleName: string;
  initialRackFilter?: string;
  onClearRackFilter?: () => void;
  onCheckItem: (item: BookItem) => void;
  onEditItem: (item: BookItem) => void;
  onDeleteItem: (item: BookItem) => void;
  onOpenAddModal: () => void;
}

type StatusFilter = 'ALL' | CheckStatus | 'LOW_STOCK';

export function InventoryTableView({
  items,
  cycleName,
  initialRackFilter = '',
  onClearRackFilter,
  onCheckItem,
  onEditItem,
  onDeleteItem,
  onOpenAddModal,
}: InventoryTableViewProps) {
  const [search, setSearch] = useState(initialRackFilter);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | BookCategory>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');

  const stats = useMemo(() => {
    const totalSku = items.length;
    const checkedCount = items.filter((i) => i.checkStatus !== CheckStatus.BELUM_DICEK).length;
    const discrepancyCount = items.filter((i) => i.checkStatus === CheckStatus.SELISIH).length;
    const issueOrLowCount = items.filter(
      (i) =>
        i.condition !== ItemCondition.BAIK ||
        i.systemStock <= i.minStock ||
        i.checkStatus === CheckStatus.PERLU_TINDAKAN,
    ).length;
    return { totalSku, checkedCount, discrepancyCount, issueOrLowCount };
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (statusFilter === 'LOW_STOCK') {
        if (item.systemStock > item.minStock) return false;
      } else if (statusFilter !== 'ALL' && item.checkStatus !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.isbn.toLowerCase().includes(q) ||
        item.title.toLowerCase().includes(q) ||
        item.author.toLowerCase().includes(q) ||
        item.publisher.toLowerCase().includes(q) ||
        item.rackLocation.toLowerCase().includes(q)
      );
    });
  }, [items, search, categoryFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* 4-Column Flat KPI Strip */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Total SKU Terdaftar</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-slate-900">
            {stats.totalSku}
          </div>
          <div className="mt-1 text-xs text-slate-500">Buku &amp; perlengkapan tulis</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Sudah Diperiksa</div>
          <div className="mt-1.5 font-mono text-2xl font-semibold tabular-nums text-blue-700">
            {stats.checkedCount} / {stats.totalSku}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats.totalSku > 0
              ? `${Math.round((stats.checkedCount / stats.totalSku) * 100)}% siklus selesai`
              : '0%'}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Selisih Stok</div>
          <div
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              stats.discrepancyCount > 0 ? 'text-red-700' : 'text-emerald-700'
            }`}
          >
            {stats.discrepancyCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Sistem vs hitungan fisik</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white px-5 py-4">
          <div className="text-xs font-medium text-slate-500">Rusak / Stok Menipis</div>
          <div
            className={`mt-1.5 font-mono text-2xl font-semibold tabular-nums ${
              stats.issueOrLowCount > 0 ? 'text-amber-700' : 'text-emerald-700'
            }`}
          >
            {stats.issueOrLowCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Perlu PO ulang atau retur</div>
        </div>
      </section>

      {/* Toolbar & Table */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 lg:max-w-md">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (onClearRackFilter && e.target.value === '') {
                    onClearRackFilter();
                  }
                }}
                placeholder="Cari ISBN, judul, penulis, penerbit, atau rak..."
                className="h-10 w-full rounded-md border border-slate-300 bg-white pr-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter kategori barang"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as 'ALL' | BookCategory)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 focus:border-blue-600 focus:outline-none"
              >
                <option value="ALL">Semua Kategori</option>
                {Object.values(BookCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => exportInventoryToCsv(filteredItems, cycleName)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                <span>Ekspor CSV</span>
              </button>
            </div>
          </div>

          {/* Interactive Status Segmented Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { key: 'ALL', label: 'Semua' },
                { key: CheckStatus.BELUM_DICEK, label: 'Belum Dicek' },
                { key: CheckStatus.SESUAI, label: 'Sesuai' },
                { key: CheckStatus.SELISIH, label: 'Selisih Stok' },
                { key: CheckStatus.PERLU_TINDAKAN, label: 'Perlu Tindakan' },
                { key: 'LOW_STOCK', label: 'Stok Menipis' },
              ] as { key: StatusFilter; label: string }[]
            ).map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
            <span className="ml-auto text-xs text-slate-500 tabular-nums">
              Menampilkan {filteredItems.length} dari {items.length} barang
            </span>
          </div>
        </div>

        {/* High-Density Operational Table */}
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              Tidak ada barang yang cocok dengan filter saat ini.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah kata kunci pencarian atau tambahkan SKU baru ke katalog toko buku.
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setCategoryFilter('ALL');
                  setStatusFilter('ALL');
                  onClearRackFilter?.();
                }}
                className="min-h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Filter
              </button>
              <button
                type="button"
                onClick={onOpenAddModal}
                className="min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
              >
                Tambah Barang
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
                  <th className="py-3 pr-3 pl-5">Barang &amp; ISBN</th>
                  <th className="px-3 py-3">Kategori · Rak</th>
                  <th className="px-3 py-3 text-right">Harga</th>
                  <th className="px-3 py-3 text-right">Sistem</th>
                  <th className="px-3 py-3 text-right">Fisik</th>
                  <th className="px-3 py-3 text-right">Selisih</th>
                  <th className="px-3 py-3">Kondisi &amp; Status</th>
                  <th className="py-3 pr-5 pl-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const diff =
                    item.physicalStock !== null ? item.physicalStock - item.systemStock : null;
                  const isLowStock = item.systemStock <= item.minStock;

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="py-3 pr-3 pl-5">
                        <div className="flex items-center gap-3">
                          <BookCoverThumb
                            title={item.title}
                            author={item.author}
                            category={item.category}
                            isbn={item.isbn}
                            size="sm"
                          />
                          <div className="min-w-0 max-w-xs">
                            <div className="truncate font-medium text-slate-900">
                              {item.title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                              <span className="font-mono tabular-nums">{item.isbn}</span>
                              <span aria-hidden="true">·</span>
                              <span className="truncate">{item.author}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-slate-800">{item.rackLocation}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{item.category}</div>
                      </td>

                      <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {formatRupiah(item.price)}
                      </td>

                      <td className="px-3 py-3 text-right font-mono tabular-nums">
                        <span className="font-medium text-slate-900">{item.systemStock}</span>
                        {isLowStock && (
                          <div className="text-[11px] font-sans text-amber-700">
                            Min {item.minStock}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 text-right font-mono tabular-nums text-slate-900">
                        {item.physicalStock !== null ? item.physicalStock : '—'}
                      </td>

                      <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums">
                        {diff === null ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <span
                            className={
                              diff === 0
                                ? 'text-emerald-700'
                                : diff < 0
                                  ? 'text-red-700'
                                  : 'text-amber-700'
                            }
                          >
                            {formatDiscrepancy(diff)}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <StatusIndicator status={item.checkStatus} />
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs">
                          <span className={getConditionTone(item.condition)}>
                            {item.condition}
                          </span>
                          {item.lastCheckedAt && (
                            <>
                              <span className="text-slate-300" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-slate-400">
                                {formatTimeShort(item.lastCheckedAt)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-3 pr-5 pl-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onCheckItem(item)}
                            className="min-h-8 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 whitespace-nowrap"
                          >
                            Periksa
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditItem(item)}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            aria-label={`Ubah ${item.title}`}
                            title="Ubah barang"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteItem(item)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                            aria-label={`Hapus ${item.title}`}
                            title="Hapus barang"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
