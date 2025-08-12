// components/ExpenseList.js - VERSÃO CORRIGIDA
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

export default function ExpenseList({ onEdit = () => {} }) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (db) {
      console.log('🔄 ExpenseList: Banco disponível, carregando despesas...');
      loadExpenses();
    } else {
      console.log('⚠️ ExpenseList: Banco não disponível ainda');
    }
  }, [db]);

  async function loadExpenses() {
    try {
      console.log('📋 Iniciando carregamento de despesas...');
      setError(null);

      // Query simplificada primeiro para debug
      const simpleTest = await db.getAllAsync(`
        SELECT COUNT(*) as total FROM expenses
      `);
      console.log('📊 Total de despesas no banco:', simpleTest[0]?.total || 0);

      // Se não há despesas, mostra mensagem apropriada
      if (simpleTest[0]?.total === 0) {
        console.log('📭 Nenhuma despesa encontrada no banco');
        setExpenses([]);
        setLoading(false);
        return;
      }

      // Query completa com tratamento de erro
      try {
        const result = await db.getAllAsync(`
          SELECT
            e.id,
            e.description,
            e.amount,
            e.date,
            e.categoryId,
            e.payment_method_id,
            e.establishment_id,
            COALESCE(c.name, 'Sem categoria') AS category,
            COALESCE(c.icon, '📦') AS icon,
            COALESCE(pm.name, '') AS payment_method,
            COALESCE(pm.icon, '') AS payment_icon
          FROM expenses e
          LEFT JOIN categories c ON e.categoryId = c.id
          LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
          ORDER BY e.date DESC, e.id DESC
          LIMIT 100
        `);

        console.log('✅ Despesas carregadas com sucesso:', result.length);
        console.log('🔍 Primeira despesa:', result[0]);

        setExpenses(result);
      } catch (queryError) {
        console.error('❌ Erro na query completa, tentando query simplificada:', queryError);

        // Fallback para query mais simples
        const simpleResult = await db.getAllAsync(`
          SELECT
            e.id,
            e.description,
            e.amount,
            e.date,
            COALESCE(c.name, 'Sem categoria') AS category,
            COALESCE(c.icon, '📦') AS icon
          FROM expenses e
          LEFT JOIN categories c ON e.categoryId = c.id
          ORDER BY e.date DESC, e.id DESC
          LIMIT 100
        `);

        console.log('✅ Despesas carregadas (modo simples):', simpleResult.length);
        setExpenses(simpleResult);
      }
    } catch (error) {
      console.error('❌ Erro geral ao carregar despesas:', error);
      setError(error.message);

      // Tenta mostrar estrutura da tabela para debug
      try {
        const tableInfo = await db.getAllAsync('PRAGMA table_info(expenses)');
        console.log('🏗️ Estrutura da tabela expenses:', tableInfo);
      } catch (e) {
        console.error('❌ Erro ao obter estrutura da tabela:', e);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, description) {
    Alert.alert(
      '⚠️ Confirmar Exclusão',
      `Deseja excluir "${description}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
              console.log('✅ Despesa excluída:', id);
              await loadExpenses();
              Alert.alert('Sucesso', 'Despesa excluída!');
            } catch (error) {
              console.error('❌ Erro ao excluir:', error);
              Alert.alert('Erro', 'Não foi possível excluir a despesa.');
            }
          }
        }
      ]
    );
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(parseFloat(value) || 0);
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Ajusta para o fuso horário local
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);

      if (localDate.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (localDate.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return localDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error, dateString);
      return dateString;
    }
  }

  const renderExpenseItem = ({ item, index }) => (
    <View style={[styles.expenseCard, { marginTop: index === 0 ? 0 : 6 }]}>
      <TouchableOpacity
        style={styles.expenseContent}
        onPress={() => {
          console.log('📝 Editando despesa:', item);
          onEdit(item);
        }}
        activeOpacity={0.8}
      >
        {/* Ícone da categoria */}
        <View style={styles.categoryIconContainer}>
          <Text style={styles.categoryIconText}>{item.icon || '📦'}</Text>
        </View>

        {/* Informações principais */}
        <View style={styles.expenseInfo}>
          <View style={styles.expenseHeader}>
            <Text style={styles.expenseDescription} numberOfLines={1}>
              {item.description || 'Sem descrição'}
            </Text>
            <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseCategory} numberOfLines={1}>
              {item.category || 'Sem categoria'}
              {item.payment_method && ` • ${item.payment_icon || '💳'} ${item.payment_method}`}
            </Text>
            <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
          </View>
        </View>

        {/* Ícone de edição */}
        <Text style={styles.editIcon}>✏️</Text>
      </TouchableOpacity>

      {/* Botão excluir */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.id, item.description)}
        activeOpacity={0.8}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  // Estados de carregamento e erro
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color='#10b981' />
        <Text style={styles.loadingText}>Carregando despesas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Erro ao carregar despesas</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadExpenses}>
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (expenses.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>💰</Text>
        <Text style={styles.emptyTitle}>Nenhuma despesa ainda</Text>
        <Text style={styles.emptySubtitle}>
          Suas despesas aparecerão aqui quando você começar a cadastrar!
        </Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadExpenses}>
          <Text style={styles.refreshButtonText}>🔄 Atualizar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header da lista */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Últimas Despesas</Text>
        <Text style={styles.headerSubtitle}>
          {expenses.length} despesa{expenses.length !== 1 ? 's' : ''} encontrada
          {expenses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => `expense-${item.id}`}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.1}
        ListFooterComponent={<View style={styles.listFooter} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },

  // Header
  header: {
    backgroundColor: '#ffffff',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b'
  },

  // Lista
  list: {
    padding: 16
  },
  listFooter: {
    height: 80 // Espaço para o botão flutuante
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    minHeight: 72
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16
  },

  // Ícone da categoria
  categoryIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  categoryIconText: {
    fontSize: 20
  },

  // Informações da despesa
  expenseInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669'
  },
  expenseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  expenseCategory: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
    marginRight: 8
  },
  expenseDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500'
  },
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.5
  },

  // Botão delete
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: '100%'
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ffffff'
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.6
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280'
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 8
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600'
  }
});
