export function addressMapToString(addr) {
  if (!addr || typeof addr !== 'object') return '';
  const parts = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.state,
    addr.pincode,
  ].filter(Boolean);
  return parts.join(', ');
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
