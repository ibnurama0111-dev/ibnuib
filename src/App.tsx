import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Barcode,
  ClipboardList,
  History,
  Layers,
  Menu,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { CheckItemModal } from './components/CheckItemModal.tsx';
import { ConfirmModal } from './components/ConfirmModal.tsx';
import { HistoryReportView } from './components/HistoryReportView.tsx';
import { InventoryTableView } from './components/InventoryTableView.tsx';
import { ItemFormModal } from './components/ItemFormModal.tsx';
import { QuickCheckView } from './components/QuickCheckView.tsx';
import { RackInspectionView } from './components/RackInspectionView.tsx';
import {
  BookCategory,
  BookItem,
  CheckLog,
  CheckStatus,
  CycleInfo,
  InventoryPayload,
  ItemCondition,
  StaffMember,
} from './types/inventory.ts';

type WorkspaceTab = 'quick-check' | 'inventory' | 'racks' | 'history';

const STAFF_MEMBERS: StaffMember[] = [
  {
    id: 'st-1',
    name: 'Raka Pratama',
    role: 'Kepala Gudang',
    avatarUrl: '/src/assets/images/avatar_bookstore_staff_1795323583982.jpg',
  },
  {
    id: 'st-2',
    name: 'Siti Nurhaliza',
    role: 'Staf Rak & Display',
  },
  {
    id: 'st-3',
    name: 'Dimas Wijaya',
    role: 'Kasir & Retur',
  },
];

