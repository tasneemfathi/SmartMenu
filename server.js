// خادم منصة ذكاء المنيو — Express + PostgreSQL
// يقدّم واجهة الـ API (محسوبة على الخادم) ويخدم الواجهة الثابتة من public/.

const path = require('path');
const express = require('express');
const store = require('./db/store');
const engine = require('./engine');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// غلاف موحّد: يحمّل البيانات ثم يطبّق دالة المحرك
function handler(fn) {
  return async (req, res) => {
    try {
      const data = await store.getData();
      res.json(fn(data, req));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'حدث خطأ في الخادم', detail: String(e.message || e) });
    }
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, db: store.HAS_DB ? 'postgres' : 'in-memory' }));
app.get('/api/overview', handler(d => engine.overviewPayload(d)));
app.get('/api/costing', handler(d => engine.costingPayload(d)));
app.get('/api/recommendations', handler(d => {
  const recs = engine.recommendations(d);
  const totalSaving = recs.filter(r => r.unit.includes('توفير')).reduce((a, r) => a + r.impact, 0);
  const totalOpp = recs.filter(r => r.unit.includes('فرصة')).reduce((a, r) => a + r.impact, 0);
  return { recs, totalSaving, totalOpp };
}));
app.get('/api/waste', handler(d => engine.wastePayload(d)));
app.get('/api/data', handler(d => engine.dataPayload(d)));
app.get('/api/meta', handler(d => engine.metaPayload(d)));
app.post('/api/sandbox', handler((d, req) => engine.sandboxPayload(d, req.body.scenarios, req.body.useElasticity)));

const PORT = process.env.PORT || 3000;
store.init()
  .then(() => app.listen(PORT, () => console.log(`✅ التطبيق يعمل على المنفذ ${PORT}  (المصدر: ${store.HAS_DB ? 'PostgreSQL' : 'ذاكرة'})`)))
  .catch(err => { console.error('فشل الإقلاع:', err); process.exit(1); });
