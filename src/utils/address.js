export function addressMapToString(addr) {
  if (!addr || typeof addr !== 'object') return '';
  if (addr.fullAddress && String(addr.fullAddress).trim()) {
    return String(addr.fullAddress).trim();
  }
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.pincode || addr.postalCode,
  ].filter(Boolean);
  return parts.join(', ');
}

/** Normalize a saved Firestore / GPS address into a stable object shape. */
export function normalizeSavedAddress(raw, fallbackId) {
  if (raw == null) return null;
  if (typeof raw === 'string') {
    const full = raw.trim();
    if (!full) return null;
    return {
      id: fallbackId || `addr_${full.slice(0, 24)}`,
      type: 'Home',
      fullAddress: full,
      city: '',
      state: '',
      pincode: '',
      lat: null,
      lng: null,
      houseFlat: '',
      landmark: '',
    };
  }
  if (typeof raw !== 'object') return null;
  const lat = raw.lat ?? raw.latitude;
  const lng = raw.lng ?? raw.longitude;
  const fullAddress =
    String(raw.fullAddress || '').trim() ||
    addressMapToString(raw) ||
    '';
  if (!fullAddress && lat == null && lng == null) return null;
  return {
    id: raw.id || fallbackId || `addr_${Date.now()}`,
    type: raw.type || 'Home',
    fullAddress:
      fullAddress ||
      (lat != null && lng != null ? `${lat}, ${lng}` : ''),
    city: raw.city != null ? String(raw.city) : '',
    state: raw.state != null ? String(raw.state) : '',
    pincode: String(raw.pincode || raw.postalCode || ''),
    lat: lat != null && Number.isFinite(Number(lat)) ? Number(lat) : null,
    lng: lng != null && Number.isFinite(Number(lng)) ? Number(lng) : null,
    houseFlat: raw.houseFlat != null ? String(raw.houseFlat) : '',
    landmark: raw.landmark != null ? String(raw.landmark) : '',
    line1: raw.line1 != null ? String(raw.line1) : '',
    line2: raw.line2 != null ? String(raw.line2) : '',
  };
}

/** Map a saved address into BookingFlow address fields (keeps state/pincode). */
export function savedAddressToBookingAddress(obj) {
  const n = normalizeSavedAddress(obj);
  if (!n) return null;
  return {
    id: n.id,
    line1: n.line1 || n.fullAddress || '',
    line2: n.line2 || '',
    city: n.city || '',
    state: n.state || '',
    pincode: n.pincode || '',
    lat: n.lat,
    lng: n.lng,
    type: n.type || 'Home',
    fullAddress: n.fullAddress || '',
    houseFlat: n.houseFlat || '',
    landmark: n.landmark || '',
  };
}

export function savedAddressLabel(obj) {
  const n = normalizeSavedAddress(obj);
  if (!n) return '';
  return n.fullAddress || addressMapToString(n) || '';
}

export function extractCityFromAddress(addressString) {
  if (!addressString || typeof addressString !== 'string') return '';
  const parts = addressString.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 2].toLowerCase();
  return parts[0]?.toLowerCase() || '';
}

export function cityFromAddressMap(addr) {
  if (addr?.city) return String(addr.city).toLowerCase().trim();
  return extractCityFromAddress(addressMapToString(addr));
}
