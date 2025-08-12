// services/TransactionService.js
import { useSQLiteContext } from 'expo-sqlite';

export class TransactionService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Executa múltiplas operações em uma transação
   * @param {Function} operations - Função que contém as operações
   * @returns {Promise<any>} - Resultado da transação
   */
  async executeTransaction(operations) {
    try {
      await this.db.execAsync('BEGIN TRANSACTION');

      const result = await operations(this.db);

      await this.db.execAsync('COMMIT');
      return { success: true, result };
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Erro na transação:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Insere múltiplos registros em lote
   * @param {string} table - Nome da tabela
   * @param {Array} records - Array de registros
   * @param {Array} columns - Colunas a inserir
   */
  async batchInsert(table, records, columns) {
    if (!records || records.length === 0) return;

    const placeholders = columns.map(() => '?').join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;

    return this.executeTransaction(async db => {
      const results = [];

      for (const record of records) {
        const values = columns.map(col => record[col]);
        const result = await db.runAsync(query, values);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Atualiza múltiplos registros em lote
   * @param {string} table - Nome da tabela
   * @param {Array} updates - Array de { id, data }
   */
  async batchUpdate(table, updates) {
    return this.executeTransaction(async db => {
      const results = [];

      for (const { id, data } of updates) {
        const columns = Object.keys(data);
        const values = Object.values(data);
        const setClause = columns.map(col => `${col} = ?`).join(', ');

        const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
        const result = await db.runAsync(query, [...values, id]);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Deleta múltiplos registros em lote
   * @param {string} table - Nome da tabela
   * @param {Array} ids - Array de IDs
   */
  async batchDelete(table, ids) {
    if (!ids || ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(', ');
    const query = `DELETE FROM ${table} WHERE id IN (${placeholders})`;

    return this.executeTransaction(async db => {
      return await db.runAsync(query, ids);
    });
  }
}

// Hook para usar o serviço de transações
export const useTransactionService = () => {
  const db = useSQLiteContext();
  return new TransactionService(db);
};
