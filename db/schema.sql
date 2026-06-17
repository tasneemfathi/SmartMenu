-- مخطّط قاعدة البيانات (PostgreSQL)
-- الحقول المركّبة (الوصفات، الأسعار البديلة، التوزيع الساعي) تُخزَّن كـ JSONB
-- للحفاظ على نفس بنية النموذج وتبسيط القراءة/الكتابة.

CREATE TABLE IF NOT EXISTS suppliers (
  id      TEXT PRIMARY KEY,
  name    TEXT NOT NULL,
  rating  NUMERIC
);

CREATE TABLE IF NOT EXISTS ingredients (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  unit        TEXT,
  supplier_id TEXT REFERENCES suppliers(id),
  cost        NUMERIC NOT NULL,
  waste_pct   NUMERIC NOT NULL DEFAULT 0,
  alts        JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS sub_recipes (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  yield_qty  NUMERIC NOT NULL DEFAULT 1,
  yield_unit TEXT,
  lines      JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS packaging (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cost NUMERIC NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id        TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  cat       TEXT,
  price     NUMERIC NOT NULL,
  freshness NUMERIC DEFAULT 0.8,
  recipe    JSONB NOT NULL DEFAULT '[]',
  pack      JSONB NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS branches (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
  id         SERIAL PRIMARY KEY,
  product_id TEXT REFERENCES products(id),
  branch_id  TEXT REFERENCES branches(id),
  monthly    INTEGER NOT NULL DEFAULT 0,
  by_hour    JSONB NOT NULL DEFAULT '[]',
  waste_pct  NUMERIC NOT NULL DEFAULT 0
);
