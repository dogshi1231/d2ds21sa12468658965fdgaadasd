async function listInvoices(api, query = {}) { return api.getInvoices(query); }
async function getInvoice(api, id) { return api.getInvoice(id); }
async function refundInvoice(api, id, payload = {}) { return api.refundInvoice(id, payload); }
async function completeInvoice(api, id, payload = {}) { return api.completeInvoice(id, payload); }
async function replaceInvoiceItems(api, id, payload) { return api.replaceInvoiceItems(id, payload); }

module.exports = { listInvoices, getInvoice, refundInvoice, completeInvoice, replaceInvoiceItems };
