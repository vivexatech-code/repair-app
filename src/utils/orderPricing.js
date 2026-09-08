import { calculateDiscount } from '../services/couponService';

/**
 * One cart line total: (service price × qty) + visiting charge (once per line, not × qty).
 */
export function getLineSubtotal(line) {
  const p = Number(line?.price) || 0;
  const v = Number(line?.visitingCharge) || 0;
  const q = Number(line?.quantity) || 0;
  return p * q + v;
}

export function getServicesSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum, i) => sum + (Number(i?.price) || 0) * (Number(i?.quantity) || 0),
    0,
  );
}

/** Sum of visiting charges: one per line item (not multiplied by quantity). */
export function getVisitingChargeTotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce(
    (sum, i) => sum + (Number(i?.visitingCharge) || 0),
    0,
  );
}

export function getOrderSubtotal(items) {
  return getServicesSubtotal(items) + getVisitingChargeTotal(items);
}

/**
 * @param {object|null} appliedCoupon
 * @param {{ includeVisiting?: boolean }} [options] — default true (checkout). false = cart preview (services only).
 */
export function getOrderPricing(items, appliedCoupon, options = {}) {
  const includeVisiting = options.includeVisiting !== false;
  const servicesSubtotal = getServicesSubtotal(items);
  const fullVisitingTotal = getVisitingChargeTotal(items);
  const visitingChargeTotal = includeVisiting ? fullVisitingTotal : 0;
  const orderSubtotal = includeVisiting
    ? servicesSubtotal + fullVisitingTotal
    : servicesSubtotal;
  const discountAmount = calculateDiscount(orderSubtotal, appliedCoupon);
  const finalTotal = Math.max(0, orderSubtotal - discountAmount);
  return {
    servicesSubtotal,
    visitingChargeTotal,
    orderSubtotal,
    discountAmount,
    finalTotal,
  };
}

/** How much discount (₹) applies to each line (same order as `items`). */
function allocateDiscountRupees(discountTotal, lineSubtotals) {
  const sum = lineSubtotals.reduce((a, b) => a + b, 0);
  const d = Math.min(
    Math.max(0, Math.round(Number(discountTotal) || 0)),
    Math.max(0, sum),
  );
  if (d <= 0 || !lineSubtotals.length || sum <= 0) {
    return lineSubtotals.map(() => 0);
  }
  const exact = lineSubtotals.map((ls) => (ls / sum) * d);
  const base = exact.map((x) => Math.floor(x));
  let rem = d - base.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...base];
  let k = 0;
  const maxK = order.length * (d + 2);
  while (rem > 0 && k < maxK) {
    const idx = order[k % order.length].i;
    if (out[idx] < lineSubtotals[idx]) {
      out[idx] += 1;
      rem -= 1;
    }
    k += 1;
  }
  return out;
}

/** Final payable rupee amount per cart line after order-level discount. */
export function getPayableAmountsPerLine(items, discountTotal) {
  const lineSubs = items.map(getLineSubtotal);
  const sum = lineSubs.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    return lineSubs.map(() => 0);
  }
  const discountParts = allocateDiscountRupees(discountTotal, lineSubs);
  return lineSubs.map((ls, i) => Math.max(0, ls - discountParts[i]));
}
