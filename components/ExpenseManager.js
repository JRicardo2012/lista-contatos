// components/ExpenseManager.js - VERSÃO SIMPLIFICADA SEM ABAS
import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  FlatList
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { validators, sanitizers } from "../utils/validationUtils";
import ExpenseCategoryList from "./ExpenseCategoryList";
import ExpenseEstablishmentList from "./ExpenseEstablishmentList";
import ExpensePaymentMethodList from "./ExpensePaymentMethodList";

export default function ExpenseManager() {
  const db = useSQLiteContext();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados do formulário
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedEstablishment, setSelectedEstablishment] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (db) {
      loadExpenses();
    }
  }, [db]);

  useEffect(() => {
    const newErrors = {};
    
    if (description.trim()) {
      const descError = validators.description(description);
      if (descError) newErrors.description = descError;
    }
    
    if (amount.trim()) {
      const amountError = validators.amount(amount);
      if (amountError) newErrors.amount = amountError;
    }
    
    setErrors(newErrors);
  }, [description, amount]);

  async function loadExpenses() {
    try {
      const result = await db.getAllAsync(`
        SELECT 
          e.id,
          e.description,
          CAST(e.amount AS REAL) as amount,
          e.date,
          e.categoryId,
          e.establishment_id,
          e.payment_method_id,
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.icon, '📦') as icon,
          COALESCE(pm.name, '') as payment_method,
          COALESCE(pm.icon, '') as payment_icon,
          COALESCE(est.name, '') as establishment
        FROM expenses e
        LEFT JOIN categories c ON e.categoryId = c.id
        LEFT JOIN payment_methods pm ON e.payment_method_id = pm.id
        LEFT JOIN establishments est ON e.establishment_id = est.id
        ORDER BY e.date DESC
        LIMIT 20
      `);
      
      setExpenses(result);
    } catch (error) {
      console.error('Erro ao carregar despesas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const openNewExpenseModal = () => {
    setEditingExpense(null);
    setAmount("");
    setDescription("");
    setSelectedCategory(null);
    setSelectedEstablishment(null);
    setSelectedPaymentMethod(null);
    setSelectedDate(new Date());
    setModalVisible(true);
  };

  const openEditExpenseModal = (expense) => {
    setEditingExpense(expense);
    setAmount(expense.amount.toString());
    setDescription(expense.description);
    setSelectedCategory(expense.categoryId);
    setSelectedEstablishment(expense.establishment_id);
    setSelectedPaymentMethod(expense.payment_method_id);
    setSelectedDate(new Date(expense.date));
    setModalVisible(true);
  };

  function notifyExpenseChange() {
    if (global.expenseListeners) {
      global.expenseListeners.forEach(callback => {
        if (typeof callback === 'function') {
          callback();
        }
      });
    }
  }

  async function handleSave() {
    const descError = validators.description(description);
    const amountError = validators.amount(amount);
    
    if (descError || amountError || !selectedCategory) {
      const newErrors = {};
      if (descError) newErrors.description = descError;
      if (amountError) newErrors.amount = amountError;
      setErrors(newErrors);
      
      if (!selectedCategory) {
        Alert.alert("Validação", "Selecione uma categoria.");
      }
      return;
    }

    setSaving(true);

    try {
      const cleanDescription = sanitizers.text(description);
      const cleanAmount = sanitizers.currency(amount);
      const valor = parseFloat(cleanAmount.replace(',', '.'));
      const dateISO = selectedDate.toISOString();

      if (editingExpense?.id) {
        await db.runAsync(
          `UPDATE expenses 
           SET amount = ?, description = ?, categoryId = ?, establishment_id = ?, payment_method_id = ?, date = ?
           WHERE id = ?`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment, selectedPaymentMethod, dateISO, editingExpense.id]
        );
        Alert.alert("Sucesso", "Despesa atualizada!");
      } else {
        await db.runAsync(
          `INSERT INTO expenses (amount, description, categoryId, establishment_id, payment_method_id, date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment, selectedPaymentMethod, dateISO]
        );
        Alert.alert("Sucesso", "Despesa adicionada!");
      }

      setModalVisible(false);
      await loadExpenses();
      notifyExpenseChange();

    } catch (error) {
      console.error("❌ Erro ao salvar despesa:", error);
      Alert.alert("Erro", "Não foi possível salvar a despesa.");
    } finally {
      setSaving(false);
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
              notifyExpenseChange();
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
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  }

  function formatCurrencyInput(text) {
    const cleaned = text.replace(/[^0-9,]/g, '');
    const parts = cleaned.split(',');
    if (parts.length > 2) {
      return parts[0] + ',' + parts[1];
    }
    return cleaned;
  }

  function handleAmountChange(text) {
    const formatted = formatCurrencyInput(text);
    setAmount(formatted);
  }

  function formatDateBR(date) {
    return date.toLocaleDateString('pt-BR');
  }

  function formatDate(dateString) {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const localDate = new Date(date.getTime() + date.getTimezoneOffset() * 60000);
      
      if (localDate.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (localDate.toDateString() === yesterday.toDateString()) {
        return 'Ontem';
      } else {
        return localDate.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
      }
    } catch (error) {
      return dateString;
    }
  }

  function getDateText(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return formatDateBR(date);
  }

  const CustomDatePicker = () => {
    const [tempDate, setTempDate] = useState(selectedDate);
    
    const generateDateOptions = () => {
      const dates = [];
      for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date);
      }
      return dates;
    };

    const dateOptions = generateDateOptions();

    return (
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📅 Selecionar Data</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {dateOptions.map((date, index) => {
                const isSelected = tempDate.toDateString() === date.toDateString();
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.dateOption,
                      isSelected && styles.dateOptionSelected
                    ]}
                    onPress={() => setTempDate(date)}
                  >
                    <View style={styles.dateOptionContent}>
                      <Text style={[
                        styles.dateOptionMain,
                        isSelected && styles.dateOptionMainSelected
                      ]}>
                        {getDateText(date)}
                      </Text>
                      <Text style={[
                        styles.dateOptionSub,
                        isSelected && styles.dateOptionSubSelected
                      ]}>
                        {formatDateBR(date)}
                      </Text>
                    </View>
                    {isSelected && (
                      <Text style={styles.dateCheckmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => {
                  setSelectedDate(tempDate);
                  setShowDatePicker(false);
                }}
              >
                <Text style={styles.saveButtonText}>✓ Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderExpensePreview = () => {
    const hasData = description || amount || selectedCategory;
    
    if (!hasData) return null;

    return (
      <View style={styles.previewContainer}>
        <Text style={styles.previewLabel}>Preview:</Text>
        <View style={styles.previewCard}>
          <View style={styles.previewIcon}>
            <Text style={styles.previewIconText}>💰</Text>
          </View>
          <View style={styles.previewContent}>
            <Text style={styles.previewName}>
              {description || 'Descrição da despesa'}
            </Text>
            <Text style={styles.previewAmount}>
              {amount ? formatCurrency(parseFloat(amount.replace(',', '.')) || 0) : 'R$ 0,00'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExpenses();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Carregando despesas...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.titleIcon}>💰</Text>
              <Text style={styles.title}>Despesas</Text>
            </View>
            <Text style={styles.subtitle}>
              {expenses.length === 0 
                ? "Registre suas despesas" 
                : `${expenses.length} despesa${expenses.length !== 1 ? 's' : ''} registrada${expenses.length !== 1 ? 's' : ''}`
              }
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.addButton}
            onPress={openNewExpenseModal}
          >
            <Text style={styles.addButtonIcon}>+</Text>
            <Text style={styles.addButtonText}>Nova</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Despesas */}
      {expenses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>💰</Text>
          <Text style={styles.emptyTitle}>Nenhuma despesa ainda</Text>
          <Text style={styles.emptySubtitle}>
            Comece a registrar suas despesas para ter controle dos seus gastos!
          </Text>
          <TouchableOpacity 
            style={styles.emptyButton}
            onPress={openNewExpenseModal}
          >
            <Text style={styles.emptyButtonText}>➕ Criar Primeira Despesa</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => `expense-${item.id}`}
          renderItem={({ item, index }) => (
            <View style={[styles.expenseCard, { marginTop: index === 0 ? 0 : 6 }]}>
              <TouchableOpacity 
                style={styles.expenseContent}
                onPress={() => openEditExpenseModal(item)}
                activeOpacity={0.8}
              >
                <View style={styles.expenseIconContainer}>
                  <Text style={styles.expenseIconText}>{item.icon}</Text>
                </View>
                
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseName}>{item.description}</Text>
                  <View style={styles.expenseMeta}>
                    <Text style={styles.expenseCategory}>{item.category}</Text>
                    {item.payment_method && (
                      <Text style={styles.expensePayment}>• {item.payment_icon} {item.payment_method}</Text>
                    )}
                  </View>
                  <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
                </View>
                
                <View style={styles.expenseRight}>
                  <Text style={styles.expenseAmount}>{formatCurrency(item.amount)}</Text>
                  <Text style={styles.editIcon}>✏️</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id, item.description)}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteButtonText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Modal do Formulário */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header do Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingExpense ? '✏️ Editar Despesa' : '➕ Nova Despesa'}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Formulário */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Campos Básicos */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>📝 Descrição *</Text>
                <TextInput
                  style={[styles.textInput, errors.description && styles.inputError]}
                  placeholder="Ex: Almoço no restaurante"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={100}
                  autoFocus={true}
                />
                {errors.description && (
                  <Text style={styles.errorText}>{errors.description}</Text>
                )}
                <Text style={styles.charCounter}>{description.length}/100</Text>
              </View>

              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>💰 Valor *</Text>
                <View style={[styles.amountContainer, errors.amount && styles.inputError]}>
                  <Text style={styles.currency}>R$</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0,00"
                    value={amount}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                  />
                </View>
                {errors.amount && (
                  <Text style={styles.errorText}>{errors.amount}</Text>
                )}
              </View>

              {/* Data */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>📅 Data *</Text>
                <TouchableOpacity
                  style={styles.dateSelector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={styles.dateSelectorIcon}>📅</Text>
                  <View style={styles.dateSelectorContent}>
                    <Text style={styles.dateSelectorMain}>
                      {getDateText(selectedDate)}
                    </Text>
                    <Text style={styles.dateSelectorSub}>
                      {formatDateBR(selectedDate)}
                    </Text>
                  </View>
                  <Text style={styles.dateSelectorArrow}>▼</Text>
                </TouchableOpacity>
              </View>

              {/* Categoria */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>📂 Categoria *</Text>
                <ExpenseCategoryList 
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                />
              </View>

              {/* Forma de Pagamento */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>💳 Forma de Pagamento</Text>
                <ExpensePaymentMethodList 
                  selectedMethod={selectedPaymentMethod}
                  onMethodSelect={setSelectedPaymentMethod}
                />
              </View>

              {/* Estabelecimento */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>🏪 Estabelecimento</Text>
                <ExpenseEstablishmentList 
                  selectedEstablishment={selectedEstablishment}
                  onEstablishmentSelect={setSelectedEstablishment}
                />
              </View>

              {/* Preview */}
              {renderExpensePreview()}
            </ScrollView>

            {/* Footer com Botões */}
            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.saveButton,
                  (!description.trim() || !amount.trim() || !selectedCategory) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={!description.trim() || !amount.trim() || !selectedCategory || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingExpense ? '💾 Salvar' : '➕ Criar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker Modal */}
      <CustomDatePicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingTop: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  addButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonIcon: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginRight: 6,
  },
  addButtonText: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  expenseCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'stretch',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.08)',
    minHeight: 80,
  },
  expenseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  expenseIconContainer: {
    width: 40,
    height: 40,
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.12)',
  },
  expenseIconText: {
    fontSize: 18,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  expenseCategory: {
    fontSize: 12,
    color: '#64748b',
  },
  expensePayment: {
    fontSize: 12,
    color: '#64748b',
  },
  expenseDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  expenseRight: {
    alignItems: 'flex-end',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  editIcon: {
    fontSize: 14,
    opacity: 0.4,
    color: '#6366f1',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    minWidth: 48,
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(239, 68, 68, 0.12)',
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#ef4444',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
    opacity: 0.3,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  emptyButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f9fc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    width: '92%',
    maxHeight: '85%',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.2,
    shadowRadius: 48,
    elevation: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1e293b',
  },
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '500',
  },
  modalBody: {
    padding: 24,
    maxHeight: 450,
  },
  fieldContainer: {
    marginBottom: 24,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 16,
    backgroundColor: '#fafbfc',
    color: '#1e293b',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },
  charCounter: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 6,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingLeft: 18,
    backgroundColor: '#fafbfc',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    paddingRight: 18,
    fontSize: 16,
    color: '#1e293b',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 16,
    backgroundColor: '#fafbfc',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  dateSelectorIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  dateSelectorContent: {
    flex: 1,
  },
  dateSelectorMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  dateSelectorSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  dateSelectorArrow: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dateOptionSelected: {
    backgroundColor: '#f0f4ff',
  },
  dateOptionContent: {
    flex: 1,
  },
  dateOptionMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  dateOptionMainSelected: {
    color: '#6366f1',
  },
  dateOptionSub: {
    fontSize: 13,
    color: '#6b7280',
  },
  dateOptionSubSelected: {
    color: '#6366f1',
  },
  dateCheckmark: {
    fontSize: 18,
    color: '#6366f1',
    fontWeight: '700',
  },
  previewContainer: {
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 16,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  previewIconText: {
    fontSize: 20,
  },
  previewContent: {
    flex: 1,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#1e293b',
    marginBottom: 4,
  },
  previewAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748b',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#d1d5db',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});