// components/DatabaseInitializer.js - VERSÃO CORRIGIDA
import React, { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { hashPassword, needsPasswordMigration, verifyPassword } from '../utils/crypto';
import CacheService from '../services/CacheService';
import eventEmitter, { EVENTS } from '../services/EventEmitter';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Classe para gerenciar transações
class TransactionManager {
  constructor(db) {
    this.db = db;
  }

  async executeTransaction(operations) {
    try {
      await this.db.execAsync('BEGIN TRANSACTION');
      const result = await operations(this.db);
      await this.db.execAsync('COMMIT');
      return { success: true, result };
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('❌ Erro na transação:', error);
      return { success: false, error: error.message };
    }
  }
}

// Sistema de Migração de Schema
class SchemaMigrationManager {
  constructor(db) {
    this.db = db;
    this.currentVersion = '2.4.0';
  }

  async getCurrentVersion() {
    try {
      await this.db.execAsync(`
        CREATE TABLE IF NOT EXISTS schema_version (
          version TEXT PRIMARY KEY,
          applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);

      const result = await this.db.getFirstAsync(
        'SELECT version FROM schema_version ORDER BY rowid DESC LIMIT 1'
      );

      return result?.version || '1.0.0';
    } catch (error) {
      console.log('📋 Primeira execução - versão base assumida');
      return '1.0.0';
    }
  }

  async setCurrentVersion(version) {
    await this.db.runAsync(
      'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, CURRENT_TIMESTAMP)',
      [version]
    );
  }

  async checkTableStructure(tableName) {
    try {
      const columns = await this.db.getAllAsync(`PRAGMA table_info(${tableName})`);
      return columns.map(col => col.name);
    } catch (error) {
      return [];
    }
  }

  async applyMigrations() {
    const currentVersion = await this.getCurrentVersion();
    console.log(`📊 Versão atual do banco: ${currentVersion}`);
    console.log(`📊 Versão alvo: ${this.currentVersion}`);

    const migrations = [
      { version: '2.0.0', apply: () => this.migrateTo_2_0_0() },
      { version: '2.1.0', apply: () => this.migrateTo_2_1_0() },
      { version: '2.2.0', apply: () => this.migrateTo_2_2_0() },
      { version: '2.3.0', apply: () => this.migrateTo_2_3_0() },
      { version: '2.4.0', apply: () => this.migrateTo_2_4_0() }
    ];

    for (const migration of migrations) {
      if (this.compareVersions(currentVersion, migration.version) < 0) {
        console.log(`🔄 Aplicando migração para versão ${migration.version}...`);
        try {
          await migration.apply();
          await this.setCurrentVersion(migration.version);
          console.log(`✅ Migração ${migration.version} aplicada com sucesso`);
        } catch (error) {
          console.error(`❌ Erro na migração ${migration.version}:`, error);
          throw error;
        }
      }
    }
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      if (parts1[i] < parts2[i]) return -1;
      if (parts1[i] > parts2[i]) return 1;
    }
    return 0;
  }

  // Migração para versão 2.0.0 - CORRIGIDA
  async migrateTo_2_0_0() {
    console.log('🔧 Executando migração 2.0.0...');

    // Adiciona colunas faltantes em users
    const userColumns = await this.checkTableStructure('users');

    if (!userColumns.includes('preferences')) {
      await this.db.execAsync('ALTER TABLE users ADD COLUMN preferences TEXT');
      console.log('✅ Adicionada coluna preferences em users');
    }

    if (!userColumns.includes('is_active')) {
      await this.db.execAsync('ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1');
      console.log('✅ Adicionada coluna is_active em users');
    }

    // Adiciona colunas faltantes em categories
    const categoryColumns = await this.checkTableStructure('categories');

    if (!categoryColumns.includes('updated_at')) {
      // Adiciona coluna sem default primeiro
      await this.db.execAsync('ALTER TABLE categories ADD COLUMN updated_at TEXT');
      // Depois atualiza valores existentes
      await this.db.execAsync(
        'UPDATE categories SET updated_at = datetime(\'now\') WHERE updated_at IS NULL'
      );
      console.log('✅ Adicionada coluna updated_at em categories');
    }

    // Adiciona colunas faltantes em expenses
    const expenseColumns = await this.checkTableStructure('expenses');

    if (!expenseColumns.includes('notes')) {
      await this.db.execAsync('ALTER TABLE expenses ADD COLUMN notes TEXT');
      console.log('✅ Adicionada coluna notes em expenses');
    }

    if (!expenseColumns.includes('tags')) {
      await this.db.execAsync('ALTER TABLE expenses ADD COLUMN tags TEXT');
      console.log('✅ Adicionada coluna tags em expenses');
    }

    if (!expenseColumns.includes('is_recurring')) {
      await this.db.execAsync('ALTER TABLE expenses ADD COLUMN is_recurring INTEGER DEFAULT 0');
      console.log('✅ Adicionada coluna is_recurring em expenses');
    }

    // Adiciona created_at onde estiver faltando
    if (!expenseColumns.includes('created_at')) {
      await this.db.execAsync('ALTER TABLE expenses ADD COLUMN created_at TEXT');
      await this.db.execAsync(
        'UPDATE expenses SET created_at = datetime(\'now\') WHERE created_at IS NULL'
      );
      console.log('✅ Adicionada coluna created_at em expenses');
    }

    if (!expenseColumns.includes('updated_at')) {
      await this.db.execAsync('ALTER TABLE expenses ADD COLUMN updated_at TEXT');
      await this.db.execAsync(
        'UPDATE expenses SET updated_at = datetime(\'now\') WHERE updated_at IS NULL'
      );
      console.log('✅ Adicionada coluna updated_at em expenses');
    }
  }

  // Migração para versão 2.1.0 - CORRIGIDA
  async migrateTo_2_1_0() {
    console.log('🔧 Executando migração 2.1.0...');

    // Verifica e adiciona is_active em payment_methods
    const paymentColumns = await this.checkTableStructure('payment_methods');

    if (!paymentColumns.includes('is_active')) {
      await this.db.execAsync('ALTER TABLE payment_methods ADD COLUMN is_active INTEGER DEFAULT 1');
      console.log('✅ Adicionada coluna is_active em payment_methods');
    }

    if (!paymentColumns.includes('created_at')) {
      await this.db.execAsync('ALTER TABLE payment_methods ADD COLUMN created_at TEXT');
      await this.db.execAsync(
        'UPDATE payment_methods SET created_at = datetime(\'now\') WHERE created_at IS NULL'
      );
      console.log('✅ Adicionada coluna created_at em payment_methods');
    }

    // Verifica e adiciona is_active em establishments
    const establishmentColumns = await this.checkTableStructure('establishments');

    if (!establishmentColumns.includes('is_active')) {
      await this.db.execAsync('ALTER TABLE establishments ADD COLUMN is_active INTEGER DEFAULT 1');
      console.log('✅ Adicionada coluna is_active em establishments');
    }

    // Cria tabela de auditoria se não existir
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        user_id INTEGER,
        record_id INTEGER,
        old_values TEXT,
        new_values TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✅ Tabela audit_log verificada/criada');

    // Garante que categories tem unique constraint
    try {
      // Primeiro remove duplicatas se existirem
      await this.db.execAsync(`
        DELETE FROM categories 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM categories 
          GROUP BY name, user_id
        )
      `);
      console.log('✅ Duplicatas removidas de categories');
    } catch (e) {
      console.log('⚠️ Sem duplicatas para remover em categories');
    }

    // Faz o mesmo para payment_methods
    try {
      await this.db.execAsync(`
        DELETE FROM payment_methods 
        WHERE id NOT IN (
          SELECT MIN(id) 
          FROM payment_methods 
          GROUP BY name, user_id
        )
      `);
      console.log('✅ Duplicatas removidas de payment_methods');
    } catch (e) {
      console.log('⚠️ Sem duplicatas para remover em payment_methods');
    }
  }

  // Migração para versão 2.2.0 - Tabela establishment_category
  async migrateTo_2_2_0() {
    console.log('🔧 Executando migração 2.2.0...');

    // Cria tabela establishment_category se não existir
    console.log('🔧 Criando/verificando tabela establishment_category...');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS establishment_category (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        establishment_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        user_id INTEGER NOT NULL,
        FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(establishment_id, category_id)
      )
    `);
    console.log('✅ Tabela establishment_category criada/verificada com sucesso');

    // Migra dados existentes do campo category para a tabela intermediária
    try {
      const establishmentsWithCategories = await this.db.getAllAsync(`
        SELECT e.id, e.user_id, e.category, c.id as category_id
        FROM establishments e
        LEFT JOIN categories c ON c.name = e.category AND c.user_id = e.user_id
        WHERE e.category IS NOT NULL AND e.category != ''
      `);

      for (const establishment of establishmentsWithCategories) {
        if (establishment.category_id) {
          // Insere na tabela intermediária se a categoria existe
          try {
            await this.db.runAsync(
              `INSERT OR IGNORE INTO establishment_category (establishment_id, category_id, user_id) 
               VALUES (?, ?, ?)`,
              [establishment.id, establishment.category_id, establishment.user_id]
            );
          } catch (error) {
            console.log(`⚠️ Erro ao migrar categoria para estabelecimento ${establishment.id}:`, error.message);
          }
        }
      }

      console.log(`✅ Migrados ${establishmentsWithCategories.length} relacionamentos establishment-category`);
    } catch (error) {
      console.log('⚠️ Erro na migração de categorias:', error.message);
    }

    // Remove a coluna category da tabela establishments
    // SQLite não suporta DROP COLUMN, então criamos nova tabela e copiamos dados
    try {
      await this.db.execAsync('BEGIN TRANSACTION');

      // Cria nova tabela sem o campo category
      await this.db.execAsync(`
        CREATE TABLE establishments_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          street TEXT,
          number TEXT,
          district TEXT,
          city TEXT,
          state TEXT,
          zipcode TEXT,
          phone TEXT,
          latitude REAL,
          longitude REAL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CHECK (length(name) >= 2)
        )
      `);

      // Copia dados (exceto campo category)
      await this.db.execAsync(`
        INSERT INTO establishments_new 
        (id, name, street, number, district, city, state, zipcode, phone, latitude, longitude, created_at, updated_at, user_id, is_active)
        SELECT id, name, street, number, district, city, state, zipcode, phone, latitude, longitude, created_at, updated_at, user_id, is_active
        FROM establishments
      `);

      // Remove tabela antiga e renomeia nova
      await this.db.execAsync('DROP TABLE establishments');
      await this.db.execAsync('ALTER TABLE establishments_new RENAME TO establishments');

      await this.db.execAsync('COMMIT');
      console.log('✅ Campo category removido da tabela establishments');
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.log('⚠️ Erro ao remover campo category:', error.message);
    }
  }

  // Migração para versão 2.3.0 - Tabela establishment_categories dedicada
  async migrateTo_2_3_0() {
    console.log('🔧 Executando migração 2.3.0...');

    // Cria tabela establishment_categories se não existir
    console.log('🔧 Criando tabela establishment_categories...');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS establishment_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        icon TEXT DEFAULT '🏪',
        user_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(name, user_id)
      );
    `);
    console.log('✅ Tabela establishment_categories criada com sucesso');

    // Cria algumas categorias padrão para cada usuário
    try {
      const users = await this.db.getAllAsync('SELECT id FROM users');
      
      const defaultCategories = [
        { name: 'Restaurante', icon: '🍽️' },
        { name: 'Supermercado', icon: '🛒' },
        { name: 'Farmácia', icon: '💊' },
        { name: 'Posto de Combustível', icon: '⛽' },
        { name: 'Loja', icon: '🏪' }
      ];

      for (const user of users) {
        for (const category of defaultCategories) {
          try {
            await this.db.runAsync(
              'INSERT OR IGNORE INTO establishment_categories (name, icon, user_id) VALUES (?, ?, ?)',
              [category.name, category.icon, user.id]
            );
          } catch (error) {
            console.log(`⚠️ Erro ao criar categoria padrão "${category.name}" para usuário ${user.id}:`, error.message);
          }
        }
      }

      console.log(`✅ Categorias padrão criadas para ${users.length} usuário(s)`);
    } catch (error) {
      console.log('⚠️ Erro ao criar categorias padrão:', error.message);
    }
  }

  // Migração para versão 2.4.0 - Adiciona tabela de receitas
  async migrateTo_2_4_0() {
    console.log('🔧 Executando migração 2.4.0...');

    // Cria tabela de receitas
    console.log('🔧 Criando tabela incomes...');
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS incomes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        categoryId INTEGER,
        payment_method_id INTEGER,
        establishment_id INTEGER,
        user_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        tags TEXT,
        is_recurring INTEGER DEFAULT 0,
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
        FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
        FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('✅ Tabela incomes criada com sucesso');

    // Cria categorias padrão de receita para cada usuário
    try {
      const users = await this.db.getAllAsync('SELECT id FROM users');
      
      const defaultIncomeCategories = [
        { name: 'Salário', icon: '💰' },
        { name: 'Freelance', icon: '💻' },
        { name: 'Investimentos', icon: '📈' },
        { name: 'Vendas', icon: '🛒' },
        { name: 'Outros', icon: '💵' }
      ];

      for (const user of users) {
        for (const category of defaultIncomeCategories) {
          try {
            await this.db.runAsync(
              'INSERT OR IGNORE INTO categories (name, icon, user_id, type) VALUES (?, ?, ?, ?)',
              [category.name, category.icon, user.id, 'receita']
            );
          } catch (error) {
            console.log(`⚠️ Erro ao criar categoria de receita padrão "${category.name}" para usuário ${user.id}:`, error.message);
          }
        }
      }

      console.log(`✅ Categorias de receita padrão criadas para ${users.length} usuário(s)`);
    } catch (error) {
      console.log('⚠️ Erro ao criar categorias de receita padrão:', error.message);
    }

    // Adiciona coluna 'type' à tabela categories se não existir
    const categoryColumns = await this.checkTableStructure('categories');
    if (!categoryColumns.includes('type')) {
      await this.db.execAsync('ALTER TABLE categories ADD COLUMN type TEXT DEFAULT "despesa"');
      console.log('✅ Adicionada coluna type em categories');
    }
  }
}

export default function DatabaseInitializer({ children }) {
  const db = useSQLiteContext();
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [initProgress, setInitProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');

  useEffect(() => {
    if (db && !initialized) {
      initializeDatabase();
    }
  }, [db, initialized]);

  const initializeDatabase = async () => {
    const transactionManager = new TransactionManager(db);
    const migrationManager = new SchemaMigrationManager(db);

    try {
      console.log('🔧 === INICIALIZANDO BANCO DE DADOS OTIMIZADO ===');

      // 1. FORÇA FOREIGN KEYS
      setCurrentStep('Configurando banco de dados...');
      setInitProgress(10);
      await db.execAsync('PRAGMA foreign_keys = ON');
      console.log('✅ Foreign keys ativadas');

      // 2. CRIA ESTRUTURA BASE (se não existir)
      setCurrentStep('Verificando estrutura base...');
      setInitProgress(20);
      await createBaseStructure(transactionManager);

      // 3. APLICA MIGRAÇÕES
      setCurrentStep('Aplicando atualizações...');
      setInitProgress(40);
      await migrationManager.applyMigrations();

      // 4. CRIA ÍNDICES OTIMIZADOS
      setCurrentStep('Otimizando performance...');
      setInitProgress(60);
      await createOptimizedIndexes(transactionManager);

      // 5. MIGRA SENHAS ANTIGAS
      setCurrentStep('Atualizando segurança...');
      setInitProgress(80);
      await migratePasswordsWithTransaction(transactionManager);

      // 6. OTIMIZA BANCO
      setCurrentStep('Finalizando...');
      setInitProgress(90);
      await optimizeDatabase();

      // 7. MARCA COMO INICIALIZADO
      await AsyncStorage.setItem('@ExpenseApp:db_initialized', 'true');
      await AsyncStorage.setItem('@ExpenseApp:db_version', migrationManager.currentVersion);

      setInitProgress(100);

      // Limpa cache antigo
      await cleanOldCache();

      // Emite evento de inicialização completa
      eventEmitter.emit(EVENTS.DATA_SYNC_NEEDED);

      console.log('🎉 Banco inicializado com sucesso!');
      setInitialized(true);
    } catch (error) {
      console.error('❌ ERRO CRÍTICO na inicialização:', error);
      setError(error.message);
    }
  };

  const createBaseStructure = async transactionManager => {
    console.log('🏗️ Verificando estrutura base de tabelas...');

    const result = await transactionManager.executeTransaction(async db => {
      // Users - estrutura base
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE COLLATE NOCASE,
          password TEXT NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_login TEXT,
          preferences TEXT,
          is_active INTEGER DEFAULT 1,
          CHECK (length(name) >= 2),
          CHECK (email LIKE '%@%.%')
        );
      `);

      // Categories - estrutura base
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '📂',
          user_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(name, user_id)
        );
      `);

      // Payment Methods - estrutura base
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '💳',
          user_id INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(name, user_id)
        );
      `);

      // Establishments - estrutura base
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
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER NOT NULL,
          is_active INTEGER DEFAULT 1,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CHECK (length(name) >= 2)
        );
      `);

      console.log('📋 Criando tabela establishment_category...');
      // Tabela de relacionamento N:N entre establishments e categories
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS establishment_category (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          establishment_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER NOT NULL,
          FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE CASCADE,
          FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(establishment_id, category_id)
        );
      `);
      console.log('✅ Tabela establishment_category criada com sucesso');

      console.log('📋 Criando tabela establishment_categories...');
      // Tabela de categorias específicas para estabelecimentos
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS establishment_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          icon TEXT DEFAULT '🏪',
          user_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE(name, user_id)
        );
      `);
      console.log('✅ Tabela establishment_categories criada com sucesso');

      // Expenses - estrutura base
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          description TEXT NOT NULL,
          amount REAL NOT NULL,
          date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
          categoryId INTEGER,
          payment_method_id INTEGER,
          establishment_id INTEGER,
          user_id INTEGER NOT NULL,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
          notes TEXT,
          tags TEXT,
          is_recurring INTEGER DEFAULT 0,
          FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
          FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          CHECK (amount > 0),
          CHECK (length(description) >= 3)
        );
      `);

      // Audit log
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          operation TEXT NOT NULL,
          user_id INTEGER,
          record_id INTEGER,
          old_values TEXT,
          new_values TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
        );
      `);

      console.log('✅ Estrutura base verificada');
    });

    if (!result.success) {
      throw new Error('Falha ao criar estrutura base: ' + result.error);
    }
  };

  const createOptimizedIndexes = async transactionManager => {
    console.log('📇 Criando índices otimizados...');

    const result = await transactionManager.executeTransaction(async db => {
      const createIndexSafely = async indexSql => {
        try {
          await db.execAsync(indexSql);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.warn(`⚠️ Aviso ao criar índice: ${error.message}`);
          }
        }
      };

      // Índices para expenses
      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_expenses_user_date_desc ON expenses(user_id, date DESC, id DESC)'
      );

      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_expenses_category_date ON expenses(user_id, categoryId, date DESC)'
      );

      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_expenses_establishment ON expenses(user_id, establishment_id, date DESC)'
      );

      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_expenses_description ON expenses(user_id, description)'
      );

      // Índices para categories
      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name)'
      );

      // Índices para payment_methods
      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_payment_methods_user_active ON payment_methods(user_id, is_active)'
      );

      // Índices para establishments
      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_establishments_user_name ON establishments(user_id, name)'
      );

      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_establishments_location ON establishments(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL'
      );

      // Índice para login rápido
      await createIndexSafely('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');

      // Índice para auditoria
      await createIndexSafely(
        'CREATE INDEX IF NOT EXISTS idx_audit_log_user_table ON audit_log(user_id, table_name, created_at DESC)'
      );

      console.log('✅ Índices otimizados criados');
    });

    if (!result.success) {
      console.error('⚠️ Erro ao criar alguns índices, mas continuando:', result.error);
    }
  };

  const migratePasswordsWithTransaction = async transactionManager => {
    console.log('🔐 Verificando migração de senhas...');

    try {
      const result = await transactionManager.executeTransaction(async db => {
        const users = await db.getAllAsync('SELECT id, password FROM users');
        let migrated = 0;

        for (const user of users) {
          if (needsPasswordMigration(user.password)) {
            console.log(`🔄 Migrando senha do usuário ${user.id}...`);

            const hashedPassword = hashPassword(user.password);

            await db.runAsync('UPDATE users SET password = ? WHERE id = ?', [
              hashedPassword,
              user.id
            ]);

            migrated++;
          }
        }

        if (migrated > 0) {
          console.log(`✅ ${migrated} senha(s) migrada(s) com sucesso`);
        } else {
          console.log('✅ Todas as senhas já estão atualizadas');
        }

        return migrated;
      });

      if (!result.success) {
        console.error('❌ Erro na migração de senhas:', result.error);
      }
    } catch (error) {
      console.error('⚠️ Erro ao migrar senhas, continuando:', error);
    }
  };

  const optimizeDatabase = async () => {
    try {
      await db.execAsync('ANALYZE');
      console.log('✅ Banco de dados otimizado');
    } catch (error) {
      console.warn('⚠️ Erro ao otimizar banco:', error.message);
    }
  };

  const cleanOldCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('@ExpenseApp:cache:'));

      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;

      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          const parsed = JSON.parse(data);

          if (now - parsed.timestamp > sevenDays) {
            await AsyncStorage.removeItem(key);
          }
        } catch {
          await AsyncStorage.removeItem(key);
        }
      }

      console.log('✅ Cache antigo limpo');
    } catch (error) {
      console.warn('⚠️ Erro ao limpar cache:', error.message);
    }
  };

  // ESTADO DE ERRO
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erro de Inicialização</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorSubtitle}>
          Por favor, reinicie o aplicativo. Se o problema persistir, entre em contato com o suporte.
        </Text>
      </View>
    );
  }

  // ESTADO DE LOADING
  if (!initialized) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContent}>
          <ActivityIndicator size='large' color='#6366F1' />
          <Text style={styles.loadingTitle}>Atualizando aplicativo...</Text>
          <Text style={styles.loadingSubtitle}>{currentStep}</Text>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${initProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>{initProgress}%</Text>
          </View>

          <Text style={styles.progressHint}>
            Isso só acontece uma vez. Seus dados estão seguros!
          </Text>
        </View>
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
    padding: 40
  },
  loadingContent: {
    alignItems: 'center',
    width: '100%'
  },
  loadingTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center'
  },
  loadingSubtitle: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center'
  },
  progressContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center'
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366F1',
    borderRadius: 4
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280'
  },
  progressHint: {
    marginTop: 16,
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center'
  },
  errorMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center'
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    fontStyle: 'italic'
  }
});
