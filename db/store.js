// طبقة الوصول للبيانات.
// - مع DATABASE_URL: يستخدم PostgreSQL (ينشئ الجداول ويعبّيها أول مرة).
// - بدون DATABASE_URL: يرجع لبيانات الذاكرة (seed) حتى يعمل التطبيق فوراً محلياً.

const fs = require('fs');
const path = require('path');
const seed = require('./seedData');

const HAS_DB = !!process.env.DATABASE_URL;
let pool = null;

if (HAS_DB) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Render يتطلب SSL للاتصال الخارجي
    ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
  });
}

async function init() {
  if (!HAS_DB) {
    console.log('[store] DATABASE_URL غير موجود — يعمل التطبيق على بيانات الذاكرة (وضع تجريبي).');
    return;
  }
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM products');
  if (rows[0].n === 0) {
    console.log('[store] قاعدة البيانات فارغة — جارٍ تعبئتها بالبيانات الأولية...');
    await seedDatabase();
    console.log('[store] تمت التعبئة.');
  } else {
    console.log(`[store] قاعدة البيانات جاهزة (${rows[0].n} منتجات).`);
  }
}

async function seedDatabase() {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    for (const s of seed.suppliers)
      await c.query('INSERT INTO suppliers(id,name,rating) VALUES($1,$2,$3) ON CONFLICT (id) DO NOTHING', [s.id, s.name, s.rating]);
    for (const i of seed.ingredients)
      await c.query('INSERT INTO ingredients(id,name,unit,supplier_id,cost,waste_pct,alts) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        [i.id, i.name, i.unit, i.supplierId, i.cost, i.wastePct, JSON.stringify(i.alts || [])]);
    for (const r of seed.subRecipes)
      await c.query('INSERT INTO sub_recipes(id,name,yield_qty,yield_unit,lines) VALUES($1,$2,$3,$4,$5) ON CONFLICT (id) DO NOTHING',
        [r.id, r.name, r.yieldQty, r.yieldUnit, JSON.stringify(r.lines)]);
    for (const p of seed.packaging)
      await c.query('INSERT INTO packaging(id,name,cost) VALUES($1,$2,$3) ON CONFLICT (id) DO NOTHING', [p.id, p.name, p.cost]);
    for (const p of seed.products)
      await c.query('INSERT INTO products(id,name,cat,price,freshness,recipe,pack) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING',
        [p.id, p.name, p.cat, p.price, p.freshness, JSON.stringify(p.recipe), JSON.stringify(p.pack)]);
    for (const b of seed.branches)
      await c.query('INSERT INTO branches(id,name) VALUES($1,$2) ON CONFLICT (id) DO NOTHING', [b.id, b.name]);
    for (const s of seed.sales)
      await c.query('INSERT INTO sales(product_id,branch_id,monthly,by_hour,waste_pct) VALUES($1,$2,$3,$4,$5)',
        [s.productId, s.branchId, s.monthly, JSON.stringify(s.byHour), s.wastePct]);
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

// يُرجع كائن البيانات بنفس بنية النموذج (camelCase) ليستهلكه المحرك.
async function getData() {
  if (!HAS_DB) return clone(seed);
  const num = v => (v == null ? v : Number(v));
  const q = async (sql) => (await pool.query(sql)).rows;

  const suppliers = (await q('SELECT * FROM suppliers')).map(r => ({ id: r.id, name: r.name, rating: num(r.rating) }));
  const ingredients = (await q('SELECT * FROM ingredients')).map(r => ({
    id: r.id, name: r.name, unit: r.unit, supplierId: r.supplier_id,
    cost: num(r.cost), wastePct: num(r.waste_pct),
    alts: (r.alts || []).map(a => ({ supplierId: a.supplierId, cost: num(a.cost) })),
  }));
  const subRecipes = (await q('SELECT * FROM sub_recipes')).map(r => ({
    id: r.id, name: r.name, yieldQty: num(r.yield_qty), yieldUnit: r.yield_unit, lines: r.lines,
  }));
  const packaging = (await q('SELECT * FROM packaging')).map(r => ({ id: r.id, name: r.name, cost: num(r.cost) }));
  const products = (await q('SELECT * FROM products')).map(r => ({
    id: r.id, name: r.name, cat: r.cat, price: num(r.price), freshness: num(r.freshness), recipe: r.recipe, pack: r.pack,
  }));
  const branches = (await q('SELECT * FROM branches')).map(r => ({ id: r.id, name: r.name }));
  const sales = (await q('SELECT * FROM sales')).map(r => ({
    productId: r.product_id, branchId: r.branch_id, monthly: r.monthly, byHour: r.by_hour, wastePct: num(r.waste_pct),
  }));
  return { suppliers, ingredients, subRecipes, packaging, products, branches, sales };
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

module.exports = { init, getData, HAS_DB };
