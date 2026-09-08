import { collection, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { filterHomeSectionsForPlatform } from '../utils/homeSectionItems';

const COL = 'homeSections';

/**
 * Subscribe to CMS home sections.
 * @param {(rows: object[]) => void} onNext
 * @param {(err: Error) => void} [onError]
 * @param {{ platform?: 'app'|'website' }} [opts]
 */
export function subscribeHomeSections(onNext, onError, opts = {}) {
  const platform = opts.platform || 'app';
  return onSnapshot(
    collection(db, COL),
    (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      onNext(filterHomeSectionsForPlatform(list, platform));
    },
    (err) => {
      if (typeof onError === 'function') onError(err);
      else onNext([]);
    },
  );
}
