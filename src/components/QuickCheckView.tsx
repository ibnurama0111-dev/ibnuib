import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Barcode,
  Check,
  CheckCircle2,
  Minus,
  Plus,
  Search,
  Sparkles,
} from 'lucide-react';
import { BookItem, CheckStatus, ItemCondition } from '../types/inventory.ts';
import { formatDiscrepancy, formatRupiah, formatTimeShort } from '../utils/formatters.ts';
import { BookCoverThumb } from './BookCoverThumb.tsx';
import { StatusIndicator } from './StatusIndicator.tsx';

interface QuickCheckViewProps {
  items: BookItem[];
  inspectorName: string;
  onSaveCheck: (payload: {
    itemId: string;
    physicalStock: number;
    condition: ItemCondition;
    notes: string;
    inspector: string;
    syncSystemStock: boolean;
  }) => Promise<void>;
  onOpenAddModal: () => void;
}

export function QuickCheckView({
  items,
  inspectorName,
  onSaveCheck,
  onOpenAddModal,
}: QuickCheckViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>(() => {
    const firstUnchecked = items.find((i) => i.checkStatus === CheckStatus.BELUM_DICEK);
    return firstUnchecked?.id ?? items[0]?.id ?? '';
  });

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );

  const [physicalStock, setPhysicalStock] = useState<number>(0);
  const [condition, setCondition] = useState<ItemCondition>(ItemCondition.BAIK);
  const [notes, setNotes] = useState('');
  const [syncSystemStock, setSyncSystemStock] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (selectedItem) {
      setPhysicalStock(selectedItem.physicalStock ?? selectedItem.systemStock);
      setCondition(selectedItem.condition);
      setNotes(selectedItem.notes || '');
      setSyncSystemStock(false);
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem && items.length > 0) {
      const next = items.find((i) => i.checkStatus === CheckStatus.BELUM_DICEK) ?? items[0];
      setSelectedId(next.id);
    }
  }, [items, selectedItem]);

  const matchingSuggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (item) =>
          item.isbn.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.author.toLowerCase().includes(q) ||
          item.rackLocation.toLowerCase().includes(q),
      )
      .slice(0, 6);
  }, [items, query]);

  const uncheckedQueue = useMemo(
    () => items.filter((item) => item.checkStatus === CheckStatus.BELUM_DICEK),
    [items],
  );

  const sampleItems = useMemo(() => {
    const priority = items.filter((i) => i.checkStatus === CheckStatus.BELUM_DICEK).slice(0, 3);
    return priority.length >= 2 ? priority : items.slice(0, 3);
  }, [items]);

  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;

    const exact = items.find((item) => item.isbn.toLowerCase() === q);
    if (exact) {
      setSelectedId(exact.id);
      setQuery('');
      setFeedback(null);
      return;
    }

    if (matchingSuggestions.length > 0) {
      setSelectedId(matchingSuggestions[0].id);
      setQuery('');
      setFeedback(null);
      return;
    }

    setFeedback({
      type: 'error',
      text: `Tidak ditemukan barang dengan ISBN atau kata kunci "${query.trim()}".`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      await onSaveCheck({
        itemId: selectedItem.id,
        physicalStock,
        condition,
        notes,
        inspector: inspectorName,
        syncSystemStock,
      });

      const nextUnchecked = items.find(
        (i) => i.id !== selectedItem.id && i.checkStatus === CheckStatus.BELUM_DICEK,
      );
      setFeedback({
        type: 'success',
        text: `Hasil pengecekan "${selectedItem.title}" berhasil disimpan.`,
      });
      if (nextUnchecked) {
        setSelectedId(nextUnchecked.id);
      }
      inputRef.current?.focus();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan pengecekan.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const discrepancy = selectedItem ? physicalStock - selectedItem.systemStock : 0;

  return (
    <div className="space-y-6">
      {/* Scanner / Search Bar */}
      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <label
              htmlFor="isbn-scanner-input"
              className="block font-display text-sm font-semibold text-slate-900"
            >
              Pindai Barcode ISBN / Cari Barang
            </label>
            <p className="mt-0.5 text-xs text-slate-500">
              Arahkan pemindai barcode USB atau ketik 13 digit ISBN, judul buku, atau kode rak lalu tekan Enter.
            </p>
            <form onSubmit={handleScanSubmit} className="relative mt-3 flex gap-2">
              <div className="relative flex-1">
                <Barcode
                  className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  ref={inputRef}
                  id="isbn-scanner-input"
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    if (feedback) setFeedback(null);
                  }}
                  placeholder="Scan atau ketik ISBN (mis. 9786024246945) atau judul buku..."
                  className="h-11 w-full rounded-md border border-slate-300 bg-white pr-4 pl-10 font-mono text-sm text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                />

                {matchingSuggestions.length > 0 && (
                  <div className="absolute right-0 left-0 z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                    {matchingSuggestions.map((match) => (
                      <button
                        key={match.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(match.id);
                          setQuery('');
                          setFeedback(null);
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {match.title}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono tabular-nums">{match.isbn}</span>
                            <span aria-hidden="true">·</span>
                            <span className="truncate">{match.rackLocation}</span>
                          </div>
                        </div>
                        <StatusIndicator status={match.checkStatus} />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="inline-flex h-11 items-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span>Cari</span>
              </button>
            </form>
          </div>

          {sampleItems.length > 0 && (
            <div className="lg:max-w-sm">
              <div className="text-xs font-medium text-slate-500">Uji Pindai Cepat:</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {sampleItems.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(sample.id);
                      setQuery('');
                      setFeedback(null);
                    }}
                    className={`rounded-md border px-2.5 py-1.5 font-mono text-xs tabular-nums transition-colors ${
                      selectedId === sample.id
                        ? 'border-blue-700 bg-blue-50 text-blue-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={sample.title}
                  >
                    {sample.isbn}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {feedback && (
          <div
            role="status"
            className={`mt-4 flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-sm ${
              feedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' && (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>{feedback.text}</span>
            </div>
            {feedback.type === 'error' && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="text-xs font-semibold underline hover:no-underline whitespace-nowrap shrink-0"
              >
                Daftarkan Barang Baru
              </button>
            )}
          </div>
        )}
      </section>

      {/* Main Inspection Bench */}
      {selectedItem ? (
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: System Record & Identity */}
          <div className="rounded-lg border border-slate-200 bg-white p-6 lg:col-span-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h2 className="font-display text-sm font-semibold text-slate-900">
                Data Katalog &amp; Sistem
              </h2>
              <StatusIndicator status={selectedItem.checkStatus} />
            </div>

            <div className="mt-5 flex items-start gap-5">
              <BookCoverThumb
                title={selectedItem.title}
                author={selectedItem.author}
                category={selectedItem.category}
                isbn={selectedItem.isbn}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-500">
                  {selectedItem.category}
                </div>
                <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-slate-900">
                  {selectedItem.title}
                </h3>
                <div className="mt-1 text-sm text-slate-600">{selectedItem.author}</div>
                <div className="mt-3 font-mono text-sm font-medium tabular-nums text-slate-900">
                  {formatRupiah(selectedItem.price)}
                </div>
              </div>
            </div>

            <dl className="mt-6 divide-y divide-slate-100 border-t border-slate-200 text-sm">
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">ISBN / SKU</dt>
                <dd className="font-mono font-medium tabular-nums text-slate-900">
                  {selectedItem.isbn}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Penerbit / Pemasok</dt>
                <dd className="text-right font-medium text-slate-900">
                  {selectedItem.publisher}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Lokasi Rak</dt>
                <dd className="text-right font-medium text-slate-900">
                  {selectedItem.rackLocation}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Stok Tercatat di Sistem</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900">
                  {selectedItem.systemStock} unit
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Batas Minimum Rak</dt>
                <dd className="font-mono tabular-nums text-slate-700">
                  {selectedItem.minStock} unit
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500">Pemeriksaan Terakhir</dt>
                <dd className="text-right text-xs text-slate-600">
                  {selectedItem.lastCheckedAt
                    ? `${formatTimeShort(selectedItem.lastCheckedAt)} · ${selectedItem.lastCheckedBy}`
                    : 'Belum diperiksa pada siklus ini'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Right: Physical Count & Condition Form */}
          <form
            onSubmit={handleSave}
            className="flex flex-col justify-between rounded-lg border border-slate-200 bg-white p-6 lg:col-span-7"
          >
            <div>
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  Formulir Pemeriksaan Fisik
                </h2>
                <span className="text-xs text-slate-500">
                  Pemeriksa: <strong className="font-medium text-slate-800">{inspectorName}</strong>
                </span>
              </div>

              {/* Comparison Strip */}
              <div className="mt-5 grid grid-cols-3 gap-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div>
                  <div className="text-xs text-slate-500">Stok Sistem</div>
                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900">
                    {selectedItem.systemStock}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Hitungan Fisik</div>
                  <div className="mt-1 font-mono text-2xl font-semibold tabular-nums text-blue-700">
                    {physicalStock}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Selisih</div>
                  <div
                    className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${
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

              {/* Physical Count Input */}
              <div className="mt-5">
                <label
                  htmlFor="quick-physical-stock"
                  className="block text-xs font-medium text-slate-700"
                >
                  Masukkan Jumlah Fisik Terhitung
                </label>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhysicalStock((v) => Math.max(0, v - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Kurangi 1"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    id="quick-physical-stock"
                    type="number"
                    min={0}
                    value={physicalStock}
                    onChange={(e) =>
                      setPhysicalStock(Math.max(0, Math.floor(Number(e.target.value) || 0)))
                    }
                    className="h-11 w-28 rounded-md border border-slate-300 bg-white px-3 text-center font-mono text-lg font-semibold tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPhysicalStock((v) => v + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    aria-label="Tambah 1"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhysicalStock((v) => v + 5)}
                    className="h-11 rounded-md border border-slate-200 bg-slate-50 px-3 font-mono text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    +5
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhysicalStock(selectedItem.systemStock)}
                    className="ml-auto h-11 rounded-md border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                  >
                    Sesuai Sistem ({selectedItem.systemStock})
                  </button>
                </div>
              </div>

              {/* Condition Selector */}
              <div className="mt-5">
                <span className="block text-xs font-medium text-slate-700">
                  Pemeriksaan Kondisi Barang
                </span>
                <div className="mt-2 grid grid-cols-2 gap-2.5">
                  {Object.values(ItemCondition).map((cond) => {
                    const active = condition === cond;
                    return (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => setCondition(cond)}
                        className={`flex min-h-11 items-center justify-between rounded-md border px-3.5 py-2 text-left text-xs font-medium transition-colors ${
                          active
                            ? 'border-blue-700 bg-blue-50 text-blue-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{cond}</span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {discrepancy !== 0 && (
                <label className="mt-4 flex items-start gap-2.5 rounded-md border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncSystemStock}
                    onChange={(e) => setSyncSystemStock(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                  />
                  <span>
                    Setujui penyesuaian stok: ubah stok sistem dari{' '}
                    <strong className="font-mono">{selectedItem.systemStock}</strong> menjadi{' '}
                    <strong className="font-mono">{physicalStock}</strong> setelah disimpan.
                  </span>
                </label>
              )}

              <div className="mt-5">
                <label htmlFor="quick-notes" className="block text-xs font-medium text-slate-700">
                  Catatan Kondisi / Lokasi Tambahan
                </label>
                <textarea
                  id="quick-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: 2 eks berada di meja display kasir, sisanya di rak utama."
                  className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
              <div className="text-xs text-slate-500">
                {physicalStock <= selectedItem.minStock
                  ? `Stok berada di bawah/sama batas minimum (${selectedItem.minStock} unit).`
                  : 'Stok mencukupi di atas batas minimum.'}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="min-h-11 rounded-md bg-blue-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {submitting ? 'Menyimpan...' : 'Simpan Hasil Cek'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-600">Belum ada barang terdaftar di inventaris.</p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-4 min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800"
          >
            Tambah Barang Pertama
          </button>
        </section>
      )}

      {/* Unchecked Queue */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-900">
              Antrean Barang Belum Dicek
            </h2>
            <p className="text-xs text-slate-500">
              Klik salah satu barang untuk langsung membuka formulir pengecekan fisik.
            </p>
          </div>
          <span className="font-mono text-xs font-medium tabular-nums text-slate-600">
            {uncheckedQueue.length} item tersisa
          </span>
        </div>

        {uncheckedQueue.length === 0 ? (
          <div className="flex items-center justify-between px-5 py-6 text-sm text-emerald-700">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Seluruh barang pada siklus stock opname ini sudah diperiksa.</span>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {uncheckedQueue.map((item) => {
              const isSelected = item.id === selectedId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setFeedback(null);
                  }}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-3 text-left transition-colors ${
                    isSelected ? 'bg-blue-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <BookCoverThumb
                      title={item.title}
                      author={item.author}
                      category={item.category}
                      isbn={item.isbn}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">
                        {item.title}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
                        <span className="font-mono tabular-nums">{item.isbn}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.rackLocation}</span>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-slate-500">Stok Sistem</div>
                      <div className="font-mono text-sm font-semibold tabular-nums text-slate-900">
                        {item.systemStock}
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isSelected ? 'text-blue-700' : 'text-slate-600'
                      }`}
                    >
                      {isSelected ? 'Sedang Diperiksa' : 'Periksa'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
