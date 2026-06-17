// ============================================================
//  المحرّك التحليلي (Engine) — وحدة Node نقية
//  يعمل على كائن البيانات `data` ويُنتج حمولات JSON جاهزة للواجهة.
//  نفس معادلات الديمو، الآن على الخادم وقابلة لإعادة الحساب من قاعدة البيانات.
// ============================================================

const OP_COST_PER_LINE = 1400; // تكلفة تشغيلية شهرية لكل صنف نشط في فرع (مخزون + تحضير + تعقيد منيو)
const DEFAULT_ELASTICITY = -1.2;

function maps(data) {
  return {
    ing: Object.fromEntries(data.ingredients.map(i => [i.id, i])),
    sub: Object.fromEntries(data.subRecipes.map(s => [s.id, s])),
    pack: Object.fromEntries(data.packaging.map(p => [p.id, p])),
    prod: Object.fromEntries(data.products.map(p => [p.id, p])),
    sup: Object.fromEntries(data.suppliers.map(s => [s.id, s])),
    branch: Object.fromEntries(data.branches.map(b => [b.id, b])),
  };
}

// ---- التكاليف ----
function ingUnitCost(ing, ov) {
  if (ov && ov.supplierSwap && ov.supplierSwap[ing.id] != null) return ov.supplierSwap[ing.id];
  if (ov && ov.ingPrice && ov.ingPrice[ing.id] != null) return ov.ingPrice[ing.id];
  return ing.cost;
}
function ingEffCost(ing, ov) { return ingUnitCost(ing, ov) / (1 - ing.wastePct); }
function subCostPerUnit(M, sub, ov) {
  let c = 0;
  for (const ln of sub.lines) c += ingEffCost(M.ing[ln.ref], ov) * ln.qty;
  return c / sub.yieldQty;
}
function productFoodCost(M, p, ov) {
  let c = 0;
  for (const ln of p.recipe) {
    if (ln.t === 'ing') c += ingEffCost(M.ing[ln.ref], ov) * ln.qty;
    else c += subCostPerUnit(M, M.sub[ln.ref], ov) * ln.qty;
  }
  return c;
}
function productPackCost(M, p) { return p.pack.reduce((s, id) => s + M.pack[id].cost, 0); }
function productPrice(p, ov) { return (ov && ov.price && ov.price[p.id] != null) ? ov.price[p.id] : p.price; }

function explodeIngredients(M, p) {
  const out = {};
  const add = (id, q) => { out[id] = (out[id] || 0) + q; };
  for (const ln of p.recipe) {
    if (ln.t === 'ing') add(ln.ref, ln.qty);
    else { const sub = M.sub[ln.ref]; for (const sl of sub.lines) add(sl.ref, sl.qty * ln.qty / sub.yieldQty); }
  }
  return out;
}
function productTotalUnits(data, pid) {
  return data.sales.filter(s => s.productId === pid).reduce((a, s) => a + s.monthly, 0);
}

// ---- الأرباح لكل (منتج×فرع) ----
function computeRows(data, ov) {
  ov = ov || {};
  const M = maps(data);
  const elastic = ov.elasticity != null ? ov.elasticity : DEFAULT_ELASTICITY;
  const rows = [];
  for (const s of data.sales) {
    const p = M.prod[s.productId];
    if (!p) continue;
    const stoppedAll = ov.stopped && ov.stopped.has(p.id);
    const stoppedBranch = ov.stopped && ov.stopped.has(p.id + '@' + s.branchId);
    let units = s.monthly;
    if (ov.price && ov.price[p.id] != null && ov.useElasticity) {
      const dP = (ov.price[p.id] - p.price) / p.price;
      units = Math.max(0, units * (1 + elastic * dP));
    }
    if (stoppedAll || stoppedBranch) units = 0;
    units = Math.round(units);
    const food = productFoodCost(M, p, ov), pack = productPackCost(M, p), tcost = food + pack;
    const price = productPrice(p, ov), margin = price - tcost;
    const wasteUnits = units * s.wastePct;
    const wasteCost = wasteUnits * food;
    const opCost = units > 0 ? OP_COST_PER_LINE : 0;
    const revenue = units * price;
    const profit = units * margin - wasteCost - opCost;
    rows.push({
      pid: p.id, pname: p.name, cat: p.cat, bid: s.branchId, bname: (M.branch[s.branchId] || {}).name || s.branchId,
      units, price, food, pack, tcost, margin, marginPct: margin / price, wastePct: s.wastePct,
      wasteUnits, wasteCost, opCost, revenue, profit,
    });
  }
  return rows;
}
function kpis(rows) {
  const k = { revenue: 0, foodCost: 0, packCost: 0, wasteCost: 0, opCost: 0, profit: 0, units: 0 };
  for (const r of rows) {
    k.revenue += r.revenue; k.foodCost += r.food * r.units; k.packCost += r.pack * r.units;
    k.wasteCost += r.wasteCost; k.opCost += r.opCost; k.profit += r.profit; k.units += r.units;
  }
  k.margin = k.revenue ? k.profit / k.revenue : 0;
  return k;
}

