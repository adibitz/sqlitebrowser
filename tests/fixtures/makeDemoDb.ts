// Port of reference/scripts/make_demo_db.py: the sample database used by the tests (never by the app).
import { rmSync } from 'node:fs'
import { crc32, deflateSync } from 'node:zlib'
import Database from 'better-sqlite3'

/** Small deterministic PRNG (mulberry32) so every run builds the same data. */
function random(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function tinyPng(r: number, g: number, b: number, size = 8): Buffer {
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: size }, () => [r, g, b]).flat()),
  ])
  const raw = Buffer.concat(Array.from({ length: size }, () => row))
  const chunk = (tag: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(tag, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(body) >>> 0)
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr.set([8, 2, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

export const DEMO_COUNTS = { customers: 500, products: 40, orders: 20_000 } as const

/** Writes the demo database (customers, products WITHOUT ROWID, orders, a view, indices, a trigger). */
export function makeDemoDb(path: string, orders: number = DEMO_COUNTS.orders): void {
  rmSync(path, { force: true })
  const rnd = random(42)
  const int = (lo: number, hi: number): number => lo + Math.floor(rnd() * (hi - lo + 1))
  const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)]!
  const pad = (n: number): string => String(n).padStart(2, '0')

  const con = new Database(path)
  con.exec(`
    CREATE TABLE customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE,
        country TEXT DEFAULT 'IN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        meta TEXT
    );
    CREATE TABLE products (
        sku TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        price REAL CHECK(price >= 0),
        stock INTEGER NOT NULL DEFAULT 0,
        image BLOB
    ) WITHOUT ROWID;
    CREATE TABLE orders (
        id INTEGER PRIMARY KEY,
        customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        sku TEXT REFERENCES products(sku),
        quantity INTEGER NOT NULL DEFAULT 1,
        ordered_at TEXT,
        total REAL GENERATED ALWAYS AS (quantity * 1.0) VIRTUAL
    );
    CREATE INDEX idx_orders_customer ON orders(customer_id);
    CREATE INDEX idx_orders_date ON orders(ordered_at DESC);
    CREATE VIEW order_summary AS
        SELECT c.name AS customer, COUNT(o.id) AS orders, SUM(o.quantity) AS items
        FROM customers c LEFT JOIN orders o ON o.customer_id = c.id GROUP BY c.id;
    CREATE TRIGGER trg_stock AFTER INSERT ON orders BEGIN
        UPDATE products SET stock = stock - NEW.quantity WHERE sku = NEW.sku;
    END;
  `)
  const first = [
    'Aarav',
    'Diya',
    'Kabir',
    'Meera',
    'Rohan',
    'Ananya',
    'Vihaan',
    'Isha',
    'Arjun',
    'Sara',
    'Liam',
    'Emma',
  ]
  const last = ['Sharma', 'Patel', 'Iyer', 'Khan', 'Singh', 'Das', 'Smith', 'Garcia', 'Müller', 'Rossi']
  const countries = ['IN', 'US', 'DE', 'IT', 'GB', 'JP', 'BR']
  const colors: [number, number, number][] = [
    [239, 68, 68],
    [59, 130, 246],
    [16, 185, 129],
    [234, 179, 8],
    [168, 85, 247],
  ]

  con.transaction(() => {
    const customer = con.prepare(
      'INSERT INTO customers(name, email, country, created_at, meta) VALUES (?,?,?,?,?)',
    )
    for (let i = 1; i <= DEMO_COUNTS.customers; i++) {
      const meta = i % 7 ? null : `{"vip": true, "tags": ["early", "beta"], "score": ${int(1, 100)}}`
      customer.run(
        `${pick(first)} ${pick(last)}`,
        `user${i}@example.com`,
        pick(countries),
        `2024-${pad(int(1, 12))}-${pad(int(1, 28))}`,
        meta,
      )
    }
    const product = con.prepare('INSERT INTO products VALUES (?,?,?,?,?)')
    for (let i = 1; i <= DEMO_COUNTS.products; i++) {
      product.run(
        `SKU-${String(i).padStart(4, '0')}`,
        `Product ${i}`,
        Math.round((1 + rnd() * 499) * 100) / 100,
        int(4000, 9000),
        i % 3 === 0 ? tinyPng(...colors[i % colors.length]!) : null,
      )
    }
    const order = con.prepare('INSERT INTO orders(customer_id, sku, quantity, ordered_at) VALUES (?,?,?,?)')
    for (let i = 0; i < orders; i++) {
      order.run(
        int(1, DEMO_COUNTS.customers),
        `SKU-${String(int(1, DEMO_COUNTS.products)).padStart(4, '0')}`,
        int(1, 5),
        `2025-${pad(int(1, 12))}-${pad(int(1, 28))}`,
      )
    }
  })()
  con.close()
}
