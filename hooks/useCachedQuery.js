// hooks/useCachedQuery.js
import { useState, useEffect, useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import CacheService from '../services/CacheService';

export const useCachedQuery = (query, params = [], options = {}) => {
  const db = useSQLiteContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    enabled = true,
    ttl = 5 * 60 * 1000, // 5 minutos
    staleTime = 30 * 1000, // 30 segundos
    onSuccess,
    onError
  } = options;

  const cacheKey = CacheService.generateKey(query, params);

  const fetchData = useCallback(
    async (forceRefresh = false) => {
      if (!db || !enabled) return;

      try {
        setLoading(true);
        setError(null);

        // Verifica cache primeiro
        if (!forceRefresh) {
          const cachedData = await CacheService.get(cacheKey);
          if (cachedData) {
            setData(cachedData);
            setLoading(false);

            // Verifica se precisa atualizar em background
            const cacheData = CacheService.memoryCache.get(cacheKey);
            if (cacheData && Date.now() - cacheData.timestamp > staleTime) {
              // Atualiza em background
              fetchFreshData();
            }

            return;
          }
        }

        // Busca dados frescos
        await fetchFreshData();
      } catch (err) {
        setError(err.message);
        if (onError) onError(err);
      } finally {
        setLoading(false);
      }
    },
    [db, enabled, query, params, cacheKey, ttl, staleTime]
  );

  const fetchFreshData = async () => {
    const result = await db.getAllAsync(query, params);
    setData(result);

    // Salva no cache
    await CacheService.set(cacheKey, result, ttl);

    if (onSuccess) onSuccess(result);
  };

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await CacheService.remove(cacheKey);
  }, [cacheKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate
  };
};

// Hook para invalidar queries relacionadas
export const useQueryInvalidation = () => {
  const invalidateQueries = useCallback(async pattern => {
    await CacheService.invalidatePattern(pattern);
  }, []);

  const invalidateAll = useCallback(async () => {
    await CacheService.clear();
  }, []);

  return {
    invalidateQueries,
    invalidateAll
  };
};
