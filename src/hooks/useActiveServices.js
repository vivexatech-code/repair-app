import { useCallback, useEffect, useState } from 'react';
import { fetchActiveServices } from '../services/serviceCatalogService';

export function useActiveServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchActiveServices();
      setServices(rows);
    } catch (e) {
      setError(e?.message || 'Could not load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { services, loading, error, refresh };
}
