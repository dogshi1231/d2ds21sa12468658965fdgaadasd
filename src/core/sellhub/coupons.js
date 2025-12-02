async function listCoupons(api) { return api.getCoupons(); }
async function createCoupon(api, payload) { return api.createCoupon(payload); }
async function deleteCoupon(api, id) { return api.deleteCoupon(id); }

module.exports = { listCoupons, createCoupon, deleteCoupon };
