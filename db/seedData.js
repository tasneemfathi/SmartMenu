// بيانات أولية (Seed) — مطعم برجر افتراضي. تُستخدم لتعبئة PostgreSQL أول مرة،
// وكاحتياطي في الذاكرة عند غياب DATABASE_URL.

const suppliers = [
  { id: 'sup_meat',  name: 'مورد اللحوم الذهبي', rating: 4.6 },
  { id: 'sup_veg',   name: 'مزارع الطازج للخضار', rating: 4.2 },
  { id: 'sup_bake',  name: 'مخابز السنابل', rating: 4.8 },
  { id: 'sup_dairy', name: 'ألبان البقرة السعيدة', rating: 4.4 },
  { id: 'sup_pack',  name: 'التغليف الحديث', rating: 4.0 },
  { id: 'sup_meat2', name: 'لحوم الوفرة (بديل)', rating: 4.1 },
  { id: 'sup_veg2',  name: 'خضار المدينة (بديل)', rating: 4.5 },
];

const ingredients = [
  { id: 'beef',    name: 'لحم بقري مفروم', unit: 'كجم', supplierId: 'sup_meat',  cost: 46,   wastePct: 0.04, alts: [{ supplierId: 'sup_meat2', cost: 41.5 }] },
  { id: 'chick',   name: 'صدر دجاج',       unit: 'كجم', supplierId: 'sup_meat',  cost: 29,   wastePct: 0.06, alts: [{ supplierId: 'sup_meat2', cost: 27 }] },
  { id: 'bun',     name: 'خبز برجر',        unit: 'حبة', supplierId: 'sup_bake',  cost: 0.85, wastePct: 0.03, alts: [] },
  { id: 'cheese',  name: 'جبنة شيدر',       unit: 'كجم', supplierId: 'sup_dairy', cost: 38,   wastePct: 0.04, alts: [] },
  { id: 'lettuce', name: 'خس',             unit: 'كجم', supplierId: 'sup_veg',   cost: 8,    wastePct: 0.14, alts: [{ supplierId: 'sup_veg2', cost: 7.2 }] },
  { id: 'tomato',  name: 'طماطم',          unit: 'كجم', supplierId: 'sup_veg',   cost: 6.5,  wastePct: 0.12, alts: [{ supplierId: 'sup_veg2', cost: 5.4 }] },
  { id: 'onion',   name: 'بصل',            unit: 'كجم', supplierId: 'sup_veg',   cost: 4,    wastePct: 0.09, alts: [{ supplierId: 'sup_veg2', cost: 3.6 }] },
  { id: 'pickle',  name: 'مخلل',           unit: 'كجم', supplierId: 'sup_veg',   cost: 10,   wastePct: 0.05, alts: [] },
  { id: 'fries',   name: 'بطاطا مجمدة',     unit: 'كجم', supplierId: 'sup_veg',   cost: 9,    wastePct: 0.05, alts: [{ supplierId: 'sup_veg2', cost: 8.3 }] },
  { id: 'oil',     name: 'زيت قلي',         unit: 'لتر', supplierId: 'sup_veg',   cost: 7.5,  wastePct: 0.18, alts: [] },
  { id: 'mayo',    name: 'مايونيز',         unit: 'كجم', supplierId: 'sup_dairy', cost: 14,   wastePct: 0.03, alts: [] },
  { id: 'ketchup', name: 'كاتشب',          unit: 'كجم', supplierId: 'sup_veg',   cost: 6,    wastePct: 0.03, alts: [] },
  { id: 'spice',   name: 'بهارات وتوابل',   unit: 'كجم', supplierId: 'sup_veg',   cost: 22,   wastePct: 0.02, alts: [] },
  { id: 'milk',    name: 'حليب',            unit: 'لتر', supplierId: 'sup_dairy', cost: 5,    wastePct: 0.10, alts: [] },
  { id: 'icecream',name: 'آيس كريم خام',    unit: 'لتر', supplierId: 'sup_dairy', cost: 16,   wastePct: 0.12, alts: [] },
  { id: 'syrup',   name: 'شراب مشروب غازي', unit: 'لتر', supplierId: 'sup_dairy', cost: 12,   wastePct: 0.02, alts: [] },
  { id: 'veg_patty',name: 'برغر نباتي خام', unit: 'حبة', supplierId: 'sup_veg2',  cost: 3.8,  wastePct: 0.05, alts: [] },
];

