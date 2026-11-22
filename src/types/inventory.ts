export enum BookCategory {
  FIKSI = 'Fiksi & Sastra',
  NON_FIKSI = 'Non-Fiksi & Bisnis',
  PENDIDIKAN = 'Pendidikan & Referensi',
  KOMIK = 'Komik & Manga',
  ANAK = 'Buku Anak',
  ALAT_TULIS = 'Alat Tulis & ATK',
}

export enum ItemCondition {
  BAIK = 'Baik & Tersegel',
  SEGEL_TERBUKA = 'Segel Terbuka',
  RUSAK_RINGAN = 'Rusak Ringan',
  CACAT_RETUR = 'Cacat / Perlu Retur',
}

export enum CheckStatus {
  BELUM_DICEK = 'Belum Dicek',
  SESUAI = 'Sesuai',
  SELISIH = 'Selisih Stok',
  PERLU_TINDAKAN = 'Perlu Tindakan',
}

export interface BookItem {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  category: BookCategory;
  rackLocation: string;
  rackCode: string;
  price: number;
  systemStock: number;
  physicalStock: number | null;
  minStock: number;
  condition: ItemCondition;
  checkStatus: CheckStatus;
  lastCheckedAt: string | null;
  lastCheckedBy: string | null;
  notes: string;
}

export interface CheckLog {
  id: string;
  itemId: string;
  isbn: string;
  title: string;
  rackLocation: string;
  inspector: string;
  checkedAt: string;
  systemStockBefore: number;
  physicalStock: number;
  discrepancy: number;
  condition: ItemCondition;
  notes: string;
  syncedSystemStock: boolean;
}

export interface CycleInfo {
  cycleName: string;
  startedAt: string;
}

export interface InventoryPayload {
  items: BookItem[];
  logs: CheckLog[];
  cycleInfo: CycleInfo;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
}
