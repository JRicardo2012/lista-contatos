// components/DatabaseInitializer.js - VERSÃO COMPLETA SEM DADOS DO SISTEMA
import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { hashPassword, needsPasswordMigration } from '../utils/crypto';

export default function DatabaseInitializer({ children }) {
 const db = useSQLiteContext();
 const [initialized, setInitialized] = useState(false);
 const [error, setError] = useState(null);

 useEffect(() => {
   if (db && !initialized) {
     setupDatabase();
   }
 }, [db, initialized]);

 const setupDatabase = async () => {
   try {
     console.log('🔧 === INICIALIZANDO BANCO DE DADOS V4 ===');
     
     // 1. FORÇA FOREIGN KEYS
     await db.execAsync('PRAGMA foreign_keys = ON');
     console.log('✅ Foreign keys ativadas');
     
     // 2. CRIA TODAS AS TABELAS
     await createAllTables();
     
     // 3. ATUALIZA ESTRUTURA DO BANCO
     await updateDatabaseStructure();
     
     // 4. MIGRA SENHAS ANTIGAS
     await migratePasswords();
     
     // 5. REMOVE TODOS OS DADOS DO SISTEMA
     await removeSystemData();
     
     // 6. LIMPA DADOS ÓRFÃOS
     await cleanOrphanData();
     
     // 7. VERIFICA TABELAS
     await testTablesAccess();
     
     console.log('🎉 Banco inicializado com sucesso!');
     setInitialized(true);
     
   } catch (error) {
     console.error('❌ ERRO CRÍTICO na inicialização:', error);
     setError(error.message);
   }
 };

 const createAllTables = async () => {
   console.log('🏗️ Criando estrutura de tabelas...');
   
   // Users
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS users (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       email TEXT NOT NULL UNIQUE,
       password TEXT NOT NULL,
       created_at TEXT DEFAULT (datetime('now')),
       last_login TEXT,
       preferences TEXT,
       is_active INTEGER DEFAULT 1
     );
   `);
   console.log('✅ Tabela users criada');
   
   // Categories - COM user_id OBRIGATÓRIO
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS categories (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       icon TEXT DEFAULT '📂',
       user_id INTEGER NOT NULL,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       UNIQUE(name, user_id)
     );
   `);
   console.log('✅ Tabela categories criada');

   // Payment Methods - COM user_id OBRIGATÓRIO
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS payment_methods (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       icon TEXT DEFAULT '💳',
       user_id INTEGER NOT NULL,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
       UNIQUE(name, user_id)
     );
   `);
   console.log('✅ Tabela payment_methods criada');

   // Establishments
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS establishments (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       category TEXT,
       street TEXT,
       number TEXT,
       district TEXT,
       city TEXT,
       state TEXT,
       zipcode TEXT,
       phone TEXT,
       latitude REAL,
       longitude REAL,
       created_at TEXT DEFAULT (datetime('now')),
       user_id INTEGER NOT NULL,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     );
   `);
   console.log('✅ Tabela establishments criada');

   // Locations
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS locations (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       lat REAL NOT NULL,
       lng REAL NOT NULL,
       address TEXT,
       establishment TEXT
     );
   `);
   console.log('✅ Tabela locations criada');

   // Expenses
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS expenses (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       description TEXT NOT NULL,
       amount REAL NOT NULL,
       date TEXT NOT NULL DEFAULT (datetime('now')),
       categoryId INTEGER,
       payment_method_id INTEGER,
       location_id INTEGER,
       establishment_id INTEGER,
       user_id INTEGER NOT NULL,
       FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
       FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
       FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
       FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
     );
   `);
   console.log('✅ Tabela expenses criada');

   // Contacts
   await db.execAsync(`
     CREATE TABLE IF NOT EXISTS contacts (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       name TEXT NOT NULL,
       phone TEXT NOT NULL
     );
   `);
   console.log('✅ Tabela contacts criada');
 };

 const updateDatabaseStructure = async () => {
   console.log('🔄 Atualizando estrutura do banco...');
   
   try {
     // Adiciona user_id como NOT NULL nas tabelas que precisam
     const tables = ['categories', 'payment_methods', 'establishments', 'expenses'];
     
     for (const table of tables) {
       try {
         const columns = await db.getAllAsync(`PRAGMA table_info(${table})`);
         const hasUserId = columns.some(col => col.name === 'user_id');
         
         if (!hasUserId) {
           console.log(`➕ Adicionando user_id em ${table}...`);
           
           // Criar tabela temporária com nova estrutura
           await db.execAsync(`
             CREATE TABLE ${table}_temp AS 
             SELECT * FROM ${table} WHERE 0
           `);
           
           // Adicionar coluna user_id
           await db.execAsync(`
             ALTER TABLE ${table}_temp 
             ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1
           `);
           
           // Remover o default após criação
           // SQLite não permite remover default diretamente, então recriamos
           
           // Dropar tabela antiga
           await db.execAsync(`DROP TABLE ${table}`);
           
           // Renomear tabela temporária
           await db.execAsync(`ALTER TABLE ${table}_temp RENAME TO ${table}`);
           
           console.log(`✅ user_id adicionado em ${table}`);
         }
       } catch (err) {
         console.warn(`⚠️ Erro ao verificar/adicionar user_id em ${table}:`, err.message);
       }
     }

     // Adiciona índices para melhor performance
     await createIndexes();
     
   } catch (error) {
     console.warn('⚠️ Erro ao atualizar estrutura:', error.message);
   }
 };

 const createIndexes = async () => {
   console.log('📇 Criando índices...');
   
   try {
     // Índices para melhor performance
     await db.execAsync(`
       CREATE INDEX IF NOT EXISTS idx_categories_user 
       ON categories(user_id);
       
       CREATE INDEX IF NOT EXISTS idx_payment_methods_user 
       ON payment_methods(user_id);
       
       CREATE INDEX IF NOT EXISTS idx_expenses_user 
       ON expenses(user_id);
       
       CREATE INDEX IF NOT EXISTS idx_expenses_date 
       ON expenses(date);
       
       CREATE INDEX IF NOT EXISTS idx_expenses_category 
       ON expenses(categoryId);
       
       CREATE INDEX IF NOT EXISTS idx_establishments_user 
       ON establishments(user_id);
     `);
     
     console.log('✅ Índices criados');
   } catch (error) {
     console.warn('⚠️ Erro ao criar índices:', error.message);
   }
 };

 const removeSystemData = async () => {
   console.log('🧹 Removendo dados do sistema...');
   
   try {
     // Remove usuário sistema se existir
     const systemUser = await db.getFirstAsync(
       "SELECT id FROM users WHERE email = 'system@default.com'"
     );
     
     if (systemUser) {
       console.log('🗑️ Removendo usuário sistema e seus dados...');
       
       // Remove todas as categorias do sistema
       const categoriesDeleted = await db.runAsync(`
         DELETE FROM categories 
         WHERE user_id = ? OR user_id IS NULL
       `, [systemUser.id]);
       
       console.log(`✅ ${categoriesDeleted.changes} categorias do sistema removidas`);
       
       // Remove todos os métodos de pagamento do sistema
       const methodsDeleted = await db.runAsync(`
         DELETE FROM payment_methods 
         WHERE user_id = ? OR user_id IS NULL
       `, [systemUser.id]);
       
       console.log(`✅ ${methodsDeleted.changes} métodos de pagamento do sistema removidos`);
       
       // Remove o usuário sistema
       await db.runAsync(
         "DELETE FROM users WHERE email = 'system@default.com'"
       );
       
       console.log('✅ Usuário sistema removido');
     }
     
     // Remove quaisquer categorias órfãs (sem user_id válido)
     const orphanCategories = await db.runAsync(`
       DELETE FROM categories 
       WHERE user_id NOT IN (SELECT id FROM users)
     `);
     
     if (orphanCategories.changes > 0) {
       console.log(`✅ ${orphanCategories.changes} categorias órfãs removidas`);
     }
     
     // Remove quaisquer métodos de pagamento órfãos
     const orphanMethods = await db.runAsync(`
       DELETE FROM payment_methods 
       WHERE user_id NOT IN (SELECT id FROM users)
     `);
     
     if (orphanMethods.changes > 0) {
       console.log(`✅ ${orphanMethods.changes} métodos de pagamento órfãos removidos`);
     }
     
   } catch (error) {
     console.warn('⚠️ Erro ao remover dados do sistema:', error.message);
   }
 };

 const cleanOrphanData = async () => {
   console.log('🧹 Limpando dados órfãos...');
   
   try {
     // Remove despesas com referências inválidas
     const orphanExpenses = await db.runAsync(`
       DELETE FROM expenses 
       WHERE user_id NOT IN (SELECT id FROM users)
     `);
     
     if (orphanExpenses.changes > 0) {
       console.log(`✅ ${orphanExpenses.changes} despesas órfãs removidas`);
     }
     
     // Remove estabelecimentos órfãos
     const orphanEstablishments = await db.runAsync(`
       DELETE FROM establishments 
       WHERE user_id NOT IN (SELECT id FROM users)
     `);
     
     if (orphanEstablishments.changes > 0) {
       console.log(`✅ ${orphanEstablishments.changes} estabelecimentos órfãos removidos`);
     }
     
     // Otimiza o banco de dados
     await db.execAsync('VACUUM');
     console.log('✅ Banco de dados otimizado');
     
   } catch (error) {
     console.warn('⚠️ Erro ao limpar dados órfãos:', error.message);
   }
 };

 const migratePasswords = async () => {
   console.log('🔐 Verificando migração de senhas...');
   
   try {
     const users = await db.getAllAsync('SELECT id, password FROM users');
     let migrated = 0;
     
     for (const user of users) {
       if (needsPasswordMigration(user.password)) {
         console.log(`🔄 Migrando senha do usuário ${user.id}...`);
         const hashedPassword = hashPassword(user.password);
         
         await db.runAsync(
           'UPDATE users SET password = ? WHERE id = ?',
           [hashedPassword, user.id]
         );
         migrated++;
       }
     }
     
     if (migrated > 0) {
       console.log(`✅ ${migrated} senha(s) migrada(s) com sucesso`);
     } else {
       console.log('✅ Todas as senhas já estão atualizadas');
     }
     
   } catch (error) {
     console.warn('⚠️ Erro na migração de senhas:', error.message);
   }
 };

 const testTablesAccess = async () => {
   console.log('🧪 Testando acesso às tabelas...');
   
   try {
     const tables = ['users', 'categories', 'payment_methods', 'expenses', 'establishments', 'locations'];
     
     for (const table of tables) {
       const count = await db.getFirstAsync(`SELECT COUNT(*) as count FROM ${table}`);
       console.log(`✅ ${table}: ${count.count} registros`);
     }
     
     // Verifica integridade dos relacionamentos
     const integrityCheck = await db.getFirstAsync('PRAGMA integrity_check');
     console.log('✅ Integridade do banco:', integrityCheck.integrity_check);
     
   } catch (error) {
     throw new Error(`Erro ao testar tabelas: ${error.message}`);
   }
 };

 // ESTADO DE ERRO
 if (error) {
   return (
     <View style={styles.container}>
       <Text style={styles.errorTitle}>⚠️ Erro de Inicialização</Text>
       <Text style={styles.errorMessage}>{error}</Text>
       <Text style={styles.errorSubtitle}>
         Por favor, reinicie o aplicativo. Se o problema persistir, reinstale o app.
       </Text>
     </View>
   );
 }

 // ESTADO DE LOADING
 if (!initialized) {
   return (
     <View style={styles.container}>
       <ActivityIndicator size="large" color="#10b981" />
       <Text style={styles.loadingTitle}>Preparando aplicativo...</Text>
       <Text style={styles.loadingSubtitle}>
         Configurando banco de dados...
       </Text>
     </View>
   );
 }

 // BANCO PRONTO - RENDERIZA CHILDREN
 return children;
}

const styles = StyleSheet.create({
 container: {
   flex: 1,
   justifyContent: 'center',
   alignItems: 'center',
   backgroundColor: '#f8fafc',
   padding: 40,
 },
 loadingTitle: {
   marginTop: 20,
   fontSize: 18,
   fontWeight: 'bold',
   color: '#1f2937',
   textAlign: 'center',
 },
 loadingSubtitle: {
   marginTop: 8,
   fontSize: 14,
   color: '#6b7280',
   textAlign: 'center',
 },
 errorTitle: {
   fontSize: 20,
   fontWeight: 'bold',
   color: '#ef4444',
   marginBottom: 16,
   textAlign: 'center',
 },
 errorMessage: {
   fontSize: 16,
   color: '#374151',
   marginBottom: 12,
   textAlign: 'center',
 },
 errorSubtitle: {
   fontSize: 14,
   color: '#6b7280',
   textAlign: 'center',
   fontStyle: 'italic',
 },
});