const subRecipes = [
  { id: 'sauce', name: 'الصوص الخاص', yieldQty: 1, yieldUnit: 'كجم',
    lines: [{ ref: 'mayo', qty: 0.55 }, { ref: 'ketchup', qty: 0.30 }, { ref: 'pickle', qty: 0.10 }, { ref: 'spice', qty: 0.05 }] },
  { id: 'cookedfries', name: 'بطاطا مقلية محضّرة', yieldQty: 1, yieldUnit: 'كجم',
    lines: [{ ref: 'fries', qty: 1.0 }, { ref: 'oil', qty: 0.12 }, { ref: 'spice', qty: 0.01 }] },
  { id: 'marinade', name: 'تتبيلة الدجاج المقرمش', yieldQty: 1, yieldUnit: 'كجم',
    lines: [{ ref: 'chick', qty: 1.0 }, { ref: 'spice', qty: 0.06 }, { ref: 'oil', qty: 0.20 }] },
];

const packaging = [
  { id: 'box',   name: 'علبة برجر', cost: 0.55 },
  { id: 'fbag',  name: 'كيس بطاطا', cost: 0.30 },
  { id: 'cup',   name: 'كوب مشروب', cost: 0.40 },
  { id: 'msbag', name: 'كوب ميلك شيك', cost: 0.55 },
  { id: 'nap',   name: 'مناديل + ساشيه', cost: 0.15 },
];

const products = [
  { id: 'cheese_b', name: 'تشيز برجر كلاسيك', cat: 'برجر', price: 21, freshness: 0.7,
    recipe: [{ ref: 'beef', t: 'ing', qty: 0.13 }, { ref: 'bun', t: 'ing', qty: 1 }, { ref: 'cheese', t: 'ing', qty: 0.03 },
             { ref: 'lettuce', t: 'ing', qty: 0.02 }, { ref: 'tomato', t: 'ing', qty: 0.03 }, { ref: 'onion', t: 'ing', qty: 0.015 },
             { ref: 'sauce', t: 'sub', qty: 0.03 }], pack: ['box', 'nap'] },
  { id: 'double_b', name: 'دبل برجر لحم', cat: 'برجر', price: 32, freshness: 0.7,
    recipe: [{ ref: 'beef', t: 'ing', qty: 0.26 }, { ref: 'bun', t: 'ing', qty: 1 }, { ref: 'cheese', t: 'ing', qty: 0.06 },
             { ref: 'lettuce', t: 'ing', qty: 0.02 }, { ref: 'tomato', t: 'ing', qty: 0.03 }, { ref: 'onion', t: 'ing', qty: 0.02 },
             { ref: 'sauce', t: 'sub', qty: 0.04 }], pack: ['box', 'nap'] },
  { id: 'chick_b', name: 'برجر دجاج مقرمش', cat: 'برجر', price: 24, freshness: 0.8,
    recipe: [{ ref: 'marinade', t: 'sub', qty: 0.14 }, { ref: 'bun', t: 'ing', qty: 1 }, { ref: 'lettuce', t: 'ing', qty: 0.025 },
             { ref: 'sauce', t: 'sub', qty: 0.035 }], pack: ['box', 'nap'] },
  { id: 'veg_b', name: 'برجر نباتي', cat: 'برجر', price: 23, freshness: 0.6,
    recipe: [{ ref: 'veg_patty', t: 'ing', qty: 1 }, { ref: 'bun', t: 'ing', qty: 1 }, { ref: 'lettuce', t: 'ing', qty: 0.025 },
             { ref: 'tomato', t: 'ing', qty: 0.03 }, { ref: 'sauce', t: 'sub', qty: 0.03 }], pack: ['box', 'nap'] },
  { id: 'fries_m', name: 'بطاطا مقلية (وسط)', cat: 'جانبي', price: 11, freshness: 0.9,
    recipe: [{ ref: 'cookedfries', t: 'sub', qty: 0.16 }], pack: ['fbag', 'nap'] },
  { id: 'combo', name: 'وجبة برجر كومبو', cat: 'وجبة', price: 39, freshness: 0.85,
    recipe: [{ ref: 'beef', t: 'ing', qty: 0.13 }, { ref: 'bun', t: 'ing', qty: 1 }, { ref: 'cheese', t: 'ing', qty: 0.03 },
             { ref: 'lettuce', t: 'ing', qty: 0.02 }, { ref: 'tomato', t: 'ing', qty: 0.03 }, { ref: 'sauce', t: 'sub', qty: 0.03 },
             { ref: 'cookedfries', t: 'sub', qty: 0.16 }, { ref: 'syrup', t: 'ing', qty: 0.05 }], pack: ['box', 'fbag', 'cup', 'nap'] },
  { id: 'soda', name: 'مشروب غازي', cat: 'مشروب', price: 7, freshness: 0.95,
    recipe: [{ ref: 'syrup', t: 'ing', qty: 0.05 }], pack: ['cup'] },
  { id: 'shake', name: 'ميلك شيك', cat: 'مشروب', price: 16, freshness: 0.4,
    recipe: [{ ref: 'icecream', t: 'ing', qty: 0.18 }, { ref: 'milk', t: 'ing', qty: 0.10 }], pack: ['msbag', 'nap'] },
];

