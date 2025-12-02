const path = require('path');
const fs = require('fs');
const { AnalyticsEngine } = require('./engine');

/**
 * Functional dashboard data accessor to keep core website-ready.
 * @returns {Promise<object>} JSON-compatible data
 */
async function getDashboardData(options = {}) {
  const engine = new AnalyticsEngine(options);
  return engine.getDashboardData();
}

/**
 * Structured report (sections) for web/API.
 */
async function getReport(options = {}) {
  const engine = new AnalyticsEngine(options);
  return engine.buildReport();
}

module.exports = { getDashboardData, getReport };
