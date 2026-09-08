/**
 * Normalize a service variation from Firestore / admin (flexible field names).
 * @param {object} v
 * @param {number} index
 * @returns {{ id: string, title: string, price: number, imageUrl: string } | null}
 */
export function normalizeServiceVariation(v, index = 0) {
  if (!v || typeof v !== 'object') return null;
  const idRaw = v.id ?? v.variationId;
  const id =
    idRaw != null && String(idRaw).trim()
      ? String(idRaw).trim()
      : `var-${index}`;
  const title =
    String(v.title ?? v.name ?? '').trim() || `Option ${index + 1}`;
  const price = Number(v.price ?? v.amount ?? 0);
  const safePrice = Number.isFinite(price) ? price : 0;
  const imageUrl = String(v.imageUrl ?? v.image ?? '').trim();
  const ratingRaw = v.rating ?? v.stars ?? v.avgRating ?? v.starRating;
  const ratingNum = Number(ratingRaw);
  const rating =
    ratingRaw != null && Number.isFinite(ratingNum) && ratingNum > 0
      ? ratingNum
      : null;
  const mrp = Number(
    v.originalPrice ?? v.mrp ?? v.oldPrice ?? v.listPrice ?? v.compareAtPrice ?? 0,
  );
  const originalPrice =
    Number.isFinite(mrp) && mrp > safePrice ? mrp : null;
  return {
    id,
    title,
    price: safePrice,
    imageUrl,
    rating,
    originalPrice,
  };
}

export function listNormalizedVariations(service) {
  const raw = Array.isArray(service?.variations) ? service.variations : [];
  return raw
    .map((v, i) => normalizeServiceVariation(v, i))
    .filter(Boolean);
}

/** Positive finite prices from normalized variations only. */
export function getVariationPositivePrices(variations) {
  if (!Array.isArray(variations)) return [];
  return variations
    .map((v) => Number(v?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
}

/**
 * Min/max for catalog UX & filters. Uses variation prices; falls back to service.price.
 */
export function getServicePriceBounds(service) {
  const hasVar = service?.hasVariations === true;
  const vars = listNormalizedVariations(service);
  const base = Number(service?.price) || 0;
  if (!hasVar || vars.length === 0) {
    const p = base;
    return { min: p, max: p };
  }
  const nums = getVariationPositivePrices(vars);
  if (nums.length === 0) {
    const p = base > 0 ? base : 0;
    return { min: p, max: p };
  }
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/**
 * Price label for lists/cards — never "₹0" when variations exist; uses range or fallback copy.
 */
export function getServicePriceListLabel(service) {
  const hasVar = service?.hasVariations === true;
  const vars = listNormalizedVariations(service);
  const { min, max } = getServicePriceBounds(service);
  const roundedMin = Math.round(min);
  const roundedMax = Math.round(max);
  if (hasVar && vars.length > 0) {
    if (roundedMin > 0 && roundedMax > 0) {
      if (roundedMin === roundedMax) return `₹${roundedMin}`;
      return `₹${roundedMin} – ₹${roundedMax}`;
    }
    return 'See options';
  }
  if (roundedMin > 0) return `₹${roundedMin}`;
  return 'See details';
}

/** Build stable cart line id from service + variation ids with quantities. */
export function buildCartLineIdFromSelections(serviceId, selectedVariations) {
  const sid = String(serviceId ?? '');
  if (!Array.isArray(selectedVariations) || selectedVariations.length === 0) {
    return sid;
  }
  const parts = [...selectedVariations]
    .map((x) => {
      const id = String(x.variationId ?? x.id ?? '').trim();
      if (!id) return '';
      const q = Math.max(0, Math.round(Number(x.quantity) || 0));
      const qty = q > 0 ? q : 1;
      return `${id}:${qty}`;
    })
    .filter(Boolean)
    .sort();
  if (!parts.length) return sid;
  return `${sid}::${parts.join('|')}`;
}

/** @deprecated use buildCartLineIdFromSelections for multi-select */
export function buildCartLineId(serviceId, variationId) {
  if (variationId != null && String(variationId).length) {
    return buildCartLineIdFromSelections(serviceId, [
      { variationId: String(variationId) },
    ]);
  }
  return String(serviceId ?? '');
}

/** Normalize to cart / API row shape (variationId, title, price, quantity). */
export function toCartVariationRow(v) {
  const id = String(v?.variationId ?? v?.id ?? '').trim();
  const rawQ = Number(v?.quantity);
  const quantity =
    Number.isFinite(rawQ) && rawQ > 0 ? Math.round(rawQ) : 1;
  return {
    variationId: id,
    title: String(v?.title ?? '').trim(),
    price: Number(v?.price) || 0,
    quantity,
    ...(v?.imageUrl ? { imageUrl: String(v.imageUrl) } : {}),
  };
}

/** Merge rows by variationId (sum quantities). Drops zero-qty rows. */
export function dedupeCartVariations(rows) {
  if (!Array.isArray(rows)) return [];
  const map = new Map();
  for (const r of rows) {
    const id = String(r?.variationId ?? r?.id ?? '').trim();
    if (!id) continue;
    const base = toCartVariationRow({ ...r, variationId: id });
    const rawQ = Number(r?.quantity);
    const addQ =
      Number.isFinite(rawQ) && rawQ > 0 ? Math.round(rawQ) : base.quantity;
    const prev = map.get(id);
    if (prev) {
      map.set(id, {
        ...prev,
        quantity: prev.quantity + addQ,
      });
    } else {
      map.set(id, { ...base, quantity: addQ });
    }
  }
  return Array.from(map.values()).filter((x) => x.quantity > 0);
}

/** Support legacy cart lines that used a single `selectedVariation`. */
export function getLineSelectedVariations(line) {
  if (Array.isArray(line?.selectedVariations) && line.selectedVariations.length) {
    return line.selectedVariations;
  }
  const one = line?.selectedVariation;
  if (one && (one.id != null || one.variationId != null || one.title)) {
    return [toCartVariationRow({ ...one, variationId: one.variationId ?? one.id })];
  }
  return [];
}

export function getLineDisplayTitle(line) {
  const vars = getLineSelectedVariations(line);
  if (vars.length === 0) return line.name;
  if (vars.length === 1) {
    const q = Number(vars[0].quantity) || 1;
    const t = vars[0].title;
    if (q > 1) return `${line.name} · ${t} × ${q}`;
    return `${line.name} · ${t}`;
  }
  return `${line.name} · ${vars.length} options`;
}

export function getLineSelectedSummaryText(line) {
  const vars = getLineSelectedVariations(line);
  if (vars.length <= 1) return null;
  return vars
    .map((v) => {
      const q = Number(v.quantity) || 1;
      return q > 1 ? `${v.title} × ${q}` : v.title;
    })
    .filter(Boolean)
    .join(' · ');
}