function monthlyIngredientUsage(data) {
  const M = maps(data);
  const usable = {}, purchased = {};
  for (const p of data.products) {
    const total = productTotalUnits(data, p.id);
    const ex = explodeIngredients(M, p);
    for (const id in ex) {
      const u = ex[id] * total;
      usable[id] = (usable[id] || 0) + u;
      purchased[id] = (purchased[id] || 0) + u / (1 - M.ing[id].wastePct);
    }
  }
  return { usable, purchased };
}

const pad = n => String(n).padStart(2, '0');
function fmtHours(hrs) {
  const ranges = []; let start = hrs[0], prev = hrs[0];
  for (let i = 1; i < hrs.length; i++) { if (hrs[i] === prev + 1) prev = hrs[i]; else { ranges.push([start, prev]); start = prev = hrs[i]; } }
  ranges.push([start, prev]);
  const PCT = n => (n * 100).toFixed(1) + '%';
  return ranges.map(([a, b]) => a === b ? `${pad(a)}:00` : `${pad(a)}:00–${pad(b + 1)}:00`).join('، ');
}

// ---- التوصيات ----
function recommendations(data) {
  const M = maps(data);
  const SAR = n => (Math.round(n * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ر.س';
  const SAR0 = n => Math.round(n).toLocaleString('en-US') + ' ر.س';
  const PCT = n => (n * 100).toFixed(1) + '%';
  const rows = computeRows(data);
  const usage = monthlyIngredientUsage(data);
  const recs = [];

  // (أ) إيقاف/مراجعة منتج بفرع
  for (const r of rows) {
    if (r.units === 0) continue;
    if (r.profit < 0) {
      recs.push({ sev: 'crit', type: 'إيقاف بفرع', title: `أوقف «${r.pname}» في ${r.bname}`,
        detail: `صافي الربح الشهري لهذا المنتج في هذا الفرع <b>سالب</b> (${SAR(r.profit)}). يبيع ${r.units} وحدة/شهر فقط (حركة بطيئة) وبهدر ${PCT(r.wastePct)}؛ مساهمة البيع لا تغطّي التكلفة التشغيلية للصنف (≈ ${SAR0(OP_COST_PER_LINE)}/شهر). إيقافه في هذا الفرع يحسّن الربح ويبسّط التشغيل.`,
        impact: Math.abs(r.profit), unit: 'ر.س/شهر توفير' });
    } else if (r.units < 220 && r.profit < 1500) {
      recs.push({ sev: 'warn', type: 'مراجعة بفرع', title: `راجع «${r.pname}» في ${r.bname}`,
        detail: `حركة بطيئة (${r.units} وحدة/شهر) وربح صافٍ ضئيل (${SAR(r.profit)}) بعد خصم التكلفة التشغيلية. الصنف في خانة «الكلب» بمصفوفة هندسة المنيو. يُقترح إيقافه أو دمجه أو رفع سعره لاختبار الطلب.`,
        impact: r.profit, unit: 'ر.س/شهر فرصة' });
    }
  }

  // (ب) إيقاف بساعات للمنتجات سريعة التلف
  for (const p of data.products) {
    if (p.freshness > 0.55) continue;
    const ps = data.sales.filter(s => s.productId === p.id);
    const agg = new Array(24).fill(0);
    ps.forEach(s => s.byHour.forEach((v, h) => agg[h] += v));
    const peak = Math.max(...agg);
    const deadHours = agg.map((v, h) => ({ h, v })).filter(o => o.v > 0 && o.v < peak * 0.12).map(o => o.h);
    if (deadHours.length >= 2) {
      const food = productFoodCost(M, p);
      const avgWaste = ps.reduce((a, s) => a + s.wastePct, 0) / ps.length;
      const deadUnits = deadHours.reduce((a, h) => a + agg[h], 0);
      const save = deadUnits * food * avgWaste * 1.8;
      recs.push({ sev: 'warn', type: 'إيقاف بساعات', title: `أوقف تحضير «${p.name}» في ساعات الركود`,
        detail: `«${p.name}» منتج سريع التلف وطلبه شبه معدوم في الساعات ${fmtHours(deadHours)}. الإبقاء على التحضير في هذه الفترات يولّد هدراً (متوسط ${PCT(avgWaste)}). يُقترح إيقافه أو التحضير عند الطلب فقط خلالها.`,
        impact: save, unit: 'ر.س/شهر توفير' });
    }
  }

  // (ج) استبدال مورّد
  for (const ing of data.ingredients) {
    if (!ing.alts.length) continue;
    const best = ing.alts.reduce((a, b) => b.cost < a.cost ? b : a, ing.alts[0]);
    if (best.cost < ing.cost) {
      const purchasedQty = usage.purchased[ing.id] || 0;
      const save = (ing.cost - best.cost) * purchasedQty;
      if (save < 50) continue;
      recs.push({ sev: 'opp', type: 'استبدال مورّد', title: `استبدل مورّد «${ing.name}»`,
        detail: `المورّد الحالي «${M.sup[ing.supplierId].name}» بسعر ${SAR(ing.cost)}/${ing.unit}. البديل «${M.sup[best.supplierId].name}» يعرض ${SAR(best.cost)}/${ing.unit} (تقييم ${M.sup[best.supplierId].rating}). الاستهلاك الشهري ≈ ${Math.round(purchasedQty)} ${ing.unit}.`,
        impact: save, unit: 'ر.س/شهر توفير' });
    }
  }

  // (د) تقليل الهدر
  const wasteList = data.ingredients.map(ing => {
    const purchased = usage.purchased[ing.id] || 0;
    const wasteQty = purchased * ing.wastePct;
    return { ing, wasteCost: wasteQty * ingUnitCost(ing, {}), wasteQty, purchased };
  }).sort((a, b) => b.wasteCost - a.wasteCost);
  for (const w of wasteList.slice(0, 3)) {
    if (w.wasteCost < 150) continue;
    recs.push({ sev: 'opp', type: 'تقليل الهدر', title: `عالج هدر «${w.ing.name}»`,
      detail: `نسبة فاقد ${PCT(w.ing.wastePct)} على استهلاك ${Math.round(w.purchased)} ${w.ing.unit}/شهر تعني فقد ${Math.round(w.wasteQty)} ${w.ing.unit} بكلفة ${SAR(w.wasteCost)}. تحسين التخزين/المعايرة لتقليل الفاقد للنصف يوفّر نصف المبلغ.`,
      impact: w.wasteCost * 0.5, unit: 'ر.س/شهر توفير' });
  }

  // (هـ) تحسين الربحية
  const byProd = {};
  rows.forEach(r => {
    byProd[r.pid] = byProd[r.pid] || { name: r.pname, units: 0, profit: 0, price: r.price, margin: r.marginPct };
    byProd[r.pid].units += r.units; byProd[r.pid].profit += r.profit;
  });
  Object.values(byProd).forEach(o => {
    if (o.units > 3000 && o.margin < 0.55) {
      const bump = o.price * 0.05, extra = bump * o.units * 0.85;
      recs.push({ sev: 'opp', type: 'تحسين الربحية', title: `ارفع سعر «${o.name}» 5% تجريبياً`,
        detail: `منتج عالي المبيعات (${o.units} وحدة/شهر) بهامش ${PCT(o.margin)}. زيادة سعرية بسيطة (+${SAR(bump)}) قابلة للامتصاص. جرّبها في Sandbox قبل التطبيق لقياس أثر المرونة.`,
        impact: extra, unit: 'ر.س/شهر فرصة' });
    }
  });

  return recs.sort((a, b) => b.impact - a.impact);
}

// ============================================================
//  حمولات الـ API الجاهزة للواجهة
// ============================================================
function overviewPayload(data) {
  const rows = computeRows(data);
  const k = kpis(rows);
  const byProd = {};
  rows.forEach(r => { byProd[r.pid] = byProd[r.pid] || { name: r.pname, profit: 0 }; byProd[r.pid].profit += r.profit; });
  const profitByProduct = Object.values(byProd).sort((a, b) => b.profit - a.profit)
    .map(p => ({ name: p.name, profit: Math.round(p.profit) }));
  const hourly = new Array(24).fill(0);
  data.sales.forEach(s => s.byHour.forEach((v, h) => hourly[h] += v));
  return {
    kpi: k,
    profitByProduct,
    costBreakdown: { foodCost: k.foodCost, packCost: k.packCost, wasteCost: k.wasteCost, opCost: k.opCost, profit: k.profit },
    hourly,
  };
}

function costingPayload(data) {
  const M = maps(data);
  const products = data.products.map(p => {
    const food = productFoodCost(M, p), pack = productPackCost(M, p), total = food + pack;
    const margin = p.price - total;
    const breakdown = [];
    for (const ln of p.recipe) {
      if (ln.t === 'ing') {
        const ing = M.ing[ln.ref];
        breakdown.push({ name: ing.name, type: 'ing', qty: ln.qty, unit: ing.unit, unitCost: ing.cost, wastePct: ing.wastePct, effCost: ingEffCost(ing) * ln.qty });
      } else {
        const sub = M.sub[ln.ref];
        breakdown.push({ name: sub.name, type: 'sub', qty: ln.qty, unit: sub.yieldUnit, unitCost: subCostPerUnit(M, sub), wastePct: null, effCost: subCostPerUnit(M, sub) * ln.qty });
      }
    }
    for (const id of p.pack) { const pk = M.pack[id]; breakdown.push({ name: pk.name, type: 'pack', qty: 1, unit: '', unitCost: pk.cost, wastePct: null, effCost: pk.cost }); }
    return { id: p.id, name: p.name, cat: p.cat, food, pack, total, price: p.price, margin, marginPct: margin / p.price, units: productTotalUnits(data, p.id), breakdown };
  });
  return { products };
}

function wastePayload(data) {
  const M = maps(data);
  const usage = monthlyIngredientUsage(data);
  const list = data.ingredients.map(ing => {
    const purchased = usage.purchased[ing.id] || 0, wasteQty = purchased * ing.wastePct;
    return { id: ing.id, name: ing.name, supplier: M.sup[ing.supplierId].name, unit: ing.unit,
      wastePct: ing.wastePct, purchased, wasteQty, wasteCost: wasteQty * ing.cost,
      alt: ing.alts[0] ? { cost: ing.alts[0].cost } : null };
  }).sort((a, b) => b.wasteCost - a.wasteCost);
  const supCount = {};
  data.ingredients.forEach(i => {
    supCount[i.supplierId] = (supCount[i.supplierId] || 0) + 1;
    i.alts.forEach(a => { supCount[a.supplierId] = (supCount[a.supplierId] || 0); });
  });
  const supChart = data.suppliers.filter(s => supCount[s.id] != null && supCount[s.id] > 0)
    .map(s => ({ name: s.name, rating: s.rating, count: supCount[s.id] }));
  return {
    totalWaste: list.reduce((a, x) => a + x.wasteCost, 0),
    top: { name: list[0].name, wasteCost: list[0].wasteCost },
    altCount: data.ingredients.filter(i => i.alts.length).length,
    rows: list,
    wasteChart: list.slice(0, 8).map(x => ({ name: x.name, wasteCost: x.wasteCost })),
    supChart,
  };
}

function dataPayload(data) {
  const M = maps(data);
  return {
    ingredients: data.ingredients.map(i => ({ ...i, supplierName: M.sup[i.supplierId].name, effCost: ingEffCost(i) })),
    subRecipes: data.subRecipes.map(s => ({ id: s.id, name: s.name, yieldQty: s.yieldQty, yieldUnit: s.yieldUnit,
      cost: subCostPerUnit(M, s), lines: s.lines.map(l => ({ name: M.ing[l.ref].name, qty: l.qty, unit: M.ing[l.ref].unit, cost: ingEffCost(M.ing[l.ref]) * l.qty })) })),
    packaging: data.packaging,
    suppliers: data.suppliers.map(su => ({ ...su,
      items: data.ingredients.filter(i => i.supplierId === su.id || i.alts.some(a => a.supplierId === su.id)).map(i => i.name) })),
  };
}

function metaPayload(data) {
  const M = maps(data);
  return {
    products: data.products.map(p => ({ id: p.id, name: p.name, price: p.price })),
    ingredients: data.ingredients.map(i => ({ id: i.id, name: i.name, cost: i.cost, unit: i.unit })),
    altIngredients: data.ingredients.filter(i => i.alts.length).map(i => ({ id: i.id, name: i.name, cost: i.cost, altCost: i.alts[0].cost, altSupplier: M.sup[i.alts[0].supplierId].name })),
    branches: data.branches,
  };
}

function sandboxPayload(data, scenarios, useElasticity) {
  const ov = { price: {}, supplierSwap: {}, ingPrice: {}, stopped: new Set(), useElasticity: !!useElasticity, elasticity: DEFAULT_ELASTICITY };
  for (const s of (scenarios || [])) {
    if (s.kind === 'price') ov.price[s.pid] = s.price;
    else if (s.kind === 'supplier') ov.supplierSwap[s.iid] = s.cost;
    else if (s.kind === 'ingprice') ov.ingPrice[s.iid] = s.cost;
    else if (s.kind === 'stop') ov.stopped.add(s.bid ? s.pid + '@' + s.bid : s.pid);
  }
  const baseRows = computeRows(data), b = kpis(baseRows);
  const simRows = computeRows(data, ov), k = kpis(simRows);
  const deltas = [
    { label: 'صافي الربح', now: k.profit, base: b.profit, goodUp: true, isUnits: false },
    { label: 'الإيرادات', now: k.revenue, base: b.revenue, goodUp: true, isUnits: false },
    { label: 'تكلفة الطعام', now: k.foodCost, base: b.foodCost, goodUp: false, isUnits: false },
    { label: 'كلفة الهدر', now: k.wasteCost, base: b.wasteCost, goodUp: false, isUnits: false },
    { label: 'الوحدات', now: k.units, base: b.units, goodUp: true, isUnits: true },
  ];
  const baseByP = {}, nowByP = {};
  baseRows.forEach(r => baseByP[r.pid] = (baseByP[r.pid] || 0) + r.profit);
  simRows.forEach(r => nowByP[r.pid] = (nowByP[r.pid] || 0) + r.profit);
  const products = data.products.map(p => ({ name: p.name, base: baseByP[p.id] || 0, now: nowByP[p.id] || 0 }))
    .map(o => ({ ...o, diff: o.now - o.base })).filter(o => Math.abs(o.diff) > 0.5)
    .sort((a, b2) => Math.abs(b2.diff) - Math.abs(a.diff));
  return {
    base: b, sim: k, deltas,
    compare: { labels: ['صافي الربح', 'الإيرادات', 'تكلفة الطعام', 'كلفة الهدر'],
      base: [b.profit, b.revenue, b.foodCost, b.wasteCost].map(Math.round),
      sim: [k.profit, k.revenue, k.foodCost, k.wasteCost].map(Math.round) },
    products,
  };
}

module.exports = {
  OP_COST_PER_LINE, computeRows, kpis, recommendations, monthlyIngredientUsage,
  overviewPayload, costingPayload, wastePayload, dataPayload, metaPayload, sandboxPayload,
};
