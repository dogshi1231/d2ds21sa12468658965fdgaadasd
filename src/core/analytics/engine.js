const fs = require('fs');
const path = require('path');
const { TransactionsService } = require('./transactions');

class AnalyticsEngine {
  constructor({ client, db, configPath } = {}) {
    // client is accepted for compatibility but not used in core logic
    this.client = null;
    this.db = db || null;
    this.configPath = configPath || path.join(process.cwd(), 'custom', 'analytics-config.json');

    // File-backed data (Phase 1 compatibility)
    this.paths = {
      dailyStats: path.join(process.cwd(), 'data', 'dailyStats.json'),
      orders: path.join(process.cwd(), 'data', 'order_analytics.json'),
      invites: path.join(process.cwd(), 'data', 'invite_tracking.json'),
      staffActivity: path.join(process.cwd(), 'data', 'staffActivity.json'),
      vouches: path.join(process.cwd(), 'data', 'vouches.json'),
      invoiceLinks: path.join(process.cwd(), 'data', 'invoice_links.json'),
    };

    this.config = this.loadJSON(this.configPath, {
      analyticsChannelId: '',
      inactivityNoticeChannelId: '',
      reportTimeUTC: '00:00',
      productCosts: {},
    });

    // Transactions service (buy/sell matching)
    this.transactions = new TransactionsService();
  }

  // Utilities
  loadJSON(file, fallback = {}) {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
  }

  getProductCost(product) {
    const key = (product || 'default').toLowerCase();
    const costs = this.config.productCosts || {};
    if (costs[key]) return costs[key] * 100;
    for (const [k, v] of Object.entries(costs)) {
      if (key.includes(k) || k.includes(key)) return v * 100;
    }
    return (costs.default || 5) * 100;
  }

  // Public API
  async getDashboardData() {
    const orders = this.loadJSON(this.paths.orders, { orders: {} });
    const invites = this.loadJSON(this.paths.invites, { members: {} });
    const daily = this.loadJSON(this.paths.dailyStats, {
      ordersToday: 0, revenueToday: 0, vcJoinsToday: 0, messagesPerUser: {},
      ticketsClaimedToday: {}, staffTicketRevenue: {}
    });

    const today = new Date(); today.setHours(0,0,0,0);

    let ordersToday = 0; let revenueToday = 0; const counts = {}; const profitByCategory = {};
    for (const order of Object.values(orders.orders || {})) {
      const ts = new Date(order.timestamp);
      if (ts >= today) { ordersToday++; revenueToday += order.amount || 0; }
      const p = (order.product || 'unknown').toLowerCase(); counts[p] = (counts[p]||0)+1;
      const cost = this.getProductCost(p); const profit = (order.amount||0) - cost;
      if (!profitByCategory[p]) profitByCategory[p] = { profit: 0, count: 0, revenue: 0, cost: 0 };
      profitByCategory[p].profit += profit; profitByCategory[p].count++; profitByCategory[p].revenue += (order.amount||0); profitByCategory[p].cost += cost;
    }

    const topProduct = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];

    const totalJoins = Object.keys(invites.members || {}).length;
    const totalPurchases = Object.keys(orders.orders || {}).length;
    const joinToOrderRatio = totalJoins > 0 ? +( (totalPurchases / totalJoins * 100).toFixed(1) ) : 0;

    return {
      ordersToday,
      revenueToday,
      profitByCategory,
      topProduct: topProduct ? { name: topProduct[0], count: topProduct[1] } : null,
      engagement: {
        vcJoinsToday: daily.vcJoinsToday || 0,
        vcToPurchaseRatio: daily.vcJoinsToday > 0 ? +((ordersToday / daily.vcJoinsToday * 100).toFixed(1)) : 0,
        totalMessagesToday: Object.values(daily.messagesPerUser || {}).reduce((s,c)=>s+c,0),
      },
      staff: {
        ticketsClaimedToday: daily.ticketsClaimedToday || {},
        staffTicketRevenue: daily.staffTicketRevenue || {},
      },
      invites: { totalJoins, totalPurchases, joinToOrderRatio },
    };
  }

  /**
   * Build a structured analytics report object (JSON-only).
   */
  async buildReport() {
    const data = await this.getDashboardData();
    return {
      sections: [
        {
          key: 'orders',
          title: 'Order Analytics',
          data: {
            ordersToday: data.ordersToday,
            revenueToday: data.revenueToday,
            topProduct: data.topProduct,
            profitByCategory: data.profitByCategory,
          },
        },
        {
          key: 'engagement',
          title: 'Engagement',
          data: data.engagement,
        },
        {
          key: 'staff',
          title: 'Staff',
          data: data.staff,
        },
        {
          key: 'invites',
          title: 'Invites',
          data: data.invites,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Add a buy/sell transaction and return summary
   */
  addTransaction(side, price, type, date, notes, quantity = 1, mode) {
    return this.transactions.addTransaction(side, price, type, date, notes, quantity, mode);
  }
}

module.exports = { AnalyticsEngine };