const TAB_LABELS: Record<WorkspaceTab, string> = {
  'quick-check': 'Cek Cepat ISBN',
  inventory: 'Daftar Barang',
  racks: 'Pengecekan Rak',
  history: 'Riwayat & Laporan',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('quick-check');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [items, setItems] = useState<BookItem[]>([]);
  const [logs, setLogs] = useState<CheckLog[]>([]);
  const [cycleInfo, setCycleInfo] = useState<CycleInfo>({
    cycleName: 'Stock Opname Bulanan',
    startedAt: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeStaffId, setActiveStaffId] = useState<string>(STAFF_MEMBERS[0].id);
  const [avatarError, setAvatarError] = useState(false);

  const [rackFilterForTable, setRackFilterForTable] = useState('');

  // Modal states
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BookItem | null>(null);
  const [checkingItem, setCheckingItem] = useState<BookItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<BookItem | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [modalActionLoading, setModalActionLoading] = useState(false);

  const activeStaff = useMemo(
    () => STAFF_MEMBERS.find((s) => s.id === activeStaffId) ?? STAFF_MEMBERS[0],
    [activeStaffId],
  );

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/inventory');
      if (!res.ok) {
        throw new Error(`Gagal memuat data inventaris (${res.status}).`);
      }
      const data = (await res.json()) as InventoryPayload;
      setItems(data.items);
      setLogs(data.logs);
      setCycleInfo(data.cycleInfo);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const progressStats = useMemo(() => {
    const total = items.length;
    const checked = items.filter((i) => i.checkStatus !== CheckStatus.BELUM_DICEK).length;
    const issues = items.filter(
      (i) =>
        i.checkStatus === CheckStatus.SELISIH ||
        i.checkStatus === CheckStatus.PERLU_TINDAKAN,
    ).length;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    return { total, checked, issues, pct };
  }, [items]);

  const handleSaveCheck = async (payload: {
    itemId: string;
    physicalStock: number;
    condition: ItemCondition;
    notes: string;
    inspector: string;
    syncSystemStock: boolean;
  }) => {
    const res = await fetch('/api/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan hasil pengecekan.');
    }
    setItems(data.db.items);
    setLogs(data.db.logs);
    setCycleInfo(data.db.cycleInfo);
  };

  const handleCreateOrUpdateItem = async (payload: {
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
  }) => {
    const url = editingItem ? `/api/inventory/${editingItem.id}` : '/api/inventory';
    const method = editingItem ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Gagal menyimpan data barang.');
    }
    setItems(data.db.items);
    setLogs(data.db.logs);
    setCycleInfo(data.db.cycleInfo);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setModalActionLoading(true);
    try {
      const res = await fetch(`/api/inventory/${deletingItem.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus barang.');
      }
      setItems(data.db.items);
      setLogs(data.db.logs);
      setDeletingItem(null);
    } finally {
      setModalActionLoading(false);
    }
  };

  const handleConfirmResetCycle = async () => {
    setModalActionLoading(true);
    try {
      const res = await fetch('/api/cycle/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memulai siklus baru.');
      }
      setItems(data.db.items);
      setLogs(data.db.logs);
      setCycleInfo(data.db.cycleInfo);
      setConfirmResetOpen(false);
    } finally {
      setModalActionLoading(false);
    }
  };

  const navItems: {
    id: WorkspaceTab;
    label: string;
    icon: typeof Barcode;
    count?: number;
  }[] = [
    {
      id: 'quick-check',
      label: 'Cek Cepat',
      icon: Barcode,
      count: items.filter((i) => i.checkStatus === CheckStatus.BELUM_DICEK).length,
    },
    {
      id: 'inventory',
      label: 'Daftar Barang',
      icon: ClipboardList,
      count: items.length,
    },
    {
      id: 'racks',
      label: 'Pengecekan Rak',
      icon: Layers,
    },
    {
      id: 'history',
      label: 'Riwayat & Laporan',
      icon: History,
      count: logs.length,
    },
  ];

  const handleSelectTab = (tab: WorkspaceTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar (256px) */}
      <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white lg:flex">
        <div>
          {/* Brand Zone: Single-element wordmark */}
          <div className="flex h-16 items-center border-b border-slate-200 px-6">
            <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0">
              PustakaLoka
            </span>
          </div>

          {/* Primary Navigation */}
          <nav aria-label="Menu utama" className="space-y-1 p-4">
            {navItems.map((nav) => {
              const Icon = nav.icon;
              const active = activeTab === nav.id;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => handleSelectTab(nav.id)}
                  className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{nav.label}</span>
                  </span>
                  {nav.count !== undefined && (
                    <span className="font-mono text-xs tabular-nums text-slate-500">
                      {nav.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Opname Progress Summary */}
          <div className="mx-4 mt-2 rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-medium text-slate-700">Progres Stock Opname</div>
            <div className="mt-1.5 flex items-baseline justify-between">
              <span className="font-mono text-lg font-semibold tabular-nums text-slate-900">
                {progressStats.checked}/{progressStats.total}
              </span>
              <span className="font-mono text-xs tabular-nums text-slate-500">
                {progressStats.pct}%
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-blue-700 transition-all"
                style={{ width: `${progressStats.pct}%` }}
              />
            </div>
            <div className="mt-2.5 text-xs text-slate-500">
              {progressStats.issues > 0
                ? `${progressStats.issues} item perlu perhatian`
                : 'Semua item terverifikasi baik'}
            </div>
          </div>
        </div>

        {/* Active Inspector Switcher */}
        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3">
            {activeStaff.avatarUrl && !avatarError ? (
              <img
                src={activeStaff.avatarUrl}
                alt={activeStaff.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarError(true)}
                className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-100 font-display text-xs font-semibold text-slate-700">
                {activeStaff.name
                  .split(' ')
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join('')}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <label htmlFor="desktop-staff-select" className="sr-only">
                Pilih Pemeriksa Aktif
              </label>
              <select
                id="desktop-staff-select"
                value={activeStaffId}
                onChange={(e) => setActiveStaffId(e.target.value)}
                className="w-full truncate rounded border border-transparent bg-transparent py-0.5 text-xs font-semibold text-slate-900 hover:border-slate-200 focus:border-blue-600 focus:outline-none"
              >
                {STAFF_MEMBERS.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name}
                  </option>
                ))}
              </select>
              <div className="truncate text-[11px] text-slate-500">{activeStaff.role}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-50 flex w-72 flex-col justify-between bg-white shadow-xl">
            <div>
              <div className="flex h-14 items-center justify-between border-b border-slate-200 px-5">
                <span className="font-display text-base font-bold text-slate-900">
                  PustakaLoka
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                  aria-label="Tutup menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="space-y-1 p-4">
                {navItems.map((nav) => {
                  const Icon = nav.icon;
                  const active = activeTab === nav.id;
                  return (
                    <button
                      key={nav.id}
                      type="button"
                      onClick={() => handleSelectTab(nav.id)}
                      className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium ${
                        active
                          ? 'bg-blue-50 text-blue-800'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>{nav.label}</span>
                      </span>
                      {nav.count !== undefined && (
                        <span className="font-mono text-xs tabular-nums text-slate-500">
                          {nav.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-slate-200 p-4">
              <label htmlFor="mobile-staff-select" className="block text-xs text-slate-500">
                Pemeriksa Aktif
              </label>
              <select
                id="mobile-staff-select"
                value={activeStaffId}
                onChange={(e) => setActiveStaffId(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900"
              >
                {STAFF_MEMBERS.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.name} — {staff.role}
                  </option>
                ))}
              </select>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Single Primary Action on Right */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 lg:h-16 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline whitespace-nowrap">
                Toko Buku PustakaLoka
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-display text-base font-semibold text-slate-900">
                {TAB_LABELS[activeTab]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setItemModalOpen(true);
              }}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Tambah Barang</span>
            </button>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 lg:p-8">
          {loadError ? (
            <div className="rounded-lg border border-red-200 bg-white p-6 text-center">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <button
                type="button"
                onClick={fetchInventory}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Muat Ulang Data</span>
              </button>
            </div>
          ) : loading ? (
            <div className="space-y-6" aria-busy="true" aria-label="Memuat inventaris">
              <div className="h-28 animate-pulse rounded-lg border border-slate-200 bg-white" />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white lg:col-span-5" />
                <div className="h-96 animate-pulse rounded-lg border border-slate-200 bg-white lg:col-span-7" />
              </div>
            </div>
          ) : (
            <>
              {activeTab === 'quick-check' && (
                <QuickCheckView
                  items={items}
                  inspectorName={activeStaff.name}
                  onSaveCheck={handleSaveCheck}
                  onOpenAddModal={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'inventory' && (
                <InventoryTableView
                  key={rackFilterForTable || 'all-racks'}
                  items={items}
                  cycleName={cycleInfo.cycleName}
                  initialRackFilter={rackFilterForTable}
                  onClearRackFilter={() => setRackFilterForTable('')}
                  onCheckItem={(item) => setCheckingItem(item)}
                  onEditItem={(item) => {
                    setEditingItem(item);
                    setItemModalOpen(true);
                  }}
                  onDeleteItem={(item) => setDeletingItem(item)}
                  onOpenAddModal={() => {
                    setEditingItem(null);
                    setItemModalOpen(true);
                  }}
                />
              )}

              {activeTab === 'racks' && (
                <RackInspectionView
                  items={items}
                  onCheckItem={(item) => setCheckingItem(item)}
                  onViewRackInTable={(rackCode) => {
                    setRackFilterForTable(rackCode);
                    setActiveTab('inventory');
                  }}
                />
              )}

              {activeTab === 'history' && (
                <HistoryReportView
                  logs={logs}
                  cycleInfo={cycleInfo}
                  onRequestResetCycle={() => setConfirmResetOpen(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <ItemFormModal
        open={itemModalOpen}
        editingItem={editingItem}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleCreateOrUpdateItem}
      />

      <CheckItemModal
        item={checkingItem}
        inspectorName={activeStaff.name}
        onClose={() => setCheckingItem(null)}
        onSaveCheck={handleSaveCheck}
      />

      <ConfirmModal
        open={Boolean(deletingItem)}
        title="Hapus Barang dari Katalog?"
        description={
          deletingItem
            ? `Barang "${deletingItem.title}" (${deletingItem.isbn}) akan dihapus permanen dari daftar inventaris toko buku.`
            : ''
        }
        confirmLabel="Hapus Barang"
        destructive
        isLoading={modalActionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingItem(null)}
      />

      <ConfirmModal
        open={confirmResetOpen}
        title="Mulai Siklus Stock Opname Baru?"
        description="Status pengecekan seluruh barang akan diatur ulang menjadi 'Belum Dicek' dan hitungan fisik dikosongkan. Riwayat pemeriksaan sebelumnya tetap tersimpan."
        confirmLabel="Mulai Siklus Baru"
        isLoading={modalActionLoading}
        onConfirm={handleConfirmResetCycle}
        onCancel={() => setConfirmResetOpen(false)}
      />
    </div>
  );
}
