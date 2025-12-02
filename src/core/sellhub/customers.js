async function getCustomer(api, id) { return api.getCustomer(id); }
async function listCustomers(api, query = {}) { return api.getCustomers(query); }

module.exports = { getCustomer, listCustomers };
