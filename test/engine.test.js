// اختبار المحرك على بيانات الذاكرة — يتحقق من صحة الحسابات وحمولات الـ API.
const data = require('../db/seedData');
const engine = require('../engine');

let ok = 0, fail = 0;
const check = (name, cond) => { if (cond) ok++; else { fail++; console.log('FAIL:', name); } };

const ov = engine.overviewPayload(data);
console.log('Revenue', Math.round(ov.kpi.revenue), '| Profit', Math.round(ov.kpi.profit),
  '| Waste', Math.round(ov.kpi.wasteCost), '| Units', ov.kpi.units, '| Margin', (ov.kpi.margin * 100).toFixed(1) + '%');
check('revenue > 0', ov.kpi.revenue > 0);
check('profit < revenue', ov.kpi.profit < ov.kpi.revenue);
check('margin sane', ov.kpi.margin > 0 && ov.kpi.margin < 1);
check('profitByProduct sorted', ov.profitByProduct.every((p, i) => i === 0 || ov.profitByProduct[i - 1].profit >= p.profit));
check('hourly has 24', ov.hourly.length === 24);

const cost = engine.costingPayload(data);
check('all products costed', cost.products.length === data.products.length);
check('all unit-profitable', cost.products.every(p => p.price > p.total));
check('breakdown present', cost.products.every(p => p.breakdown.length > 0));

const rec = engine.recommendations(data);
const types = [...new Set(rec.map(r => r.type))];
console.log('Recommendations:', rec.length, '| types:', types.join(' | '));
check('has recommendations', rec.length > 0);
check('recs sorted by impact', rec.every((r, i) => i === 0 || rec[i - 1].impact >= r.impact));
check('branch-stop present', rec.some(r => r.type === 'إيقاف بفرع'));
check('supplier-swap present', rec.some(r => r.type === 'استبدال مورّد'));
check('hours-stop present', rec.some(r => r.type === 'إيقاف بساعات'));

// Sandbox: مورّد أرخص يرفع الربح
const sb1 = engine.sandboxPayload(data, [{ kind: 'supplier', iid: 'beef', cost: 41.5 }], false);
console.log('Swap beef supplier -> profit delta:', Math.round(sb1.sim.profit - sb1.base.profit));
check('cheaper supplier raises profit', sb1.sim.profit > sb1.base.profit);

// Sandbox: تضخّم سعر يخفض الربح
const sb2 = engine.sandboxPayload(data, [{ kind: 'ingprice', iid: 'beef', cost: 46 * 1.2 }], false);
check('inflation lowers profit', sb2.sim.profit < sb2.base.profit);

// Sandbox: مرونة سعرية تقلّل الوحدات
const sb3 = engine.sandboxPayload(data, [{ kind: 'price', pid: 'cheese_b', price: 23 }], true);
console.log('Cheeseburger +price (elastic) -> units delta:', sb3.sim.units - sb3.base.units);
check('elasticity reduces units', sb3.sim.units < sb3.base.units);

// Sandbox: إيقاف منتج خاسر يرفع الربح
const sb4 = engine.sandboxPayload(data, [{ kind: 'stop', pid: 'veg_b', bid: 'corn' }], false);
check('stopping losing line raises profit', sb4.sim.profit > sb4.base.profit);

console.log(`\nRESULT: ${ok} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
