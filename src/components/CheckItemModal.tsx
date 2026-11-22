import { useEffect, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { BookItem, ItemCondition } from '../types/inventory.ts';
import { formatDiscrepancy, formatRupiah } from '../utils/formatters.ts';
import { BookCoverThumb } from './BookCoverThumb.tsx';

interface CheckItemModalProps {
  item: BookItem | null;
  inspectorName: string;
  onClose: () => void;
  onSaveCheck: (payload: {
    itemId: string;
    physicalStock: number;
    condition: ItemCondition;
    notes: string;
    inspector: string;
    syncSystemStock: boolean;
  }) => Promise<void>;
}

export function CheckItemModal({
  item,
  inspectorName,
  onClose,
  onSaveCheck,
}: CheckItemModalProps) {
  const [physicalStock, setPhysicalStock] = useState<number>(0);
  const [condition, setCondition] = useState<ItemCondition>(ItemCondition.BAIK);
  const [notes, setNotes] = useState('');
  const [syncSystemStock, setSyncSystemStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setPhysicalStock(item.physicalStock ?? item.systemStock);
      setCondition(item.condition);
      setNotes(item.notes || '');
      setSyncSystemStock(false);
      setError(null);
    }
  }, [item]);

  if (!item) return null;

  const discrepancy = physicalStock - item.systemStock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSaveCheck({
        itemId: item.id,
        physicalStock,
        condition,
        notes,
        inspector: inspectorName,
        syncSystemStock,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan hasil pengecekan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="check-modal-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-start gap-3.5">
            <BookCoverThumb
              title={item.title}
              author={item.author}
              category={item.category}
              isbn={item.isbn}
              size="sm"
            />
            <div>
              <h2 id="check-modal-title" className="font-display text-base font-semibold text-slate-900">
                {item.title}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span className="font-mono tabular-nums">{item.isbn}</span>
                <span aria-hidden="true">·</span>
                <span>{item.rackLocation}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">{formatRupiah(item.price)}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup pemeriksaan"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 rounded-md border border-slate-200 bg-slate-50 p-3.5">
            <div>
              <div className="text-xs text-slate-500">Stok Sistem</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-900">
                {item.systemStock}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Hitungan Fisik</div>
              <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-blue-700">
                {physicalStock}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Selisih</div>
              <div
                className={`mt-1 font-mono text-lg font-semibold tabular-nums ${
                  discrepancy === 0
                    ? 'text-emerald-700'
                    : discrepancy < 0
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}
              >
                {formatDiscrepancy(discrepancy)}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="modal-physical-stock" className="block text-xs font-medium text-slate-700">
              Jumlah Stok Fisik di Rak &amp; Gudang
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPhysicalStock((v) => Math.max(0, v - 1))}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Kurangi 1"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                id="modal-physical-stock"
                type="number"
                min={0}
                value={physicalStock}
                onChange={(e) => setPhysicalStock(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                className="h-10 w-28 rounded-md border border-slate-300 bg-white px-3 text-center font-mono text-base font-semibold tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setPhysicalStock((v) => v + 1)}
                className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                aria-label="Tambah 1"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPhysicalStock(item.systemStock)}
                className="ml-auto min-h-10 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap"
              >
                Samakan ({item.systemStock})
              </button>
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">
              Kondisi Fisik Barang
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {Object.values(ItemCondition).map((cond) => {
                const active = condition === cond;
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => setCondition(cond)}
                    className={`min-h-10 rounded-md border px-3 py-2 text-left text-xs font-medium transition-colors ${
                      active
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          {discrepancy !== 0 && (
            <label className="flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={syncSystemStock}
                onChange={(e) => setSyncSystemStock(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
              />
              <span>
                Perbarui stok sistem menjadi <strong className="font-mono">{physicalStock}</strong> setelah disimpan (penyesuaian opname disetujui).
              </span>
            </label>
          )}

          <div>
            <label htmlFor="modal-check-notes" className="block text-xs font-medium text-slate-700">
              Catatan Pemeriksa
            </label>
            <textarea
              id="modal-check-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: 1 eksemplar berada di meja kasir / segel sobek..."
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 pt-4">
            <span className="text-xs text-slate-500">Pemeriksa: {inspectorName}</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Hasil Cek'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
