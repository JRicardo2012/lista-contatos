import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'expenseManager_v3.db';

export async function openDatabase() {
  console.log('✅ Chamando openDatabase() com nova API');

  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    console.log('📁 Banco aberto com sucesso:', DATABASE_NAME);

    // Configura foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON');

    return db;
  } catch (error) {
    console.error('❌ Erro ao abrir banco:', error);
    throw error;
  }
}
