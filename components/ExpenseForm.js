import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { validators, sanitizers } from "../utils/validationUtils";
import ExpenseCategoryList from "./ExpenseCategoryList";
import ExpenseEstablishmentList from "./ExpenseEstablishmentList";
import ExpensePaymentMethodList from "./ExpensePaymentMethodList";

export default function ExpenseForm({ expense, onSaved }) {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [selectedCategory, setSelectedCategory] = useState(expense?.categoryId || null);
  const [selectedEstablishment, setSelectedEstablishment] = useState(expense?.establishment_id || null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(expense?.payment_method_id || null);
  const [selectedDate, setSelectedDate] = useState(expense?.date ? new Date(expense.date) : new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  console.log("🔍 ExpenseForm renderizando com categoria, estabelecimento, pagamento e data...");

  function handleCategorySelect(categoryId) {
    setSelectedCategory(categoryId);
    console.log("Categoria selecionada:", categoryId);
  }

  function handleEstablishmentSelect(establishmentId) {
    setSelectedEstablishment(establishmentId);
    console.log("Estabelecimento selecionado:", establishmentId);
  }

  function handlePaymentMethodSelect(paymentMethodId) {
    setSelectedPaymentMethod(paymentMethodId);
    console.log("Forma de pagamento selecionada:", paymentMethodId);
  }

  function handleDateSelect(date) {
    setSelectedDate(date);
    setShowDatePicker(false);
    console.log("Data selecionada:", date);
  }

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

  // Função para notificar outras telas sobre mudanças
  function notifyExpenseChange() {
    // Dispara evento global para atualizar outras telas
    if (global.expenseListeners) {
      global.expenseListeners.forEach(callback => {
        if (typeof callback === 'function') {
          callback();
        }
      });
    }
  }

  async function handleSave() {
    console.log('🔧 Salvando despesa...', { 
      description, 
      amount, 
      selectedCategory, 
      selectedEstablishment,
      selectedPaymentMethod,
      selectedDate: selectedDate.toISOString()
    });
    
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

      console.log('💾 Dados limpos:', { 
        cleanDescription, 
        valor, 
        selectedCategory, 
        selectedEstablishment,
        selectedPaymentMethod,
        dateISO
      });

      if (expense?.id) {
        // Atualização
        await db.runAsync(
          `UPDATE expenses 
           SET amount = ?, description = ?, categoryId = ?, establishment_id = ?, payment_method_id = ?, date = ?
           WHERE id = ?`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment, selectedPaymentMethod, dateISO, expense.id]
        );
        console.log('✅ Despesa atualizada!');
      } else {
        // Inserção
        await db.runAsync(
          `INSERT INTO expenses (amount, description, categoryId, establishment_id, payment_method_id, date)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment, selectedPaymentMethod, dateISO]
        );
        console.log('✅ Despesa criada!');
      }

      // Limpa formulário apenas se for novo cadastro
      if (!expense?.id) {
        setAmount("");
        setDescription("");
        setSelectedCategory(null);
        setSelectedEstablishment(null);
        setSelectedPaymentMethod(null);
        setSelectedDate(new Date()); // Volta para hoje
      }

      // 🚀 NOTIFICA AUTOMATICAMENTE OUTRAS TELAS
      console.log('📢 Notificando outras telas sobre mudança...');
      notifyExpenseChange();

      Alert.alert("Sucesso", expense?.id ? "Despesa atualizada!" : "Despesa adicionada!");
      if (onSaved) onSaved();

    } catch (error) {
      console.error("❌ Erro ao salvar despesa:", error);
      Alert.alert("Erro", "Não foi possível salvar a despesa.");
    } finally {
      setSaving(false);
    }
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

  // Função para formatar data brasileira
  function formatDateBR(date) {
    return date.toLocaleDateString('pt-BR');
  }

  // Função para verificar se é hoje
  function isToday(date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  // Função para verificar se é ontem
  function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  // Função para obter texto da data
  function getDateText(date) {
    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    return formatDateBR(date);
  }

  // Componente DatePicker customizado
  const CustomDatePicker = () => {
    const [tempDate, setTempDate] = useState(selectedDate);
    
    // Gera últimos 30 dias
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
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerHeader}>
              <Text style={styles.datePickerTitle}>📅 Selecionar Data</Text>
              <TouchableOpacity 
                onPress={() => setShowDatePicker(false)}
                style={styles.closeDatePicker}
              >
                <Text style={styles.closeDatePickerText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.dateOptionsList}>
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

            <View style={styles.datePickerFooter}>
              <TouchableOpacity 
                style={styles.cancelDateButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.cancelDateButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.confirmDateButton}
                onPress={() => handleDateSelect(tempDate)}
              >
                <Text style={styles.confirmDateButtonText}>✓ Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const isFormValid = selectedCategory && !Object.keys(errors).length && description.trim() && amount.trim();
  const filledFields = [description.trim(), amount.trim(), selectedCategory].filter(Boolean).length;
  const progressPercentage = (filledFields / 3) * 100;

  if (saving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Salvando despesa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {expense?.id ? "✏️ Editar Despesa" : "💰 Nova Despesa"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Registre seus gastos de forma organizada
          </Text>
        </View>

        {/* Card 1: Dados Básicos */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <View style={styles.field}>
              <Text style={styles.label}>📝 Descrição *</Text>
              <TextInput
                style={[
                  styles.input, 
                  errors.description && styles.inputError,
                  description.trim() && !errors.description && styles.inputSuccess
                ]}
                placeholder="Ex: Almoço no restaurante, Combustível"
                placeholderTextColor="#9ca3af"
                value={description}
                onChangeText={setDescription}
                maxLength={100}
              />
              {errors.description && (
                <Text style={styles.errorText}>⚠️ {errors.description}</Text>
              )}
              <Text style={styles.charCount}>{description.length}/100</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>💰 Valor *</Text>
              <View style={[
                styles.amountContainer,
                errors.amount && styles.inputError,
                amount.trim() && !errors.amount && styles.inputSuccess
              ]}>
                <Text style={styles.currency}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="25,50"
                  placeholderTextColor="#9ca3af"
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                />
              </View>
              {errors.amount && (
                <Text style={styles.errorText}>⚠️ {errors.amount}</Text>
              )}
            </View>

            {/* NOVO: Campo de Data */}
            <View style={styles.field}>
              <Text style={styles.label}>📅 Data *</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <View style={styles.dateSelectorContent}>
                  <View style={styles.dateSelectorLeft}>
                    <Text style={styles.dateSelectorIcon}>📅</Text>
                    <View style={styles.dateSelectorTextContainer}>
                      <Text style={styles.dateSelectorMain}>
                        {getDateText(selectedDate)}
                      </Text>
                      <Text style={styles.dateSelectorSub}>
                        {formatDateBR(selectedDate)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dateSelectorArrow}>▼</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Card 2: Categoria e Forma de Pagamento */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            {/* Categoria */}
            <View style={styles.field}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>📂</Text>
                <Text style={styles.cardTitle}>Categoria *</Text>
                {selectedCategory && (
                  <View style={[styles.statusBadge, {backgroundColor: '#10b981'}]}>
                    <Text style={styles.statusText}>✓</Text>
                  </View>
                )}
              </View>
              <ExpenseCategoryList 
                selectedCategory={selectedCategory}
                onCategorySelect={handleCategorySelect}
              />
            </View>

            {/* Forma de Pagamento */}
            <View style={[styles.field, {marginTop: 20}]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>💳</Text>
                <Text style={styles.cardTitle}>Forma de Pagamento</Text>
                <Text style={styles.optionalLabel}>(recomendado)</Text>
                {selectedPaymentMethod && (
                  <View style={[styles.statusBadge, {backgroundColor: '#8b5cf6'}]}>
                    <Text style={styles.statusText}>✓</Text>
                  </View>
                )}
              </View>
              <ExpensePaymentMethodList 
                selectedMethod={selectedPaymentMethod}
                onMethodSelect={handlePaymentMethodSelect}
              />
            </View>
          </View>
        </View>

        {/* Card 3: Estabelecimento */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🏪</Text>
            <Text style={styles.cardTitle}>Estabelecimento</Text>
            <Text style={styles.optionalLabel}>(opcional)</Text>
            {selectedEstablishment && (
              <View style={[styles.statusBadge, {backgroundColor: '#3b82f6'}]}>
                <Text style={styles.statusText}>✓</Text>
              </View>
            )}
          </View>
          
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldDescription}>
              Onde você realizou esta despesa?
            </Text>
            <ExpenseEstablishmentList 
              selectedEstablishment={selectedEstablishment}
              onEstablishmentSelect={handleEstablishmentSelect}
            />
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Progresso: {filledFields}/3 campos obrigatórios
            </Text>
            <Text style={styles.progressPercentage}>
              {Math.round(progressPercentage)}%
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { width: `${progressPercentage}%` }
            ]} />
          </View>
          <View style={styles.progressBonusContainer}>
            {selectedPaymentMethod && (
              <Text style={styles.progressBonus}>
                💳 Forma de pagamento (+1 bonus)
              </Text>
            )}
            {selectedEstablishment && (
              <Text style={styles.progressBonus}>
                🏪 Estabelecimento (+1 bonus)
              </Text>
            )}
          </View>
        </View>

        {/* Auto-update Info */}
        <View style={styles.autoUpdateInfo}>
          <Text style={styles.autoUpdateText}>
            🚀 O resumo será atualizado automaticamente após salvar!
          </Text>
        </View>

        {/* Espaço para o botão não ficar grudado nos controles do celular */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Botão Fixo na Parte Inferior */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            isFormValid ? styles.saveButtonActive : styles.saveButtonInactive
          ]} 
          onPress={handleSave} 
          disabled={!isFormValid || saving}
        >
          {saving ? (
            <View style={styles.savingContainer}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.saveButtonText}>Salvando...</Text>
            </View>
          ) : (
            <Text style={[
              styles.saveButtonText,
              isFormValid ? styles.saveButtonTextActive : styles.saveButtonTextInactive
            ]}>
              {expense?.id ? "💾 Atualizar Despesa" : "💾 Salvar Despesa"}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <CustomDatePicker />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // ScrollView
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90, // Espaço para o botão fixo
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },

  // Cards
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 20,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },

  optionalLabel: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginRight: 8,
  },

  statusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Fields
  fieldGroup: {
    gap: 16,
  },
  
  field: {
    marginBottom: 0,
  },
  
  fieldDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },

  inputError: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },

  inputSuccess: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },

  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },

  successText: {
    color: '#10b981',
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500',
  },

  charCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },

  // Amount Field
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingLeft: 16,
  },

  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },

  amountInput: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 16,
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '500',
  },

  // NOVO: Date Selector
  dateSelector: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  dateSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  dateSelectorIcon: {
    fontSize: 20,
    marginRight: 12,
  },

  dateSelectorTextContainer: {
    flex: 1,
  },

  dateSelectorMain: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },

  dateSelectorSub: {
    fontSize: 13,
    color: '#6b7280',
  },

  dateSelectorArrow: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '600',
  },

  // Date Picker Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },

  datePickerContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },

  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },

  datePickerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },

  closeDatePicker: {
    width: 32,
    height: 32,
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeDatePickerText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: 'bold',
  },

  dateOptionsList: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },

  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
  },

  dateOptionSelected: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
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
    color: '#1e40af',
    fontWeight: '700',
  },

  dateOptionSub: {
    fontSize: 13,
    color: '#6b7280',
  },

  dateOptionSubSelected: {
    color: '#3b82f6',
  },

  dateCheckmark: {
    fontSize: 18,
    color: '#3b82f6',
    fontWeight: '700',
  },

  datePickerFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 12,
  },

  cancelDateButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },

  cancelDateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },

  confirmDateButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },

  confirmDateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Progress
  progressContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  progressText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },

  progressPercentage: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '700',
  },

  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    borderRadius: 3,
  },

  progressBonus: {
    fontSize: 12,
    color: '#3b82f6',
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },

  progressBonusContainer: {
    marginTop: 8,
    gap: 4,
  },

  // Auto Update Info
  autoUpdateInfo: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },

  autoUpdateText: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 12,
  },

  // Bottom Container (Botão Fixo)
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    padding: 16,
    paddingBottom: 34, // Espaço extra para não interferir com controles do celular
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },

  // Save Button
  saveButton: {
    borderRadius: 6,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  saveButtonActive: {
    backgroundColor: '#10b981',
  },

  saveButtonInactive: {
    backgroundColor: '#e5e7eb',
    shadowOpacity: 0,
    elevation: 0,
  },

  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  saveButtonTextActive: {
    color: '#ffffff',
  },

  saveButtonTextInactive: {
    color: '#9ca3af',
  },

  savingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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