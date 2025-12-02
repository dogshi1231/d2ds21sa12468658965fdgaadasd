// Website-ready, pure JSON helpers for Sellhub products
// Each function accepts a SellhubAPI instance (api) and returns JSON

async function listProducts(api, query = {}) {
  return api.getProducts(query);
}

async function createProduct(api, payload) {
  return api.createProduct(payload);
}

async function deleteProduct(api, id) {
  return api.deleteProduct(id);
}

async function updateProduct(api, id, payload) {
  return api.updateProduct(id, payload);
}

module.exports = { listProducts, createProduct, deleteProduct, updateProduct };
