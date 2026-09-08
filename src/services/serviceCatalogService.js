import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { SERVICE_STATUS } from '../constants';
import { normalizeBannerSection } from '../constants/bannerSections';

const servicesCol = 'services';
const categoriesCol = 'categories';

/** Cap reads for client bootstrap; raise if catalog grows beyond this. */
const MAX_ACTIVE_SERVICES = 100;
const MAX_CATEGORIES = 80;
const MAX_CATEGORY_SERVICES = 100;
const MAX_OFFERS = 40;
/** Promo banners across all app/website sections — must not silently drop non-home placements. */
const MAX_BANNERS = 200;

function sortCategoriesList(list) {
  if (!Array.isArray(list)) return [];
  const filtered = list.filter((c) => c.active !== false);
  return filtered.sort((a, b) => {
    const oa = Number(a.order ?? 999);
    const ob = Number(b.order ?? 999);
    if (oa !== ob) return oa - ob;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export async function fetchCategories() {
  const snap = await getDocs(
    query(collection(db, categoriesCol), limit(MAX_CATEGORIES)),
  );
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return sortCategoriesList(list);
}

export function subscribeCategories(onNext, onError) {
  return onSnapshot(
    query(collection(db, categoriesCol), limit(MAX_CATEGORIES)),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      onNext(sortCategoriesList(list));
    },
    onError,
  );
}

/**
 * Active services for a category. Requires `categoryId` on service documents.
 */
export function subscribeServicesByCategoryId(categoryId, onNext, onError) {
  if (!categoryId) {
    onNext([]);
    return () => {};
  }
  const q = query(
    collection(db, servicesCol),
    where('categoryId', '==', categoryId),
    where('status', '==', SERVICE_STATUS.ACTIVE),
    limit(MAX_CATEGORY_SERVICES),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      const sorted = list.sort((a, b) =>
        (a.name || '').localeCompare(b.name || ''),
      );
      onNext(sorted);
    },
    onError,
  );
}

export async function fetchActiveServices() {
  const q = query(
    collection(db, servicesCol),
    where('status', '==', SERVICE_STATUS.ACTIVE),
    limit(MAX_ACTIVE_SERVICES),
  );
  const snap = await getDocs(q);
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export function subscribeActiveServices(onNext, onError) {
  const q = query(
    collection(db, servicesCol),
    where('status', '==', SERVICE_STATUS.ACTIVE),
    limit(MAX_ACTIVE_SERVICES),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      const sorted = list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onNext(sorted);
    },
    onError,
  );
}

export async function fetchAllServices() {
  const snap = await getDocs(collection(db, servicesCol));
  const list = [];
  snap.forEach((d) => {
    list.push({ id: d.id, ...d.data() });
  });
  return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

export function subscribeAllServices(onNext, onError) {
  return onSnapshot(
    collection(db, servicesCol),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      const sorted = list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onNext(sorted);
    },
    onError,
  );
}

export async function fetchServiceById(serviceId) {
  const ref = doc(db, servicesCol, serviceId);
  const snap = await getDoc(ref);
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

/** Category label for booking snapshots when only `categoryId` is known. */
export async function fetchCategoryById(categoryId) {
  const id = categoryId != null ? String(categoryId).trim() : '';
  if (!id) return null;
  const snap = await getDoc(doc(db, categoriesCol, id));
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function fetchOfferBanners(section = 'home') {
  const [offersSnap, bannersSnap] = await Promise.all([
    getDocs(query(collection(db, 'offers'), limit(MAX_OFFERS))),
    getDocs(query(collection(db, 'banners'), limit(MAX_BANNERS))),
  ]);
  const fromOffers = [];
  offersSnap.forEach((d) => fromOffers.push({ id: d.id, ...d.data(), _src: 'offers' }));
  const fromBanners = [];
  bannersSnap.forEach((d) => fromBanners.push({ id: d.id, ...d.data(), _src: 'banners' }));
  return normalizePromoBanners([...fromBanners, ...fromOffers], {
    section: section == null ? null : section,
  });
}

/**
 * @param {unknown[]} list
 * @param {{ section?: string|string[]|null }} [opts]
 *   When `section` is set, only that placement is returned.
 *   When omitted, returns all enabled banners (for multi-section consumers).
 */
function normalizePromoBanners(list, opts = {}) {
  const sectionFilter = opts.section;
  const wanted = sectionFilter == null
    ? null
    : new Set(
        (Array.isArray(sectionFilter) ? sectionFilter : [sectionFilter]).map(
          (s) => normalizeBannerSection(s),
        ),
      );

  const now = Date.now();
  const toMillis = (raw) => {
    if (!raw) return null;
    if (typeof raw?.toDate === 'function') {
      const d = raw.toDate();
      return d && !Number.isNaN(d.getTime()) ? d.getTime() : null;
    }
    if (raw?.seconds != null) return Number(raw.seconds) * 1000;
    const t = new Date(raw).getTime();
    return Number.isFinite(t) ? t : null;
  };

  return (Array.isArray(list) ? list : [])
    .map((o) => {
      const section = normalizeBannerSection(
        o.section || (o._src === 'offers' ? 'offers' : 'home'),
      );
      const enabled = o.enabled !== false && o.active !== false;
      const image =
        o.mobileImage ||
        o.image ||
        o.imageUrl ||
        o.websiteImage ||
        '';
      return {
        ...o,
        section,
        enabled,
        image,
        imageUrl: image,
        title: o.title || '',
        redirectLink: o.redirectLink || o.link || '',
        displayOrder: Number(o.displayOrder ?? o.priority ?? 999),
      };
    })
    .filter((o) => o.enabled)
    .filter((o) => {
      const start = toMillis(o.startAt);
      const end = toMillis(o.endAt);
      if (start != null && now < start) return false;
      if (end != null && now > end) return false;
      return true;
    })
    .filter((o) => (wanted ? wanted.has(o.section) : true))
    .filter((o) => Boolean(o.image))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/**
 * One Firestore attachment for banners + legacy offers, shared by every screen.
 */
const bannerListeners = new Set();
let bannerUnsubs = null;
let cachedBannerRaw = null;
let bannerErrorHandler = null;

function attachSharedBannerListeners() {
  if (bannerUnsubs) return;
  let offers = [];
  let banners = [];
  const emit = () => {
    cachedBannerRaw = [...banners, ...offers];
    bannerListeners.forEach((fn) => fn(cachedBannerRaw));
  };
  const unsubOffers = onSnapshot(
    query(collection(db, 'offers'), limit(MAX_OFFERS)),
    (snap) => {
      offers = [];
      snap.forEach((d) => offers.push({ id: d.id, ...d.data(), _src: 'offers' }));
      emit();
    },
    (err) => bannerErrorHandler?.(err),
  );
  const unsubBanners = onSnapshot(
    query(collection(db, 'banners'), limit(MAX_BANNERS)),
    (snap) => {
      banners = [];
      snap.forEach((d) => banners.push({ id: d.id, ...d.data(), _src: 'banners' }));
      emit();
    },
    (err) => bannerErrorHandler?.(err),
  );
  bannerUnsubs = () => {
    unsubOffers?.();
    unsubBanners?.();
    bannerUnsubs = null;
    cachedBannerRaw = null;
  };
}

/**
 * Live banners for one or more placements (home, services, bookings, …).
 * @param {(rows: object[]) => void} onNext
 * @param {(err: Error) => void} [onError]
 * @param {{ section?: string|string[]|null }} [opts] — default `home` (+ offers legacy)
 */
export function subscribeOfferBanners(onNext, onError, opts) {
  const section =
    opts && Object.prototype.hasOwnProperty.call(opts, 'section')
      ? opts.section
      : ['home', 'offers'];

  const listener = (raw) => {
    onNext(normalizePromoBanners(raw, { section }));
  };
  bannerListeners.add(listener);
  if (typeof onError === 'function') bannerErrorHandler = onError;
  attachSharedBannerListeners();
  if (cachedBannerRaw) listener(cachedBannerRaw);

  return () => {
    bannerListeners.delete(listener);
    if (bannerListeners.size === 0 && bannerUnsubs) {
      bannerUnsubs();
      bannerErrorHandler = null;
    }
  };
}

/** Convenience: subscribe banners for a single app section. */
export function subscribeSectionBanners(section, onNext, onError) {
  return subscribeOfferBanners(onNext, onError, { section });
}

/** Visible coming-soon teasers — same `services` collection, status Coming Soon. */
export function subscribeComingSoonServices(onNext, onError) {
  const q = query(
    collection(db, servicesCol),
    where('status', '==', SERVICE_STATUS.COMING_SOON),
    limit(MAX_ACTIVE_SERVICES),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      const visible = list
        .filter((s) => String(s.previewStatus || 'Active') !== 'Inactive')
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      onNext(visible);
    },
    onError,
  );
}

export async function searchServicesByText(searchText) {
  const text = String(searchText || '').trim().toLowerCase();
  if (!text) return [];
  const all = await fetchAllServices();
  return all.filter((s) => {
    const inName = String(s.name || '').toLowerCase().includes(text);
    const inDesc = String(s.description || '').toLowerCase().includes(text);
    const inCategory = String(s.category || '').toLowerCase().includes(text);
    return inName || inDesc || inCategory;
  });
}

const faqsCol = 'faqs';

function sortFaqs(list) {
  return [...list].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
  );
}

export async function fetchFaqs() {
  const snap = await getDocs(collection(db, faqsCol));
  const list = [];
  snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
  return sortFaqs(list);
}

export function subscribeFaqs(onNext, onError) {
  return onSnapshot(
    collection(db, faqsCol),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      onNext(sortFaqs(list));
    },
    onError,
  );
}
