const path = require('path');
const crypto = require('crypto');
const db = require('../database');

// File names used by the file-backed adapter
const FILE_TRANSACTIONS = 'transactions';
const FILE_POSITIONS = 'positions';
const FILE_MATCHES = 'matches';

function nowIso(date) {
  if (date) {
    const d = new Date(date);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function toCents(price) {
  if (typeof price === 'number') return Math.round(price * 100);
  if (typeof price === 'string') {
    const n = Number(price);
    return Math.round(n * 100);
  }
  if (typeof price === 'object' && price != null && 'cents' in price) return price.cents | 0;
  return 0;
}

function uid() { return crypto.randomBytes(8).toString('hex'); }

/**
 * TransactionsService
 * - Adds buy/sell transactions
 * - Automatically matches sells to existing buy positions (FIFO/LIFO)
 * - Calculates realized profit
 * - Persists transactions, positions, and matches
 * - Returns JSON-friendly metadata for dashboards/embeds
 */
class TransactionsService {
  constructor({ mode = 'FIFO' } = {}) {
    this.mode = (mode || 'FIFO').toUpperCase(); // 'FIFO' | 'LIFO'
  }

  _readAll() {
    const transactions = db.readJson(FILE_TRANSACTIONS, { transactions: [] });
    const positions = db.readJson(FILE_POSITIONS, { positions: [] });
    const matches = db.readJson(FILE_MATCHES, { matches: [] });
    return { transactions, positions, matches };
  }

  _writeAll({ transactions, positions, matches }) {
    db.writeJson(FILE_TRANSACTIONS, transactions);
    db.writeJson(FILE_POSITIONS, positions);
    db.writeJson(FILE_MATCHES, matches);
  }

  /**
   * Add a transaction and perform matching if it's a sell.
   * @param {('buy'|'sell')} side
   * @param {number|string|{cents:number}} price - unit price; dollars or cents
   * @param {string} type - product/item key
   * @param {string|Date} date
   * @param {string} notes
   * @param {number} quantity - defaults to 1
   * @param {('FIFO'|'LIFO')} mode - optional override
   * @returns {object} summary for dashboards/embeds
   */
  addTransaction(side, price, type, date, notes, quantity = 1, mode) {
    const matchMode = (mode || this.mode || 'FIFO').toUpperCase();
    const priceCents = toCents(price);
    const ts = nowIso(date);
    const id = uid();

    const store = this._readAll();
    const txEntry = { id, side, type, priceCents, quantity, date: ts, notes: notes || '' };

    // Persist raw transaction
    store.transactions.transactions.push(txEntry);

    let realizedProfitCents = 0;
    const createdMatches = [];
    let unmatchedSellQty = 0;

    if (side === 'buy') {
      // Create/append position lot
      store.positions.positions.push({
        id,
        type,
        qtyRemaining: quantity,
        priceCents,
        date: ts,
      });
    } else if (side === 'sell') {
      let remainingToMatch = quantity;
      // Candidate positions of same type
      const candidates = store.positions.positions
        .filter(p => p.type === type && p.qtyRemaining > 0)
        .sort((a, b) => matchMode === 'FIFO' ? (new Date(a.date) - new Date(b.date)) : (new Date(b.date) - new Date(a.date)));

      for (const pos of candidates) {
        if (remainingToMatch <= 0) break;
        const take = Math.min(remainingToMatch, pos.qtyRemaining);
        const profit = take * (priceCents - pos.priceCents);
        realizedProfitCents += profit;
        pos.qtyRemaining -= take;
        remainingToMatch -= take;

        const matchId = uid();
        const matchEntry = {
          id: matchId,
          type,
          buyId: pos.id,
          sellId: id,
          qty: take,
          buyPriceCents: pos.priceCents,
          sellPriceCents: priceCents,
          profitCents: profit,
          date: ts,
        };
        store.matches.matches.push(matchEntry);
        createdMatches.push(matchEntry);
      }

      if (remainingToMatch > 0) {
        // Unmatched sell (short position). We retain the remainder as negative position.
        unmatchedSellQty = remainingToMatch;
        store.positions.positions.push({
          id: `${id}-short`,
          type,
          qtyRemaining: -remainingToMatch,
          priceCents,
          date: ts,
        });
      }

      // Remove fully consumed positions (qtyRemaining === 0)
      store.positions.positions = store.positions.positions.filter(p => p.qtyRemaining !== 0);
    } else {
      throw new Error('side must be "buy" or "sell"');
    }

    // Persist updates
    this._writeAll(store);

    // Build metadata
    const remainingPositions = store.positions.positions
      .filter(p => p.type === type)
      .map(p => ({ id: p.id, qtyRemaining: p.qtyRemaining, priceCents: p.priceCents, date: p.date }));

    const summary = {
      success: true,
      side,
      type,
      quantity,
      priceCents,
      matchMode,
      realizedProfitCents,
      realizedProfitUsd: +( (realizedProfitCents / 100).toFixed(2) ),
      unmatchedSellQty,
      remainingPositions,
      matches: createdMatches,
    };

    return summary;
  }
}

module.exports = { TransactionsService };
