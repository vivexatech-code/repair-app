/**
 * Build lighter Cloudinary delivery URLs: f_auto, q_auto, optional dimensions.
 * Non-Cloudinary URLs are returned unchanged.
 */
export function optimizeCloudinaryUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const { width, height, quality = 'auto' } = options;

  if (!trimmed.includes('res.cloudinary.com')) {
    return trimmed;
  }

  const marker = '/upload/';
  const idx = trimmed.indexOf(marker);
  if (idx === -1) return trimmed;

  const afterUpload = trimmed.slice(idx + marker.length);
  const firstSeg = afterUpload.split('/')[0] || '';
  if (
    firstSeg.includes('f_auto') ||
    firstSeg.includes('q_auto') ||
    /^w_\d+/.test(firstSeg) ||
    /^h_\d+/.test(firstSeg) ||
    /^c_/.test(firstSeg)
  ) {
    return trimmed;
  }

  const transforms = ['f_auto', quality === 'auto' ? 'q_auto' : `q_${quality}`];
  if (width) {
    transforms.push(`w_${Math.round(width)}`);
    transforms.push('c_limit');
  }
  if (height) {
    transforms.push(`h_${Math.round(height)}`);
    if (!width) transforms.push('c_limit');
  }

  const prefix = trimmed.slice(0, idx + marker.length);
  return `${prefix}${transforms.join(',')}/${afterUpload}`;
}
