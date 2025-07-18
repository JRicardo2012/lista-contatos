// hooks/useDatabaseSafety.js
// Hook para verificar se o banco está pronto antes de executar operações

import { useState, useEffect } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

export const useDatabaseSafety = () => {
  const db = useSQLiteContext();
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (db) {
      verifyDatabase();
    }
  }, [db]);

  const verifyDatabase = async () => {
    try {
      console.log('🔍 Verificando integridade do banco...');
      
      // Testa se consegue acessar as tabelas principais
      await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
      await db.getFirstAsync('SELECT COUNT(*) as count FROM payment_methods');
      await db.getFirstAsync('SELECT COUNT(*) as count FROM expenses');
      await db.getFirstAsync('SELECT COUNT(*) as count FROM establishments');
      
      console.log('✅ Banco verificado e funcionando');
      setIsReady(true);
      setError(null);
      
    } catch (error) {
      console.error('❌ Erro na verificação do banco:', error);
      setError(error.message);
      setIsReady(false);
    }
  };

  const safeQuery = async (query, params = []) => {
    if (!isReady) {
      throw new Error('Banco de dados não está pronto');
    }
    
    try {
      return await db.getAllAsync(query, params);
    } catch (error) {
      console.error('❌ Erro na query:', error);
      throw error;
    }
  };

  const safeRun = async (query, params = []) => {
    if (!isReady) {
      throw new Error('Banco de dados não está pronto');
    }
    
    try {
      return await db.runAsync(query, params);
    } catch (error) {
      console.error('❌ Erro no comando:', error);
      throw error;
    }
  };

  const safeGetFirst = async (query, params = []) => {
    if (!isReady) {
      throw new Error('Banco de dados não está pronto');
    }
    
    try {
      return await db.getFirstAsync(query, params);
    } catch (error) {
      console.error('❌ Erro no getFirst:', error);
      throw error;
    }
  };

  return {
    isReady,
    error,
    safeQuery,
    safeRun,
    safeGetFirst,
    verifyDatabase
  };
};

export default useDatabaseSafety;