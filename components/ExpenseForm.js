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
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { validators, sanitizers } from "../utils/validationUtils";
import ExpenseCategoryList from "./ExpenseCategoryList";
import ExpenseEstablishmentList from "./ExpenseEstablishmentList";

export default function ExpenseForm({ expense, onSaved }) {
  const db = useSQLiteContext();
  const [amount, setAmount] = useState(expense?.amount?.toString() || "");
  const [description, setDescription] = useState(expense?.description || "");
  const [selectedCategory, setSelectedCategory] = useState(expense?.categoryId || null);
  const [selectedEstablishment, setSelectedEstablishment] = useState(expense?.establishment_id || null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  console.log("🔍 ExpenseForm renderizando com categoria e estabelecimento...");

  function handleCategorySelect(categoryId) {
    setSelectedCategory(categoryId);
    console.log("Categoria selecionada:", categoryId);
  }

  function handleEstablishmentSelect(establishmentId) {
    setSelectedEstablishment(establishmentId);
    console.log("Estabelecimento selecionado:", establishmentId);
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
      selectedEstablishment 
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

      console.log('💾 Dados limpos:', { 
        cleanDescription, 
        valor, 
        selectedCategory, 
        selectedEstablishment 
      });

      if (expense?.id) {
        // Atualização
        await db.runAsync(
          `UPDATE expenses 
           SET amount = ?, description = ?, categoryId = ?, establishment_id = ?
           WHERE id = ?`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment, expense.id]
        );
        console.log('✅ Despesa atualizada!');
      } else {
        // Inserção
        await db.runAsync(
          `INSERT INTO expenses (amount, description, categoryId, establishment_id, date)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [valor, cleanDescription, selectedCategory, selectedEstablishment]
        );
        console.log('✅ Despesa criada!');
      }

      // Limpa formulário apenas se for novo cadastro
      if (!expense?.id) {
        setAmount("");
        setDescription("");
        setSelectedCategory(null);
        setSelectedEstablishment(null);
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

  const isFormValid = selectedCategory && !Object.keys(errors).length && description.trim() && amount.trim();

  if (saving) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.loadingText}>Salvando despesa...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {expense?.id ? "✏️ Editar Despesa" : "💰 Nova Despesa"}
        </Text>
        <Text style={styles.subtitle}>
          Preencha todos os campos obrigatórios
        </Text>
      </View>

      {/* Formulário */}
      <View style={styles.form}>
        
        {/* Descrição */}
        <View style={styles.field}>
          <Text style={styles.label}>📝 Descrição *</Text>
          <TextInput
            style={[
              styles.input, 
              errors.description && styles.inputError,
              description.trim() && !errors.description && styles.inputSuccess
            ]}
            placeholder="Ex: Almoço no restaurante"
            value={description}
            onChangeText={setDescription}
            maxLength={100}
          />
          {errors.description && (
            <Text style={styles.errorText}>⚠️ {errors.description}</Text>
          )}
          <Text style={styles.charCount}>{description.length}/100</Text>
        </View>

        {/* Valor */}
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
              value={amount}
              onChangeText={handleAmountChange}
              keyboardType="numeric"
            />
          </View>
          {errors.amount && (
            <Text style={styles.errorText}>⚠️ {errors.amount}</Text>
          )}
        </View>

        {/* Categoria */}
        <View style={styles.field}>
          <Text style={styles.label}>📂 Categoria *</Text>
          <ExpenseCategoryList 
            selectedCategory={selectedCategory}
            onCategorySelect={handleCategorySelect}
          />
          {selectedCategory && (
            <Text style={styles.successText}>✅ Categoria selecionada</Text>
          )}
        </View>

        {/* Estabelecimento */}
        <View style={styles.field}>
          <Text style={styles.label}>🏪 Estabelecimento</Text>
          <Text style={styles.fieldDescription}>
            Vincule um estabelecimento onde o gasto foi realizado (opcional)
          </Text>
          <ExpenseEstablishmentList 
            selectedEstablishment={selectedEstablishment}
            onEstablishmentSelect={handleEstablishmentSelect}
          />
          {selectedEstablishment && (
            <Text style={styles.successText}>✅ Estabelecimento vinculado</Text>
          )}
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Progresso: {[description.trim(), amount.trim(), selectedCategory].filter(Boolean).length}/3 campos obrigatórios preenchidos
          </Text>
          <View style={styles.progressBar}>
            <View style={[
              styles.progressFill, 
              { width: `${([description.trim(), amount.trim(), selectedCategory].filter(Boolean).length / 3) * 100}%` }
            ]} />
          </View>
          {selectedEstablishment && (
            <Text style={styles.progressBonus}>
              🎯 Estabelecimento vinculado (+1 bonus)
            </Text>
          )}
        </View>

        {/* Botão Salvar */}
        <TouchableOpacity 
          style={[
            styles.saveButton, 
            isFormValid ? styles.saveButtonActive : styles.saveButtonInactive
          ]} 
          onPress={handleSave} 
          disabled={!isFormValid || saving}
        >
          <Text style={[
            styles.saveButtonText,
            isFormValid ? styles.saveButtonTextActive : styles.saveButtonTextInactive
          ]}>
            {saving ? "Salvando..." : (expense?.id ? "💾 Atualizar Despesa" : "💾 Salvar Despesa")}
          </Text>
        </TouchableOpacity>

        {/* Notificação automática */}
        <View style={styles.autoUpdateInfo}>
          <Text style={styles.autoUpdateText}>
            🚀 O resumo diário será atualizado automaticamente após salvar!
          </Text>
        </View>

        {/* Debug Info */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            Debug: Desc={description.length}, Valor={amount.length}, Cat={selectedCategory || 'null'}, Est={selectedEstablishment || 'null'}
          </Text>
        </View>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  header: {
    backgroundColor: '#ffffff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },

  form: {
    padding: 20,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  fieldDescription: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
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

  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingLeft: 12,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
  },

  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
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
    marginTop: 4,
    fontWeight: '600',
  },

  saveButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonActive: {
    backgroundColor: '#10b981',
  },
  saveButtonInactive: {
    backgroundColor: '#e5e7eb',
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

  // Notificação automática
  autoUpdateInfo: {
    backgroundColor: '#dcfce7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  autoUpdateText: {
    fontSize: 14,
    color: '#166534',
    textAlign: 'center',
    fontWeight: '600',
  },

  debugContainer: {
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },

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