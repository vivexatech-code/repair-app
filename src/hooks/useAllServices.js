import { useCallback, useEffect, useState } from 'react';
import {
  fetchAllServices,
  subscribeAllServices,
} from '../services/serviceCatalogService';

export function useAllServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllServices();
      setServices(Array.isArray(rows) ? rows : []);
    } catch (e) {
      setError(e?.message || 'Could not load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsub = subscribeAllServices(
      (rows) => {
        if (!mounted) return;
        setServices(Array.isArray(rows) ? rows : []);
        setError(null);
        setLoading(false);
      },
      (e) => {
        if (!mounted) return;
        setError(e?.message || 'Could not load services');
        setLoading(false);
      },
    );
    refresh();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, [refresh]);

  return { services, loading, error, refresh };
}
