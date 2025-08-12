// components/ExpenseManager.js - DESIGN NUBANK
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  StatusBar
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import { formatCurrency, formatDate } from '../utils/helpers';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

export default function ExpenseManager() {
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Estados principais
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Estados do formulário
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [saving, setSaving] = useState(false);

  // Estados para listas de seleção
  const [categories, setCategories] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Carrega despesas na montagem
  useEffect(() => {
    if (db && user) {
      loadExpenses();
      loadCategories();
      loadPaymentMethods();
    }
  }, [db, user]);

  // Registra listener para atualizações automáticas
  useEffect(() => {
    const listener = () => {
      console.log('📡 ExpenseManager notificado sobre mudança');
      loadExpenses();
    };

    if (!global.expenseListeners) {
      global.expenseListeners = [];
    }
    global.expenseListeners.push(listener);

    return () => {
      const index = global.expenseListeners.indexOf(listener);
      if (index > -1) {
        global.expenseListeners.splice(index, 1);
      }
    };
  }, []);

  const loadExpenses = useCallback(
    async (isRefresh = false) => {
      if (!user) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const results = await db.getAllAsync(
          `
        SELECT 
          e.*,
          c.name as categoryName,
          c.icon as categoryIcon,
          pm.name as paymentMethodName,
          pm.icon as paymentMethodIcon
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        WHERE e.user_id = ?
        ORDER BY e.date DESC, e.id DESC
      `,
          [user.id]
        );

        setExpenses(results || []);
        console.log(`✅ ${results?.length || 0} despesas carregadas`);
      } catch (error) {
        console.error('❌ Erro ao carregar despesas:', error);
        Alert.alert('Erro', 'Não foi possível carregar as despesas', [{ text: 'Entendi' }]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [db, user]
  );

  const loadCategories = async () => {
    try {
      const results = await db.getAllAsync(
        `
        SELECT * FROM categories 
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY name ASC
      `,
        [user.id]
      );
      setCategories(results || []);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    }
  };

  const loadPaymentMethods = async () => {
    try {
      const results = await db.getAllAsync(
        `
        SELECT * FROM payment_methods 
        WHERE user_id = ? OR user_id IS NULL
        ORDER BY name ASC
      `,
        [user.id]
      );
      setPaymentMethods(results || []);
    } catch (error) {
      console.error('Erro ao carregar formas de pagamento:', error);
    }
  };

  const handleRefresh = useCallback(() => {
    loadExpenses(true);
  }, [loadExpenses]);

  const openNewExpense = () => {
    setEditingExpense(null);
    setAmount('');
    setDescription('');
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setModalVisible(true);
  };

  const openEditExpense = expense => {
    setEditingExpense(expense);
    setAmount(expense.amount?.toString() || '');
    setDescription(expense.description || '');
    setSelectedCategory(expense.categoryId || null);
    setSelectedPaymentMethod(expense.payment_method_id || null);
    setModalVisible(true);
  };

  const handleSave = async () => {
    // Validações
    if (!description.trim()) {
      Alert.alert('Validação', 'Digite uma descrição para a despesa', [{ text: 'Entendi' }]);
      return;
    }

    if (!amount.trim() || parseFloat(amount.replace(',', '.')) <= 0) {
      Alert.alert('Validação', 'Digite um valor válido', [{ text: 'Entendi' }]);
      return;
    }

    if (!selectedCategory) {
      Alert.alert('Validação', 'Selecione uma categoria', [{ text: 'Entendi' }]);
      return;
    }

    setSaving(true);

    try {
      const cleanAmount = amount.replace(',', '.');
      const valor = parseFloat(cleanAmount);
      const dateISO = new Date().toISOString();

      if (editingExpense) {
        // Atualizar despesa
        await db.runAsync(
          `
          UPDATE expenses 
          SET amount = ?, 
              description = ?, 
              categoryId = ?, 
              payment_method_id = ?, 
              date = ?,
              updated_at = datetime('now')
          WHERE id = ? AND user_id = ?
        `,
          [
            valor,
            description.trim(),
            selectedCategory,
            selectedPaymentMethod,
            dateISO,
            editingExpense.id,
            user.id
          ]
        );

        Alert.alert('Sucesso', 'Despesa atualizada!', [{ text: 'Entendi' }]);
      } else {
        // Nova despesa
        await db.runAsync(
          `
          INSERT INTO expenses (amount, description, categoryId, payment_method_id, date, user_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
          [valor, description.trim(), selectedCategory, selectedPaymentMethod, dateISO, user.id]
        );

        Alert.alert('Sucesso', 'Despesa adicionada!', [{ text: 'Entendi' }]);
      }

      setModalVisible(false);
      await loadExpenses();

      // Notifica outros componentes
      if (global.expenseListeners) {
        global.expenseListeners.forEach(listener => listener());
      }
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
      Alert.alert('Erro', 'Não foi possível salvar a despesa', [{ text: 'Entendi' }]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = expense => {
    Alert.alert('Confirmar Exclusão', `Deseja excluir a despesa "${expense.description}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.runAsync('DELETE FROM expenses WHERE id = ? AND user_id = ?', [
              expense.id,
              user.id
            ]);

            Alert.alert('Sucesso', 'Despesa excluída!', [{ text: 'Entendi' }]);
            await loadExpenses();

            // Notifica outros componentes
            if (global.expenseListeners) {
              global.expenseListeners.forEach(listener => listener());
            }
          } catch (error) {
            console.error('❌ Erro ao excluir despesa:', error);
            Alert.alert('Erro', 'Não foi possível excluir a despesa', [{ text: 'Entendi' }]);
          }
        }
      }
    ]);
  };

  const renderExpenseItem = ({ item }) => (
    <TouchableOpacity style={styles.expenseCard} onPress={() => openEditExpense(item)}>
      <View style={styles.expenseLeft}>
        <View style={styles.expenseIcon}>
          <Text style={styles.categoryIcon}>{item.categoryIcon || '💰'}</Text>
        </View>
        <View style={styles.expenseInfo}>
          <Text style={styles.expenseDescription}>{item.description}</Text>
          <Text style={styles.expenseDetails}>
            {item.categoryName || 'Sem categoria'} • {item.paymentMethodName || 'Dinheiro'}
          </Text>
          <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
        </View>
      </View>

      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
          <MaterialCommunityIcons name='delete-outline' size={20} color={NUBANK_COLORS.ERROR} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryItem, selectedCategory === item.id && styles.categoryItemSelected]}
      onPress={() => setSelectedCategory(item.id)}
    >
      <Text style={styles.categoryEmoji}>{item.icon}</Text>
      <Text
        style={[styles.categoryText, selectedCategory === item.id && styles.categoryTextSelected]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderPaymentMethodItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.paymentItem, selectedPaymentMethod === item.id && styles.paymentItemSelected]}
      onPress={() => setSelectedPaymentMethod(item.id)}
    >
      <Text style={styles.paymentEmoji}>{item.icon}</Text>
      <Text
        style={[
          styles.paymentText,
          selectedPaymentMethod === item.id && styles.paymentTextSelected
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={NUBANK_COLORS.PRIMARY} />
        <Text style={styles.loadingText}>Carregando despesas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle='light-content' backgroundColor={NUBANK_COLORS.PRIMARY} />

      {/* Lista de despesas */}
      <FlatList
        data={expenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[NUBANK_COLORS.PRIMARY]}
            tintColor={NUBANK_COLORS.PRIMARY}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name='receipt-text'
              size={64}
              color={NUBANK_COLORS.TEXT_TERTIARY}
            />
            <Text style={styles.emptyTitle}>Nenhuma despesa encontrada</Text>
            <Text style={styles.emptySubtitle}>
              Adicione sua primeira despesa tocando no botão +
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Botão flutuante */}
      <TouchableOpacity style={styles.fab} onPress={openNewExpense} activeOpacity={0.8}>
        <MaterialCommunityIcons name='plus' size={28} color={NUBANK_COLORS.TEXT_WHITE} />
      </TouchableOpacity>

      {/* Modal de adicionar/editar despesa */}
      <Modal visible={modalVisible} animationType='slide' presentationStyle='pageSheet'>
        <View style={styles.modalContainer}>
          {/* Header do modal */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <MaterialCommunityIcons name='close' size={24} color={NUBANK_COLORS.TEXT_PRIMARY} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Campo descrição */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição</Text>
              <TextInput
                style={styles.input}
                value={description}
                onChangeText={setDescription}
                placeholder='Ex: Almoço, Uber, Mercado...'
                placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
              />
            </View>

            {/* Campo valor */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Valor</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder='0,00'
                placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                keyboardType='numeric'
              />
            </View>

            {/* Seleção de categoria */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Categoria</Text>
              <FlatList
                data={categories}
                renderItem={renderCategoryItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
              />
            </View>

            {/* Seleção de forma de pagamento */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Forma de Pagamento</Text>
              <FlatList
                data={paymentMethods}
                renderItem={renderPaymentMethodItem}
                keyExtractor={item => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.horizontalList}
              />
            </View>
          </ScrollView>

          {/* Botões do modal */}
          <View style={styles.modalButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator color={NUBANK_COLORS.TEXT_WHITE} />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  loadingText: {
    marginTop: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },

  // Lista
  listContainer: {
    padding: NUBANK_SPACING.MD,
    paddingBottom: 100
  },
  expenseCard: {
    flexDirection: 'row',
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.MD,
    marginBottom: NUBANK_SPACING.SM,
    ...NUBANK_SHADOWS.SM,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  expenseLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center'
  },
  expenseIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: NUBANK_SPACING.MD
  },
  categoryIcon: {
    fontSize: 20
  },
  expenseInfo: {
    flex: 1
  },
  expenseDescription: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: 2
  },
  expenseDetails: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: 2
  },
  expenseDate: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_TERTIARY
  },
  expenseRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between'
  },
  expenseAmount: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  deleteButton: {
    marginTop: NUBANK_SPACING.SM,
    padding: NUBANK_SPACING.XS
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: NUBANK_SPACING.XXXL
  },
  emptyTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginTop: NUBANK_SPACING.MD,
    marginBottom: NUBANK_SPACING.SM
  },
  emptySubtitle: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'center',
    paddingHorizontal: NUBANK_SPACING.XL
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: NUBANK_SPACING.LG,
    right: NUBANK_SPACING.LG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    justifyContent: 'center',
    alignItems: 'center',
    ...NUBANK_SHADOWS.LG
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingVertical: NUBANK_SPACING.MD,
    borderBottomWidth: 1,
    borderBottomColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  modalCloseButton: {
    padding: NUBANK_SPACING.SM
  },
  modalTitle: {
    flex: 1,
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    textAlign: 'center'
  },
  modalHeaderSpacer: {
    width: 40
  },
  modalContent: {
    flex: 1,
    padding: NUBANK_SPACING.LG
  },

  // Inputs
  inputGroup: {
    marginBottom: NUBANK_SPACING.LG
  },
  inputLabel: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM
  },
  input: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },

  // Listas horizontais
  horizontalList: {
    marginTop: NUBANK_SPACING.SM
  },
  categoryItem: {
    alignItems: 'center',
    padding: NUBANK_SPACING.SM,
    marginRight: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    minWidth: 80
  },
  categoryItemSelected: {
    backgroundColor: NUBANK_COLORS.PRIMARY
  },
  categoryEmoji: {
    fontSize: 24,
    marginBottom: NUBANK_SPACING.XS
  },
  categoryText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    textAlign: 'center'
  },
  categoryTextSelected: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  },
  paymentItem: {
    alignItems: 'center',
    padding: NUBANK_SPACING.SM,
    marginRight: NUBANK_SPACING.SM,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    minWidth: 80
  },
  paymentItemSelected: {
    backgroundColor: NUBANK_COLORS.PRIMARY
  },
  paymentEmoji: {
    fontSize: 24,
    marginBottom: NUBANK_SPACING.XS
  },
  paymentText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    textAlign: 'center'
  },
  paymentTextSelected: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  },

  // Botões do modal
  modalButtons: {
    flexDirection: 'row',
    padding: NUBANK_SPACING.LG,
    gap: NUBANK_SPACING.MD
  },
  cancelButton: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingVertical: NUBANK_SPACING.MD,
    alignItems: 'center'
  },
  cancelButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  saveButton: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingVertical: NUBANK_SPACING.MD,
    alignItems: 'center'
  },
  saveButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE
  }
});
