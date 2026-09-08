import { useCallback, useEffect, useState } from 'react';
import { fetchCategories, subscribeCategories } from '../services/serviceCatalogService';
import { loadCategoriesCache, saveCategoriesCache } from '../utils/appDataCache';

export function useCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchCategories();
      setCategories(Array.isArray(rows) ? rows : []);
      await saveCategoriesCache(rows);
    } catch (e) {
      setError(e?.message || 'Could not load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await loadCategoriesCache();
      if (!mounted || !cached?.length) return;
      setCategories(Array.isArray(cached) ? cached : []);
      setLoading(false);
    })();

    const unsub = subscribeCategories(
      (rows) => {
        if (!mounted) return;
        setCategories(Array.isArray(rows) ? rows : []);
        setError(null);
        setLoading(false);
        saveCategoriesCache(rows);
      },
      (e) => {
        if (!mounted) return;
        setError(e?.message || 'Could not load categories');
        setLoading(false);
      },
    );
    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  return { categories, loading, error, refresh };
}
