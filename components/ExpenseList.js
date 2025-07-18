import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";

export default function ExpenseList({ onEdit = () => {} }) {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (db) {
      loadExpenses();
    }
  }, [db]);

  async function loadExpenses() {
    try {
      console.log('📋 Carregando despesas...');
      const result = await db.getAllAsync(`
        SELECT
          e.id,
          e.description,
          e.amount,
          e.date,
          c.name AS category,
          c.icon AS icon,
          pm.name AS payment_method,
          pm.icon AS payment_icon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        ORDER BY e.date DESC
        LIMIT 50
      `);
      console.log('📋 Despesas carregadas:', result.length);
      setExpenses(result);
    } catch (error) {
      console.error("❌ Erro ao carregar despesas:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id, description) {
    Alert.alert(
      "⚠️ Confirmar Exclusão",
      `Deseja excluir "${description}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await db.runAsync("DELETE FROM expenses WHERE id = ?", [id]);
              await loadExpenses();
              Alert.alert("Sucesso", "Despesa excluída!");
            } catch (error) {
              console.error("Erro ao excluir:", error);
              Alert.alert("Erro", "Não foi possível excluir a despesa.");
            }
          },
        },
      ]
    );
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(parseFloat(value) || 0);
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch (error) {
      return dateString;
    }
  }

  const renderExpenseItem = ({ item, index }) => (
    <View style={[
      styles.expenseCard,
      { marginTop: index === 0 ? 0 : 6 }
    ]}>
      <TouchableOpacity 
        style={styles.expenseContent}
        onPress={() => onEdit(item)}
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
              {item.description}
            </Text>
            <Text style={styles.expenseAmount}>
              {formatCurrency(item.amount)}
            </Text>
          </View>
          <View style={styles.expenseMeta}>
            <Text style={styles.expenseCategory} numberOfLines={1}>
              {item.category || 'Sem categoria'}
              {item.payment_method && ` • ${item.payment_icon || '💳'} ${item.payment_method}`}
            </Text>
            <Text style={styles.expenseDate}>
              {formatDate(item.date)}
            </Text>
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Carregando despesas...</Text>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header da lista */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Últimas Despesas</Text>
        <Text style={styles.headerSubtitle}>
          {expenses.length} despesa{expenses.length !== 1 ? 's' : ''} encontrada{expenses.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => `expense-${item.id}`}
        renderItem={renderExpenseItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },

  // Lista compacta
  list: {
    padding: 16,
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
    minHeight: 72, // Altura um pouco maior que categorias para 2 linhas
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
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
    borderColor: '#e2e8f0',
  },
  categoryIconText: {
    fontSize: 20,
  },
  
  // Informações da despesa
  expenseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  expenseMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  expenseCategory: {
    fontSize: 13,
    color: '#64748b',
    flex: 1,
    marginRight: 8,
  },
  expenseDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  editIcon: {
    fontSize: 16,
    marginLeft: 8,
    opacity: 0.5,
  },
  
  // Botão delete
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: '100%',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
});