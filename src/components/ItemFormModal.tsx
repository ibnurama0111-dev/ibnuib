import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BookCategory, BookItem } from '../types/inventory.ts';

interface ItemFormModalProps {
  open: boolean;
  editingItem: BookItem | null;
  onClose: () => void;
  onSubmit: (payload: {
    isbn: string;
    title: string;
    author: string;
    publisher: string;
    category: BookCategory;
    rackLocation: string;
    price: number;
    systemStock: number;
    minStock: number;
    notes: string;
  }) => Promise<void>;
}

export function ItemFormModal({
  open,
  editingItem,
  onClose,
  onSubmit,
}: ItemFormModalProps) {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [category, setCategory] = useState<BookCategory>(BookCategory.FIKSI);
  const [rackLocation, setRackLocation] = useState('Rak A-01 · Fiksi Nusantara');
  const [price, setPrice] = useState('95000');
  const [systemStock, setSystemStock] = useState('10');
  const [minStock, setMinStock] = useState('5');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editingItem) {
        setIsbn(editingItem.isbn);
        setTitle(editingItem.title);
        setAuthor(editingItem.author);
        setPublisher(editingItem.publisher);
        setCategory(editingItem.category);
        setRackLocation(editingItem.rackLocation);
        setPrice(String(editingItem.price));
        setSystemStock(String(editingItem.systemStock));
        setMinStock(String(editingItem.minStock));
        setNotes(editingItem.notes);
      } else {
        setIsbn('');
        setTitle('');
        setAuthor('');
        setPublisher('');
        setCategory(BookCategory.FIKSI);
        setRackLocation('Rak A-05 · Fiksi Terbaru');
        setPrice('95000');
        setSystemStock('12');
        setMinStock('5');
        setNotes('');
      }
      setError(null);
    }
  }, [open, editingItem]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isbn.trim() || !title.trim() || !rackLocation.trim()) {
      setError('ISBN/SKU, Judul barang, dan Lokasi rak wajib diisi.');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        isbn: isbn.trim(),
        title: title.trim(),
        author: author.trim(),
        publisher: publisher.trim(),
        category,
        rackLocation: rackLocation.trim(),
        price: Number(price) || 0,
        systemStock: Math.max(0, Math.floor(Number(systemStock) || 0)),
        minStock: Math.max(0, Math.floor(Number(minStock) || 0)),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan data barang.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-form-title"
    >
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h2 id="item-form-title" className="font-display text-lg font-semibold text-slate-900">
            {editingItem ? 'Ubah Data Barang' : 'Tambah Barang Baru'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Tutup form"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-isbn" className="block text-xs font-medium text-slate-700">
                ISBN-13 / Kode SKU
              </label>
              <input
                id="item-isbn"
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="9786020332956"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="item-category" className="block text-xs font-medium text-slate-700">
                Kategori Barang
              </label>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BookCategory)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              >
                {Object.values(BookCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="item-title" className="block text-xs font-medium text-slate-700">
              Judul Buku / Nama Barang
            </label>
            <input
              id="item-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Negeri 5 Menara"
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-author" className="block text-xs font-medium text-slate-700">
                Penulis / Merek
              </label>
              <input
                id="item-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Ahmad Fuadi"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="item-publisher" className="block text-xs font-medium text-slate-700">
                Penerbit / Pemasok
              </label>
              <input
                id="item-publisher"
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Gramedia Pustaka Utama"
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="item-rack" className="block text-xs font-medium text-slate-700">
              Lokasi Rak (Gunakan awalan &quot;Rak A&quot;, &quot;Rak B&quot;, dst.)
            </label>
            <input
              id="item-rack"
              type="text"
              value={rackLocation}
              onChange={(e) => setRackLocation(e.target.value)}
              placeholder="Rak A-05 · Fiksi Nusantara"
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="item-price" className="block text-xs font-medium text-slate-700">
                Harga Jual (Rp)
              </label>
              <input
                id="item-price"
                type="number"
                min={0}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="item-stock" className="block text-xs font-medium text-slate-700">
                Stok Sistem
              </label>
              <input
                id="item-stock"
                type="number"
                min={0}
                value={systemStock}
                onChange={(e) => setSystemStock(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="item-min-stock" className="block text-xs font-medium text-slate-700">
                Batas Minimum
              </label>
              <input
                id="item-min-stock"
                type="number"
                min={0}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 focus:border-blue-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="item-notes" className="block text-xs font-medium text-slate-700">
              Catatan Tambahan
            </label>
            <textarea
              id="item-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan rak atau keterangan distributor..."
              className="mt-1.5 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="min-h-10 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-10 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {submitting ? 'Menyimpan...' : editingItem ? 'Simpan Perubahan' : 'Simpan Barang'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
