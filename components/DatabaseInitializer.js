import { useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

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
      console.log('🔧 === INICIALIZANDO BANCO DE DADOS ===');
      
      // 1. FORÇA FOREIGN KEYS
      await db.execAsync('PRAGMA foreign_keys = ON');
      console.log('✅ Foreign keys ativadas');
      
      // 2. VERIFICA SE TABELAS EXISTEM
      const tables = await db.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `);
      console.log('📋 Tabelas existentes:', tables.map(t => t.name));

      // 3. CRIA TODAS AS TABELAS OBRIGATÓRIAS
      await createAllTables();
      
      // 4. INSERE DADOS PADRÃO SE NECESSÁRIO
      await insertDefaultData();
      
      // 5. VERIFICA FINAL
      const finalTables = await db.getAllAsync(`
        SELECT name FROM sqlite_master 
        WHERE type='table' 
        ORDER BY name
      `);
      console.log('✅ Tabelas finais:', finalTables.map(t => t.name));
      
      // 6. TESTA ACESSO ÀS TABELAS PRINCIPAIS
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
    
    // Categories (PRIMEIRA - outras dependem dela)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT '📂'
      );
    `);
    console.log('✅ Tabela categories criada');

    // Payment Methods (NOVA TABELA)
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT '💳'
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
        created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    console.log('✅ Tabela establishments criada');

    // Locations (legacy)
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

    // Primeiro, vamos verificar se a coluna payment_method_id já existe
    try {
      const tableInfo = await db.getAllAsync(`PRAGMA table_info(expenses)`);
      const hasPaymentMethodColumn = tableInfo.some(col => col.name === 'payment_method_id');
      
      if (!hasPaymentMethodColumn) {
        console.log('🔧 Adicionando coluna payment_method_id à tabela expenses...');
        await db.execAsync(`ALTER TABLE expenses ADD COLUMN payment_method_id INTEGER REFERENCES payment_methods(id) ON DELETE SET NULL`);
        console.log('✅ Coluna payment_method_id adicionada');
      }
    } catch (alterError) {
      console.log('⚠️ Tentando criar tabela expenses do zero...');
      
      // Se falhar, cria a tabela do zero
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
          FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE SET NULL,
          FOREIGN KEY (payment_method_id) REFERENCES payment_methods(id) ON DELETE SET NULL,
          FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL,
          FOREIGN KEY (establishment_id) REFERENCES establishments(id) ON DELETE SET NULL
        );
      `);
      console.log('✅ Tabela expenses criada com payment_method_id');
    }

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

  const insertDefaultData = async () => {
    console.log('📋 Verificando dados padrão...');
    
    // Só insere categorias se a tabela estiver vazia
    const categoriesCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
    
    if (categoriesCount.count === 0) {
      console.log('➕ Inserindo categorias padrão...');
      
      const defaultCategories = [
        { name: 'Alimentação', icon: '🍽️' },
        { name: 'Transporte', icon: '🚗' },
        { name: 'Lazer', icon: '🎮' },
        { name: 'Saúde', icon: '🏥' },
        { name: 'Casa', icon: '🏠' },
        { name: 'Educação', icon: '📚' },
        { name: 'Compras', icon: '🛒' },
        { name: 'Outros', icon: '📦' }
      ];

      for (const category of defaultCategories) {
        try {
          await db.runAsync(
            'INSERT INTO categories (name, icon) VALUES (?, ?)',
            [category.name, category.icon]
          );
          console.log(`✅ Categoria inserida: ${category.name}`);
        } catch (error) {
          console.warn(`⚠️ Erro ao inserir categoria ${category.name}:`, error.message);
        }
      }
    } else {
      console.log('✅ Categorias já existem, pulando inserção');
    }

    // Só insere métodos de pagamento se a tabela estiver vazia
    const paymentMethodsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM payment_methods');
    
    if (paymentMethodsCount.count === 0) {
      console.log('➕ Inserindo métodos de pagamento padrão...');
      
      const defaultPaymentMethods = [
        { name: 'Dinheiro', icon: '💵' },
        { name: 'Cartão de Crédito', icon: '💳' },
        { name: 'Cartão de Débito', icon: '💳' },
        { name: 'PIX', icon: '📱' },
        { name: 'Boleto', icon: '📄' },
        { name: 'Vale Refeição', icon: '🎫' },
        { name: 'Vale Alimentação', icon: '🎟️' },
        { name: 'Transferência', icon: '🏦' }
      ];

      for (const method of defaultPaymentMethods) {
        try {
          await db.runAsync(
            'INSERT INTO payment_methods (name, icon) VALUES (?, ?)',
            [method.name, method.icon]
          );
          console.log(`✅ Método de pagamento inserido: ${method.name}`);
        } catch (error) {
          console.warn(`⚠️ Erro ao inserir método ${method.name}:`, error.message);
        }
      }
    } else {
      console.log('✅ Métodos de pagamento já existem, pulando inserção');
    }
  };

  const testTablesAccess = async () => {
    console.log('🧪 Testando acesso às tabelas...');
    
    try {
      const categoriesCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM categories');
      console.log(`✅ Categories: ${categoriesCount.count} registros`);
      
      const paymentMethodsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM payment_methods');
      console.log(`✅ Payment Methods: ${paymentMethodsCount.count} registros`);
      
      const expensesCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM expenses');
      console.log(`✅ Expenses: ${expensesCount.count} registros`);
      
      const establishmentsCount = await db.getFirstAsync('SELECT COUNT(*) as count FROM establishments');
      console.log(`✅ Establishments: ${establishmentsCount.count} registros`);
      
    } catch (error) {
      throw new Error(`Erro ao testar tabelas: ${error.message}`);
    }
  };

  // 🔴 ESTADO DE ERRO
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>⚠️ Erro de Inicialização</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text style={styles.errorSubtitle}>
          Reinicie o aplicativo. Se persistir, limpe os dados do app.
        </Text>
      </View>
    );
  }

  // 🔄 ESTADO DE LOADING
  if (!initialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingTitle}>Preparando aplicativo...</Text>
        <Text style={styles.loadingSubtitle}>
          Configurando banco de dados pela primeira vez
        </Text>
      </View>
    );
  }

  // ✅ BANCO PRONTO - RENDERIZA CHILDREN
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