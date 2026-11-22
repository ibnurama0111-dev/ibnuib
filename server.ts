import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { SEED_CYCLE_INFO, SEED_ITEMS, SEED_LOGS } from './src/data/seedInventory.ts';
import {
  BookCategory,
  BookItem,
  CheckLog,
  CheckStatus,
  InventoryPayload,
  ItemCondition,
} from './src/types/inventory.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'bookstore-db.json');
const PORT = Number(process.env.PORT) || 3000;

function ensureDb(): InventoryPayload {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_PATH)) {
    const initial: InventoryPayload = {
      items: SEED_ITEMS,
      logs: SEED_LOGS,
      cycleInfo: SEED_CYCLE_INFO,
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as InventoryPayload;
    if (!Array.isArray(parsed.items) || !Array.isArray(parsed.logs)) {
      throw new Error('Invalid DB structure');
    }
    return parsed;
  } catch {
    const fallback: InventoryPayload = {
      items: SEED_ITEMS,
      logs: SEED_LOGS,
      cycleInfo: SEED_CYCLE_INFO,
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function writeDb(data: InventoryPayload): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function computeCheckStatus(
  systemStock: number,
  physicalStock: number | null,
  minStock: number,
  condition: ItemCondition,
): CheckStatus {
  if (physicalStock === null) {
    return CheckStatus.BELUM_DICEK;
  }
  if (physicalStock !== systemStock) {
    return CheckStatus.SELISIH;
  }
  if (condition !== ItemCondition.BAIK || physicalStock <= minStock) {
    return CheckStatus.PERLU_TINDAKAN;
  }
  return CheckStatus.SESUAI;
}

function extractRackCode(rackLocation: string): string {
  const match = rackLocation.match(/Rak\s+[A-Z0-9]+/i);
  if (match) {
    return match[0].replace(/\s+/g, ' ');
  }
  return 'Rak Umum';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/inventory', (_req, res) => {
    const db = ensureDb();
    res.json(db);
  });

  app.post('/api/inventory', (req, res) => {
    const body = req.body as Partial<BookItem>;
    const isbn = String(body.isbn || '').trim();
    const title = String(body.title || '').trim();
    const author = String(body.author || '').trim();
    const publisher = String(body.publisher || '').trim();
    const rackLocation = String(body.rackLocation || '').trim();
    const category = body.category as BookCategory;
    const price = Number(body.price ?? 0);
    const systemStock = Number(body.systemStock ?? 0);
    const minStock = Number(body.minStock ?? 5);

    if (!isbn || !title || !rackLocation) {
      res.status(400).json({ error: 'ISBN/SKU, Judul barang, dan Lokasi rak wajib diisi.' });
      return;
    }
    if (!Object.values(BookCategory).includes(category)) {
      res.status(400).json({ error: 'Kategori barang tidak valid.' });
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(systemStock) || systemStock < 0) {
      res.status(400).json({ error: 'Harga dan jumlah stok harus berupa angka valid >= 0.' });
      return;
    }

    const db = ensureDb();
    const duplicate = db.items.find(
      (item) => item.isbn.toLowerCase() === isbn.toLowerCase(),
    );
    if (duplicate) {
      res.status(409).json({
        error: `ISBN/SKU "${isbn}" sudah terdaftar untuk "${duplicate.title}".`,
      });
      return;
    }

    const newItem: BookItem = {
      id: `bk-${Date.now().toString(36)}`,
      isbn,
      title,
      author: author || '-',
      publisher: publisher || '-',
      category,
      rackLocation,
      rackCode: extractRackCode(rackLocation),
      price: Math.round(price),
      systemStock: Math.floor(systemStock),
      physicalStock: null,
      minStock: Math.max(0, Math.floor(minStock)),
      condition: ItemCondition.BAIK,
      checkStatus: CheckStatus.BELUM_DICEK,
      lastCheckedAt: null,
      lastCheckedBy: null,
      notes: String(body.notes || '').trim(),
    };

    db.items.unshift(newItem);
    writeDb(db);
    res.status(201).json({ item: newItem, db });
  });

  app.put('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const body = req.body as Partial<BookItem>;
    const db = ensureDb();
    const idx = db.items.findIndex((item) => item.id === id);

    if (idx === -1) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }

    const current = db.items[idx];
    const nextIsbn = String(body.isbn ?? current.isbn).trim();
    const nextTitle = String(body.title ?? current.title).trim();
    const nextRack = String(body.rackLocation ?? current.rackLocation).trim();

    if (!nextIsbn || !nextTitle || !nextRack) {
      res.status(400).json({ error: 'ISBN/SKU, Judul barang, dan Lokasi rak wajib diisi.' });
      return;
    }

    const duplicate = db.items.find(
      (item) => item.id !== id && item.isbn.toLowerCase() === nextIsbn.toLowerCase(),
    );
    if (duplicate) {
      res.status(409).json({
        error: `ISBN/SKU "${nextIsbn}" sudah digunakan oleh "${duplicate.title}".`,
      });
      return;
    }

    const nextSystemStock =
      body.systemStock !== undefined ? Math.max(0, Math.floor(Number(body.systemStock))) : current.systemStock;
    const nextMinStock =
      body.minStock !== undefined ? Math.max(0, Math.floor(Number(body.minStock))) : current.minStock;
    const nextPrice =
      body.price !== undefined ? Math.max(0, Math.round(Number(body.price))) : current.price;
    const nextCategory =
      body.category && Object.values(BookCategory).includes(body.category)
        ? body.category
        : current.category;

    const updated: BookItem = {
      ...current,
      isbn: nextIsbn,
      title: nextTitle,
      author: String(body.author ?? current.author).trim() || '-',
      publisher: String(body.publisher ?? current.publisher).trim() || '-',
      category: nextCategory,
      rackLocation: nextRack,
      rackCode: extractRackCode(nextRack),
      price: nextPrice,
      systemStock: nextSystemStock,
      minStock: nextMinStock,
      notes: body.notes !== undefined ? String(body.notes).trim() : current.notes,
      checkStatus: computeCheckStatus(
        nextSystemStock,
        current.physicalStock,
        nextMinStock,
        current.condition,
      ),
    };

    db.items[idx] = updated;
    writeDb(db);
    res.json({ item: updated, db });
  });

  app.delete('/api/inventory/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDb();
    const exists = db.items.some((item) => item.id === id);
    if (!exists) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }
    db.items = db.items.filter((item) => item.id !== id);
    writeDb(db);
    res.json({ ok: true, db });
  });

  app.post('/api/checks', (req, res) => {
    const { itemId, physicalStock, condition, notes, inspector, syncSystemStock } = req.body as {
      itemId?: string;
      physicalStock?: number;
      condition?: ItemCondition;
      notes?: string;
      inspector?: string;
      syncSystemStock?: boolean;
    };

    if (!itemId) {
      res.status(400).json({ error: 'ID barang wajib disertakan.' });
      return;
    }

    const parsedPhysical = Number(physicalStock);
    if (!Number.isFinite(parsedPhysical) || parsedPhysical < 0) {
      res.status(400).json({ error: 'Jumlah stok fisik harus berupa angka valid >= 0.' });
      return;
    }

    const nextCondition = condition && Object.values(ItemCondition).includes(condition)
      ? condition
      : ItemCondition.BAIK;

    const db = ensureDb();
    const idx = db.items.findIndex((item) => item.id === itemId);
    if (idx === -1) {
      res.status(404).json({ error: 'Barang tidak ditemukan.' });
      return;
    }

    const item = db.items[idx];
    const cleanPhysical = Math.floor(parsedPhysical);
    const systemBefore = item.systemStock;
    const discrepancy = cleanPhysical - systemBefore;
    const nextSystemStock = syncSystemStock ? cleanPhysical : systemBefore;
    const checkedAt = new Date().toISOString();
    const cleanInspector = String(inspector || 'Raka Pratama').trim() || 'Raka Pratama';
    const cleanNotes = String(notes || '').trim();

    const updatedItem: BookItem = {
      ...item,
      systemStock: nextSystemStock,
      physicalStock: cleanPhysical,
      condition: nextCondition,
      lastCheckedAt: checkedAt,
      lastCheckedBy: cleanInspector,
      notes: cleanNotes,
      checkStatus: computeCheckStatus(nextSystemStock, cleanPhysical, item.minStock, nextCondition),
    };

    const newLog: CheckLog = {
      id: `log-${Date.now().toString(36)}`,
      itemId: item.id,
      isbn: item.isbn,
      title: item.title,
      rackLocation: item.rackLocation,
      inspector: cleanInspector,
      checkedAt,
      systemStockBefore: systemBefore,
      physicalStock: cleanPhysical,
      discrepancy,
      condition: nextCondition,
      notes: cleanNotes,
      syncedSystemStock: Boolean(syncSystemStock && discrepancy !== 0),
    };

    db.items[idx] = updatedItem;
    db.logs.unshift(newLog);
    writeDb(db);
    res.json({ item: updatedItem, log: newLog, db });
  });

  app.post('/api/cycle/reset', (req, res) => {
    const cycleName = String(req.body?.cycleName || '').trim();
    const db = ensureDb();
    const now = new Date().toISOString();

    db.items = db.items.map((item) => ({
      ...item,
      physicalStock: null,
      checkStatus: CheckStatus.BELUM_DICEK,
      lastCheckedAt: null,
      lastCheckedBy: null,
    }));

    db.cycleInfo = {
      cycleName:
        cycleName ||
        `Stock Opname — ${new Intl.DateTimeFormat('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }).format(new Date())}`,
      startedAt: now,
    };

    writeDb(db);
    res.json({ ok: true, db });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PustakaLoka server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