const branches = [
  { id: 'olaya',   name: 'فرع العليا' },
  { id: 'nakheel', name: 'فرع النخيل' },
  { id: 'corn',    name: 'فرع الكورنيش' },
];

const hourPatterns = {
  lunchDinner: [0,0,0,0,0,0,1,2,3,4,6,9,14,12,7,5,5,8,13,14,11,7,4,2],
  allDay:      [0,0,0,0,0,1,2,3,5,6,7,8,9,9,8,7,7,8,9,9,8,6,4,2],
  afternoon:   [0,0,0,0,0,0,0,1,2,3,4,6,8,9,11,12,11,9,7,5,4,3,2,1],
  late:        [1,1,0,0,0,0,1,2,3,4,5,7,9,8,6,5,6,8,11,12,12,10,7,4],
};
function distribute(total, patName) {
  const w = hourPatterns[patName], s = w.reduce((a, b) => a + b, 0);
  return w.map(x => Math.round(total * x / s));
}
function S(productId, branchId, monthly, pat, wastePct) {
  return { productId, branchId, monthly, byHour: distribute(monthly, pat), wastePct };
}
const sales = [
  S('cheese_b','olaya',2600,'lunchDinner',0.03), S('cheese_b','nakheel',2100,'lunchDinner',0.04), S('cheese_b','corn',1800,'late',0.05),
  S('double_b','olaya',1500,'lunchDinner',0.04), S('double_b','nakheel',1200,'lunchDinner',0.05), S('double_b','corn',900,'late',0.06),
  S('chick_b','olaya',1700,'lunchDinner',0.05),  S('chick_b','nakheel',1400,'lunchDinner',0.05),  S('chick_b','corn',1100,'late',0.07),
  S('veg_b','olaya',420,'allDay',0.10),          S('veg_b','nakheel',150,'allDay',0.18),          S('veg_b','corn',60,'allDay',0.30),
  S('fries_m','olaya',3000,'lunchDinner',0.04),  S('fries_m','nakheel',2500,'lunchDinner',0.05),  S('fries_m','corn',2000,'late',0.06),
  S('combo','olaya',1900,'lunchDinner',0.04),    S('combo','nakheel',1600,'lunchDinner',0.04),    S('combo','corn',1200,'late',0.05),
  S('soda','olaya',3200,'allDay',0.02),          S('soda','nakheel',2700,'allDay',0.02),          S('soda','corn',2300,'allDay',0.03),
  S('shake','olaya',900,'afternoon',0.16),       S('shake','nakheel',650,'afternoon',0.20),       S('shake','corn',500,'afternoon',0.24),
];

module.exports = { suppliers, ingredients, subRecipes, packaging, products, branches, sales };
