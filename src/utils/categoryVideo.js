export function isPlayableVideoUrl(raw) {
  const url = String(raw || '').trim();
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be') || host.includes('vimeo.com')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function shouldShowCategoryVideo(category) {
  if (!category || category.videoEnabled === false) return false;
  return isPlayableVideoUrl(category.videoUrl);
}
