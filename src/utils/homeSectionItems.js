import { splitComingSoonByCategory } from './comingSoonCategory';

/**
 * Resolve catalog items for a CMS home section.
 * Shared contract with admin `homeSections` + website resolver.
 */
export function getHomeSectionMaxItems(section) {
  const maxItems = Number(section?.maxItems) || 0;
  if (maxItems > 0) return maxItems;
  const columns = Math.max(1, Number(section?.columns) || 1);
  const rows = Number(section?.rows) || 0;
  if (section?.layout === 'grid' && rows > 0) return columns * rows;
  return 50;
}

export function resolveHomeSectionItems(section, { categories = [], services = [], comingSoon = [] } = {}) {
  if (!section || section.contentType === 'static') return [];

  const mode = String(section.selectionMode || 'all');
  const max = getHomeSectionMaxItems(section);
  const ids = Array.isArray(section.itemIds) ? section.itemIds.map(String) : [];

  if (section.contentType === 'categories') {
    const active = (categories || []).filter((c) => c.active !== false && c.isActive !== false);
    if (mode === 'manual') {
      const map = new Map(active.map((c) => [String(c.id), c]));
      return ids.map((id) => map.get(id)).filter(Boolean).slice(0, max);
    }
    return active.slice(0, max);
  }

  if (section.contentType === 'services') {
    const activeServices = (services || []).filter(
      (s) => String(s.status || 'Active') === 'Active',
    );
    const soon = Array.isArray(comingSoon) ? comingSoon : [];
    const { main, commercial } = splitComingSoonByCategory(soon);

    let pool = activeServices;
    if (mode === 'featured') {
      const featured = activeServices.filter((s) => s.featured || s.isFeatured);
      pool = featured.length > 0 ? featured : activeServices;
    } else if (mode === 'coming_soon') {
      pool = soon;
    } else if (mode === 'coming_soon_main') {
      pool = main;
    } else if (mode === 'coming_soon_commercial') {
      pool = commercial;
    } else if (mode === 'manual') {
      const all = [...activeServices, ...soon];
      const map = new Map(all.map((s) => [String(s.id), s]));
      return ids.map((id) => map.get(id)).filter(Boolean).slice(0, max);
    }

    return pool.slice(0, max);
  }

  return [];
}

export function filterHomeSectionsForPlatform(sections, platform = 'app') {
  const key = platform === 'website' ? 'showOnWebsite' : 'showOnApp';
  return (Array.isArray(sections) ? sections : [])
    .filter((s) => s && s.enabled !== false && s[key] !== false)
    .sort((a, b) => {
      const oa = Number(a.displayOrder ?? 0);
      const ob = Number(b.displayOrder ?? 0);
      if (oa !== ob) return oa - ob;
      return String(a.title || '').localeCompare(String(b.title || ''));
    });
}
