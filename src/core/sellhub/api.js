// Node 18+ provides a global fetch; no external dependency required

class SellhubAPI {
  constructor(apiKey, { baseUrl = 'https://api.sellhub.app/v1', timeout = 15000, authScheme = 'auto' } = {}) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.timeout = timeout;
    // authScheme: 'auto' | 'raw' | 'bearer'
    this.authScheme = authScheme;
  }

  _headersForScheme(scheme) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (scheme === 'bearer') headers['Authorization'] = `Bearer ${this.apiKey}`;
    else headers['Authorization'] = this.apiKey; // default raw
    return headers;
  }

  async _fetch(method, path, body, scheme) {
    const url = `${this.baseUrl}${path}`;
    const opts = { method, headers: this._headersForScheme(scheme) };
    if (body !== undefined) opts.body = JSON.stringify(body);
    try {
      const res = await fetch(url, opts);
      let json; try { json = await res.json(); } catch { json = null; }
      return { res, json, url };
    } catch (e) {
      const err = new Error(`Fetch failed: ${e.message}`);
      err.cause = e.cause || e;
      // Bubble up useful diagnostics
      err.code = e.cause?.code || e.code;
      err.errno = e.cause?.errno || e.errno;
      err.syscall = e.cause?.syscall || e.syscall;
      try { err.hostname = new URL(this.baseUrl).hostname; } catch {}
      throw err;
    }
  }

  async _request(method, path, body) {
    const trySchemes = this.authScheme === 'bearer' ? ['bearer'] : this.authScheme === 'raw' ? ['raw'] : ['raw', 'bearer'];
    let last;
    for (const scheme of trySchemes) {
      let res, json, url;
      try {
        ({ res, json, url } = await this._fetch(method, path, body, scheme));
      } catch (e) {
        // Network/transport error; stop retry loop and rethrow with context
        e.scheme = scheme;
        throw e;
      }
      if (res.ok) return json;
      last = { res, json, url, scheme };
      if (!(res.status === 401 || res.status === 403)) break; // only retry auth errors
    }
    const { res, json, url, scheme } = last || {};
    const message = (json && (json.message || json.error)) || (res ? `HTTP ${res.status}` : 'Request failed');
    const err = new Error(`Sellhub ${method} ${path} failed: ${message}`);
    if (res) err.status = res.status; err.data = json; err.url = url; err.scheme = scheme; throw err;
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