import { BookItem, CheckLog, CheckStatus, ItemCondition } from '../types/inventory.ts';

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeShort(isoString: string | null): string {
  if (!isoString) return 'Belum dicek';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDiscrepancy(diff: number): string {
  if (diff > 0) return `+${diff}`;
  return String(diff);
}

export function exportInventoryToCsv(items: BookItem[], cycleName: string): void {
  const headers = [
    'ISBN / SKU',
    'Judul Barang',
    'Penulis / Merek',
    'Penerbit / Pemasok',
    'Kategori',
    'Lokasi Rak',
    'Harga (IDR)',
    'Stok Sistem',
    'Stok Fisik',
    'Selisih',
    'Batas Min',
    'Kondisi',
    'Status Cek',
    'Pemeriksa Terakhir',
    'Waktu Cek',
    'Catatan',
  ];

  const rows = items.map((item) => {
    const diff =
      item.physicalStock !== null ? item.physicalStock - item.systemStock : '';
    return [
      item.isbn,
      item.title,
      item.author,
      item.publisher,
      item.category,
      item.rackLocation,
      String(item.price),
      String(item.systemStock),
      item.physicalStock !== null ? String(item.physicalStock) : '',
      String(diff),
      String(item.minStock),
      item.condition,
      item.checkStatus,
      item.lastCheckedBy ?? '',
      item.lastCheckedAt ? formatTimeShort(item.lastCheckedAt) : '',
      item.notes,
    ];
  });

  const escapeCell = (val: string) => {
    const clean = val.replace(/"/g, '""');
    return `"${clean}"`;
  };

  const csvContent =
    '\uFEFF' +
    [
      `"Laporan Pengecekan Barang — ${cycleName.replace(/"/g, '""')}"`,
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSlug = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `laporan-stok-pustakaloka-${dateSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportLogsToCsv(logs: CheckLog[]): void {
  const headers = [
    'Waktu Cek',
    'Pemeriksa',
    'ISBN / SKU',
    'Judul Barang',
    'Lokasi Rak',
    'Stok Sistem Sebelumnya',
    'Stok Fisik',
    'Selisih',
    'Kondisi Barang',
    'Sinkron Stok Sistem',
    'Catatan',
  ];

  const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;

  const rows = logs.map((log) => [
    formatTimeShort(log.checkedAt),
    log.inspector,
    log.isbn,
    log.title,
    log.rackLocation,
    String(log.systemStockBefore),
    String(log.physicalStock),
    formatDiscrepancy(log.discrepancy),
    log.condition,
    log.syncedSystemStock ? 'Ya' : 'Tidak',
    log.notes,
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join(
      '\r\n',
    );

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateSlug = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `riwayat-pengecekan-pustakaloka-${dateSlug}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getCheckStatusTone(status: CheckStatus): {
  textClass: string;
  label: string;
} {
  switch (status) {
    case CheckStatus.SESUAI:
      return { textClass: 'text-emerald-700', label: 'Sesuai' };
    case CheckStatus.SELISIH:
      return { textClass: 'text-red-700', label: 'Selisih Stok' };
    case CheckStatus.PERLU_TINDAKAN:
      return { textClass: 'text-amber-700', label: 'Perlu Tindakan' };
    case CheckStatus.BELUM_DICEK:
    default:
      return { textClass: 'text-slate-500', label: 'Belum Dicek' };
  }
}

export function getConditionTone(condition: ItemCondition): string {
  switch (condition) {
    case ItemCondition.BAIK:
      return 'text-slate-700';
    case ItemCondition.SEGEL_TERBUKA:
      return 'text-amber-700';
    case ItemCondition.RUSAK_RINGAN:
      return 'text-amber-700';
    case ItemCondition.CACAT_RETUR:
      return 'text-red-700';
    default:
      return 'text-slate-700';
  }
}
