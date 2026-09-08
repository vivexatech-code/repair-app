/** Promo banner placement keys — keep in sync with adminpanel-repairseries catalog. */
export const BANNER_SECTIONS = Object.freeze([
  { id: 'home', label: 'Home' },
  { id: 'offers', label: 'Offers' },
  { id: 'services', label: 'Services' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'account', label: 'Account' },
  { id: 'cart', label: 'Cart' },
  { id: 'search', label: 'Search' },
  { id: 'category', label: 'Category page' },
  { id: 'service_details', label: 'Service details' },
  { id: 'popular_services', label: 'Popular Services' },
  { id: 'featured', label: 'Featured Services' },
  { id: 'categories', label: 'Categories (home)' },
  { id: 'coming_soon', label: 'Coming Soon' },
  { id: 'coming_soon_main', label: 'Coming Soon — Main' },
  { id: 'coming_soon_commercial', label: 'Coming Soon — Commercial' },
  { id: 'ac', label: 'AC' },
  { id: 'washing_machine', label: 'Washing Machine' },
  { id: 'kitchen_appliances', label: 'Kitchen Appliances' },
  { id: 'cleaning', label: 'Cleaning' },
  { id: 'commercial', label: 'Commercial' },
]);

export const BANNER_SECTION_IDS = BANNER_SECTIONS.map((s) => s.id);

/** Category-themed placements that map from a live category name/slug/id. */
export const THEMED_BANNER_SECTION_IDS = Object.freeze([
  'ac',
  'washing_machine',
  'kitchen_appliances',
  'cleaning',
  'commercial',
]);

const BANNER_SECTION_ALIASES = {
  homepage: 'home',
  home_page: 'home',
  home_featured: 'featured',
  offer: 'offers',
  promo: 'offers',
  service: 'services',
  booking: 'bookings',
  my_bookings: 'bookings',
  profile: 'account',
  category_page: 'category',
  category_services: 'category',
  service_detail: 'service_details',
  servicedetails: 'service_details',
  popular: 'popular_services',
  featured_services: 'featured',
  comingsoon: 'coming_soon',
  coming_soon_home: 'coming_soon_main',
  ac_service: 'ac',
  ac_repair: 'ac',
  acservice: 'ac',
  air_conditioner: 'ac',
  air_conditioning: 'ac',
  airconditioner: 'ac',
  washingmachine: 'washing_machine',
  washer: 'washing_machine',
  laundry: 'washing_machine',
  kitchen: 'kitchen_appliances',
  kitchen_appliance: 'kitchen_appliances',
  appliance: 'kitchen_appliances',
  appliances: 'kitchen_appliances',
  appliance_repair: 'kitchen_appliances',
  deep_cleaning: 'cleaning',
  house_cleaning: 'cleaning',
};

export function normalizeBannerSection(raw) {
  const s = String(raw || 'home')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  return BANNER_SECTION_ALIASES[s] || s || 'home';
}

export function uniqueBannerSections(list) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    const id = normalizeBannerSection(raw);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function tokensFromCategory(raw) {
  if (raw == null || raw === '') return [];
  if (typeof raw === 'string' || typeof raw === 'number') {
    return [normalizeBannerSection(raw)];
  }
  const values = [
    raw.id,
    raw.categoryId,
    raw.category_id,
    raw.slug,
    raw.categorySlug,
    raw.name,
    raw.title,
    raw.categoryName,
    raw.category,
    raw.comingSoonCategory,
  ];
  return values.filter((v) => v != null && String(v).trim() !== '').map((v) => normalizeBannerSection(v));
}

/**
 * Resolve Admin banner section IDs for a live category (or category-like object).
 * Always includes `extra` first (e.g. `category` / `service_details`).
 */
export function resolveBannerSectionsForCategory(category, extra = []) {
  const matched = [];
  for (const token of tokensFromCategory(category)) {
    if (THEMED_BANNER_SECTION_IDS.includes(token)) {
      matched.push(token);
      continue;
    }
    for (const id of THEMED_BANNER_SECTION_IDS) {
      if (token === id || token.startsWith(`${id}_`)) matched.push(id);
    }
  }
  return uniqueBannerSections([...(Array.isArray(extra) ? extra : [extra]), ...matched]);
}

/** Map a CMS home block to the Admin banner section IDs it should display. */
export function bannerSectionsForHomeCmsSection(section) {
  const type = String(section?.contentType || '');
  const mode = String(section?.selectionMode || '');
  if (type === 'categories') return ['categories'];
  if (mode === 'featured') return ['featured'];
  if (mode === 'coming_soon_main') return ['coming_soon_main', 'coming_soon'];
  if (mode === 'coming_soon_commercial') return ['coming_soon_commercial'];
  if (mode === 'coming_soon') return ['coming_soon'];
  if (type === 'services') return ['popular_services'];
  return [];
}

export function bannersForSectionKeys(sectionBanners, keys) {
  const wanted = uniqueBannerSections(keys);
  if (!wanted.length || !sectionBanners || typeof sectionBanners !== 'object') return [];
  const seen = new Set();
  const out = [];
  for (const key of wanted) {
    const rows = sectionBanners[key];
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const id = row?.id;
      if (id && seen.has(id)) continue;
      if (id) seen.add(id);
      if (row?.image || row?.imageUrl) out.push(row);
    }
  }
  return out.sort(
    (a, b) => Number(a.displayOrder ?? a.order ?? 999) - Number(b.displayOrder ?? b.order ?? 999),
  );
}

export function bannerSectionsForComingSoon(service) {
  const raw = String(service?.comingSoonCategory || '').trim().toLowerCase();
  if (raw === 'commercial' || raw === 'commercial services') {
    return ['coming_soon_commercial', 'coming_soon'];
  }
  return ['coming_soon_main', 'coming_soon'];
}
