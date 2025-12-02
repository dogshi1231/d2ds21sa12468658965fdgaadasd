const db = require('../database');

/**
 * Returns current inventory derived from positions (open lots), grouped by type.
 * - qty: total remaining quantity (can be negative for short)
 * - avgCostCents: weighted average cost for positive qty
 */
function getInventory() {
  const store = db.readJson('positions', { positions: [] });
  const groups = {};
  for (const p of store.positions) {
    const key = p.type || 'unknown';
    if (!groups[key]) groups[key] = { qty: 0, costSum: 0, costQty: 0 };
    groups[key].qty += p.qtyRemaining;
    if (p.qtyRemaining > 0) {
      groups[key].costSum += p.priceCents * p.qtyRemaining;
      groups[key].costQty += p.qtyRemaining;
    }
  }
  const items = Object.entries(groups).map(([type, g]) => ({
    type,
    qty: g.qty,
    avgCostCents: g.costQty > 0 ? Math.round(g.costSum / g.costQty) : 0,
  }));
  return { items, updatedAt: new Date().toISOString() };
}

module.exports = { getInventory };
