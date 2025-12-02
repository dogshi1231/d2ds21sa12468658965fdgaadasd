async function listVariants(api, productId) { return api.getVariants(productId); }
async function restockVariant(api, variantId, payload) { return api.restockVariant(variantId, payload); }
async function removeStock(api, variantId) { return api.removeAllStock(variantId); }
async function deleteVariant(api, variantId) { return api.deleteVariant(variantId); }

module.exports = { listVariants, restockVariant, removeStock, deleteVariant };
