// services/CacheService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class CacheService {
  constructor() {
    this.memoryCache = new Map();
    this.cachePrefix = '@ExpenseApp:cache:';
    this.defaultTTL = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Gera chave única para a query
   */
  generateKey(query, params = []) {
    const queryKey = query.replace(/\s+/g, ' ').trim();
    const paramsKey = JSON.stringify(params);
    return `${queryKey}:${paramsKey}`;
  }

  /**
   * Salva no cache
   */
  async set(key, data, ttl = this.defaultTTL) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      ttl
    };

    // Salva na memória
    this.memoryCache.set(key, cacheData);

    // Salva no AsyncStorage para persistência
    try {
      await AsyncStorage.setItem(this.cachePrefix + key, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
    }
  }

  /**
   * Busca do cache
   */
  async get(key) {
    // Verifica memória primeiro
    const memoryData = this.memoryCache.get(key);
    if (memoryData && this.isValid(memoryData)) {
      return memoryData.data;
    }

    // Busca do AsyncStorage
    try {
      const storageData = await AsyncStorage.getItem(this.cachePrefix + key);
      if (storageData) {
        const parsed = JSON.parse(storageData);
        if (this.isValid(parsed)) {
          // Atualiza memória
          this.memoryCache.set(key, parsed);
          return parsed.data;
        } else {
          // Remove se expirado
          await this.remove(key);
        }
      }
    } catch (error) {
      console.warn('Erro ao buscar cache:', error);
    }

    return null;
  }

  /**
   * Verifica se o cache ainda é válido
   */
  isValid(cacheData) {
    const now = Date.now();
    return now - cacheData.timestamp < cacheData.ttl;
  }

  /**
   * Remove do cache
   */
  async remove(key) {
    this.memoryCache.delete(key);
    try {
      await AsyncStorage.removeItem(this.cachePrefix + key);
    } catch (error) {
      console.warn('Erro ao remover cache:', error);
    }
  }

  /**
   * Limpa todo o cache
   */
  async clear() {
    this.memoryCache.clear();

    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.cachePrefix));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }

  /**
   * Invalida cache por padrão
   */
  async invalidatePattern(pattern) {
    // Remove da memória
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    // Remove do AsyncStorage
    try {
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(
        key => key.startsWith(this.cachePrefix) && key.includes(pattern)
      );
      await AsyncStorage.multiRemove(matchingKeys);
    } catch (error) {
      console.warn('Erro ao invalidar cache:', error);
    }
  }
}

export default new CacheService();
