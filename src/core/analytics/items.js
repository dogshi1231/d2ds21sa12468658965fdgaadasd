const path = require('path');
const db = require('../database');

/**
 * Aggregate item/product analytics from order_analytics.json
 * Returns counts and revenue per product name (case-insensitive key).
 */
function getItemAnalytics({ since } = {}) {
  const orderData = db.readJson('order_analytics', { orders: {} });
  const minTs = since ? new Date(since).getTime() : 0;
  const byProduct = {};
  for (const ord of Object.values(orderData.orders)) {
    const ts = new Date(ord.timestamp).getTime();
    if (Number.isFinite(minTs) && ts && ts < minTs) continue;
    const key = String((ord.product || 'unknown')).toLowerCase();
    if (!byProduct[key]) byProduct[key] = { product: key, count: 0, revenueCents: 0 };
    byProduct[key].count += 1;
    byProduct[key].revenueCents += ord.amount || 0;
  }
  const items = Object.values(byProduct).sort((a,b)=>b.count-a.count);
  return { items, updatedAt: new Date().toISOString() };
}

function getRecentItems(limit = 10) {
  const orderData = db.readJson('order_analytics', { orders: {} });
  const list = Object.values(orderData.orders)
    .sort((a,b)=> new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, limit)
    .map(o => ({ product: o.product || 'unknown', amountCents: o.amount || 0, timestamp: o.timestamp }));
  return { items: list, updatedAt: new Date().toISOString() };
}

module.exports = { getItemAnalytics, getRecentItems };
