// components/IncomeForm.js - FORMULÁRIO DE RECEITAS COM DESIGN NUBANK
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';
import {
  FadeInView
} from './AnimatedComponents';
import {
  AnimatedInput,
  CurrencyInput
} from './FormComponents';

export default function IncomeForm({
  income,
  categories,
  paymentMethods,
  establishments,
  onSave,
  onCancel
}) {
  const insets = useSafeAreaInsets();
  const db = useSQLiteContext();
  const { user } = useAuth();

  // Estados do formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: null,
    payment_method_id: null,
    establishment_id: null,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Inicializar formulário
  useEffect(() => {
    if (income) {
      setFormData({
        description: income.description || '',
        amount: income.amount?.toString() || '',
        date: income.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        categoryId: income.categoryId || null,
        payment_method_id: income.payment_method_id || null,
        establishment_id: income.establishment_id || null,
        notes: income.notes || ''
      });
    }
  }, [income]);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.description.trim()) {
      newErrors.description = 'Descrição é obrigatória';
    }

    if (!formData.amount || isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valor deve ser um número positivo';
    }

    if (!formData.date) {
      newErrors.date = 'Data é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setLoading(true);

    try {
      const incomeData = {
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        date: formData.date,
        categoryId: formData.categoryId,
        payment_method_id: formData.payment_method_id,
        establishment_id: formData.establishment_id,
        notes: formData.notes.trim(),
        user_id: user.id
      };

      if (income?.id) {
        // Atualizar receita existente
        await db.runAsync(`
          UPDATE incomes SET
            description = ?,
            amount = ?,
            date = ?,
            categoryId = ?,
            payment_method_id = ?,
            establishment_id = ?,
            notes = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ? AND user_id = ?
        `, [
          incomeData.description,
          incomeData.amount,
          incomeData.date,
          incomeData.categoryId,
          incomeData.payment_method_id,
          incomeData.establishment_id,
          incomeData.notes,
          income.id,
          user.id
        ]);
      } else {
        // Criar nova receita
        await db.runAsync(`
          INSERT INTO incomes (
            description, amount, date, categoryId, payment_method_id,
            establishment_id, notes, user_id, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `, [
          incomeData.description,
          incomeData.amount,
          incomeData.date,
          incomeData.categoryId,
          incomeData.payment_method_id,
          incomeData.establishment_id,
          incomeData.notes,
          user.id
        ]);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
    } catch (error) {
      console.error('Erro ao salvar receita:', error);
      Alert.alert('Erro', 'Falha ao salvar receita');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  // Filtrar categorias de receita
  const incomeCategories = (categories || []).filter(cat => 
    cat.type === 'receita' || !cat.type
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor={NUBANK_COLORS.PRIMARY} />
      
      {/* Header */}
      <LinearGradient
        colors={NUBANK_COLORS.GRADIENT_PRIMARY}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleCancel}
          >
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={NUBANK_COLORS.TEXT_WHITE}
            />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {income ? 'Editar Receita' : 'Nova Receita'}
          </Text>
          
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      {/* Formulário */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FadeInView delay={200} style={styles.form}>
          {/* Descrição */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Descrição *</Text>
            <AnimatedInput
              value={formData.description}
              onChangeText={(value) => updateFormData('description', value)}
              placeholder="Ex: Salário mensal"
              error={errors.description}
            />
          </View>

          {/* Valor */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Valor *</Text>
            <CurrencyInput
              value={formData.amount}
              onChangeText={(value) => updateFormData('amount', value)}
              placeholder="0,00"
              error={errors.amount}
            />
          </View>

          {/* Data */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Data *</Text>
            <AnimatedInput
              value={formData.date}
              onChangeText={(value) => updateFormData('date', value)}
              placeholder="YYYY-MM-DD"
              error={errors.date}
            />
          </View>

          {/* Categoria */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Categoria</Text>
            <TouchableOpacity style={styles.selectButton}>
              <Text style={styles.selectButtonText}>
                {(incomeCategories || []).find(cat => cat.id === formData.categoryId)?.name || 'Selecionar categoria'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={NUBANK_COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Método de Pagamento */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Método de Recebimento</Text>
            <TouchableOpacity style={styles.selectButton}>
              <Text style={styles.selectButtonText}>
                {(paymentMethods || []).find(pm => pm.id === formData.payment_method_id)?.name || 'Selecionar método'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={NUBANK_COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Estabelecimento */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Local/Empresa</Text>
            <TouchableOpacity style={styles.selectButton}>
              <Text style={styles.selectButtonText}>
                {(establishments || []).find(est => est.id === formData.establishment_id)?.name || 'Selecionar local'}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={NUBANK_COLORS.TEXT_SECONDARY} />
            </TouchableOpacity>
          </View>

          {/* Observações */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Observações</Text>
            <AnimatedInput
              value={formData.notes}
              onChangeText={(value) => updateFormData('notes', value)}
              placeholder="Observações adicionais (opcional)"
              multiline
              numberOfLines={3}
            />
          </View>
        </FadeInView>
      </ScrollView>

      {/* Botões de ação */}
      <FadeInView delay={400} style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={handleCancel}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {income ? 'Atualizar' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </FadeInView>

      {/* Loading overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={NUBANK_COLORS.PRIMARY} />
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
  },
  header: {
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: NUBANK_FONT_SIZES.LG,
    fontWeight: NUBANK_FONT_WEIGHTS.bold,
    color: NUBANK_COLORS.TEXT_WHITE,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  form: {
    padding: NUBANK_SPACING.LG,
  },
  fieldContainer: {
    marginBottom: NUBANK_SPACING.LG,
  },
  fieldLabel: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.semibold,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.XS,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER,
    borderRadius: NUBANK_BORDER_RADIUS.md,
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
  },
  selectButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
  },
  actions: {
    flexDirection: 'row',
    padding: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.MD,
    gap: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: NUBANK_COLORS.CARD_BORDER,
  },
  button: {
    flex: 1,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER,
  },
  saveButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
  },
  cancelButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.semibold,
    color: NUBANK_COLORS.TEXT_PRIMARY,
  },
  saveButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.semibold,
    color: NUBANK_COLORS.TEXT_WHITE,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});