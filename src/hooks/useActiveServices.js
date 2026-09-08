import { useCallback, useEffect, useState } from 'react';
import {
  fetchActiveServices,
  subscribeActiveServices,
} from '../services/serviceCatalogService';
import { loadServicesCache, saveServicesCache } from '../utils/appDataCache';

export function useActiveServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchActiveServices();
      setServices(Array.isArray(rows) ? rows : []);
      await saveServicesCache(rows);
    } catch (e) {
      setError(e?.message || 'Could not load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const cached = await loadServicesCache();
      if (!mounted || !cached?.length) return;
      setServices(Array.isArray(cached) ? cached : []);
      setLoading(false);
    })();

    const unsub = subscribeActiveServices(
      (rows) => {
        if (!mounted) return;
        setServices(Array.isArray(rows) ? rows : []);
        setError(null);
        setLoading(false);
        saveServicesCache(rows);
      },
      (e) => {
        if (!mounted) return;
        setError(e?.message || 'Could not load services');
        setLoading(false);
      },
    );
    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  return { services, loading, error, refresh };
}
