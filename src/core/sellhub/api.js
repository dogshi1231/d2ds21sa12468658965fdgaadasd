// Node 18+ provides a global fetch; no external dependency required

class SellhubAPI {
  constructor(apiKey, { baseUrl = 'https://api.sellhub.io', timeout = 15000 } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
  }

  headers() {
    return {
      'Authorization': this.apiKey, // Sellhub expects raw key, no Bearer/Basic prefix
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async _request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const opts = {
      method,
      headers: this.headers(),
    };
    if (body !== undefined) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    let json;
    try { json = await res.json(); } catch { json = null; }
    if (!res.ok) {
      const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
      const err = new Error(`Sellhub ${method} ${path} failed: ${message}`);
      err.status = res.status; err.data = json; err.url = url; throw err;
    }
    return json;
  }

  _get(path) { return this._request('GET', path); }
  _post(path, body) { return this._request('POST', path, body); }
  _put(path, body) { return this._request('PUT', path, body); }
  _patch(path, body) { return this._request('PATCH', path, body); }
  _delete(path) { return this._request('DELETE', path); }

  // Store
  getStore() { return this._get('/store'); }
  getStoreDetails() { return this._get('/store/details'); }

  // Blacklists
  createBlacklist(payload) { return this._post('/blacklists', payload); }
  deleteBlacklist(id) { return this._delete(`/blacklists/${id}`); }
  getBlacklists() { return this._get('/blacklists'); }
  updateBlacklist(id, payload) { return this._patch(`/blacklists/${id}`, payload); }

  // Logs
  getAuditLogs(query = {}) { return this._get(`/logs${this._query(query)}`); }

  // Reviews
  getReviews(query = {}) { return this._get(`/reviews${this._query(query)}`); }

  // Team
  getTeam() { return this._get('/team'); }

  // Checkout
  createCheckout(payload) { return this._post('/checkout', payload); }
  processCheckout(id, payload) { return this._post(`/checkout/${id}/process`, payload); }

  // Products
  getProducts(query = {}) { return this._get(`/products${this._query(query)}`); }
  createProduct(payload) { return this._post('/products', payload); }
  deleteProduct(id) { return this._delete(`/products/${id}`); }
  updateProduct(id, payload) { return this._patch(`/products/${id}`, payload); }

  // Bundles
  getBundles(query = {}) { return this._get(`/bundles${this._query(query)}`); }

  // Categories
  getCategories() { return this._get('/categories'); }

  // Coupons
  getCoupons() { return this._get('/coupons'); }
  createCoupon(payload) { return this._post('/coupons', payload); }
  deleteCoupon(id) { return this._delete(`/coupons/${id}`); }

  // Groups
  getGroups() { return this._get('/groups'); }

  // Variants
  getVariants(productId) { return this._get(`/products/${productId}/variants`); }
  deleteVariant(variantId) { return this._delete(`/variants/${variantId}`); }
  restockVariant(variantId, payload) { return this._post(`/variants/${variantId}/restock`, payload); }
  removeAllStock(variantId) { return this._post(`/variants/${variantId}/clear`, {}); }
  removeKeys(variantId, payload) { return this._post(`/variants/${variantId}/remove-keys`, payload); }

  // Customers
  getCustomer(id) { return this._get(`/customers/${id}`); }
  getCustomers(query = {}) { return this._get(`/customers${this._query(query)}`); }

  // Orders / Invoices
  getInvoices(query = {}) { return this._get(`/invoices${this._query(query)}`); }
  getInvoice(id) { return this._get(`/invoices/${id}`); }
  completeInvoice(id, payload = {}) { return this._post(`/invoices/${id}/complete`, payload); }
  refundInvoice(id, payload = {}) { return this._post(`/invoices/${id}/refund`, payload); }
  replaceInvoiceItems(id, payload) { return this._post(`/invoices/${id}/replace-items`, payload); }

  // Helpers
  _query(obj) {
    const entries = Object.entries(obj || {}).filter(([,v]) => v !== undefined && v !== null);
    if (!entries.length) return '';
    const params = new URLSearchParams(entries.map(([k,v]) => [k, String(v)]));
    return `?${params.toString()}`;
  }
}

module.exports = { SellhubAPI };