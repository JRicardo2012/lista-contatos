// components/EstablishmentCategoryFormWithPreview.js - FORMULÁRIO COM PRÉVIA
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '../services/AuthContext';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

// Ícones disponíveis para categorias de estabelecimentos
const AVAILABLE_ESTABLISHMENT_ICONS = [
  // Alimentação
  '🍽️', '🛒', '☕', '🍔', '🍕', '🍻', '🧊', '🥪', '🌮', '🍜',
  // Saúde & Bem-estar
  '💊', '🏥', '💄', '💇', '🦷', '👁️', '🩺', '💉', '🏋️', '🧘',
  // Comércio & Serviços
  '🏪', '⛽', '🏦', '👕', '👟', '📱', '📚', '🔧', '🔌', '🚿',
  // Educação & Lazer
  '🏫', '🎬', '🎭', '🎪', '🎨', '🏛️', '📖', '🎵', '🎮', '🎯',
  // Transporte & Veículos
  '🚗', '🚕', '🚌', '🚲', '⛽', '🛻', '🏍️', '🛵', '🚁', '✈️',
  // Casa & Construção
  '🏠', '🔨', '🪚', '🎨', '🪜', '🧱', '🚪', '🪟', '💡', '🔧',
  // Animais & Plantas
  '🐾', '🌳', '🌸', '🌿', '🐕', '🐱', '🐦', '🐠', '🦎', '🕷️',
  // Jurídico & Profissional
  '⚖️', '💼', '📊', '📈', '💰', '📋', '✍️', '🎓', '👔', '🤝',
  // Hospedagem & Turismo
  '🏨', '🏖️', '⛰️', '🗺️', '📷', '🧳', '🎒', '⛺', '🏕️', '🚠'
];

export default function EstablishmentCategoryFormWithPreview({ visible, category, onClose, onSaved }) {
  const db = useSQLiteContext();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    icon: '🏪'
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializa valores do formulário
  useEffect(() => {
    if (visible) {
      setFormData({
        name: category?.name || '',
        icon: category?.icon || '🏪'
      });
      setErrors({});
    }
  }, [visible, category]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    } else if (formData.name.trim().length > 50) {
      newErrors.name = 'Nome deve ter no máximo 50 caracteres';
    }

    if (!formData.icon) {
      newErrors.icon = 'Escolha um ícone para a categoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Atenção', 'Por favor, corrija os erros no formulário', [{ text: 'Entendi' }]);
      return;
    }

    if (!user) {
      Alert.alert('Erro', 'Você precisa estar logado para gerenciar categorias de estabelecimentos.', [{ text: 'Entendi' }]);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = {
        name: formData.name.trim(),
        icon: formData.icon,
        user_id: user.id
      };

      // Verificar se tabela establishment_categories existe
      try {
        await db.getAllAsync('SELECT 1 FROM establishment_categories LIMIT 1');
      } catch (tableError) {
        Alert.alert('Erro', 'A funcionalidade de categorias requer atualização do banco. Feche e abra o aplicativo novamente.', [{ text: 'Entendi' }]);
        return;
      }

      if (category?.id) {
        // Verificar se já existe outra categoria com o mesmo nome
        const existingCategory = await db.getFirstAsync(
          'SELECT id FROM establishment_categories WHERE name = ? AND user_id = ? AND id != ?',
          [data.name, user.id, category.id]
        );

        if (existingCategory) {
          Alert.alert('Atenção', 'Já existe uma categoria de estabelecimento com este nome.', [{ text: 'Entendi' }]);
          return;
        }

        // Atualização
        await db.runAsync(
          `UPDATE establishment_categories 
           SET name = ?, icon = ?, updated_at = datetime('now')
           WHERE id = ? AND user_id = ?`,
          [data.name, data.icon, category.id, user.id]
        );
        
        console.log('✅ Categoria de estabelecimento atualizada:', category.id);
      } else {
        // Verificar se já existe categoria com o mesmo nome
        const existingCategory = await db.getFirstAsync(
          'SELECT id FROM establishment_categories WHERE name = ? AND user_id = ?',
          [data.name, user.id]
        );

        if (existingCategory) {
          Alert.alert('Atenção', 'Já existe uma categoria de estabelecimento com este nome.', [{ text: 'Entendi' }]);
          return;
        }

        // Inserção
        const result = await db.runAsync(
          'INSERT INTO establishment_categories (name, icon, user_id) VALUES (?, ?, ?)',
          [data.name, data.icon, data.user_id]
        );
        
        console.log('✅ Nova categoria de estabelecimento criada com ID:', result.lastInsertRowId);
      }

      // Notifica listeners globais
      if (global.expenseListeners) {
        global.expenseListeners.forEach(listener => {
          if (typeof listener === 'function') {
            listener();
          }
        });
      }

      if (onSaved) onSaved();
      if (onClose) onClose();
    } catch (error) {
      console.error('❌ Erro ao salvar categoria de estabelecimento:', error);
      Alert.alert('Erro', 'Não foi possível salvar a categoria. Tente novamente.', [{ text: 'Entendi' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Remove erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.modalContainer}>
            {/* Header com gradiente */}
            <LinearGradient
              colors={NUBANK_COLORS.GRADIENT_PRIMARY}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>
                    {category?.id ? 'Editar Categoria' : 'Nova Categoria'}
                  </Text>
                  <Text style={styles.subtitle}>
                    {category?.id ? 'Atualize as informações da categoria' : 'Crie uma nova categoria para estabelecimentos'}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  disabled={isSubmitting}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={NUBANK_COLORS.TEXT_WHITE}
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            {/* Corpo do formulário */}
            <ScrollView
              style={styles.body}
              contentContainerStyle={styles.bodyContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Campo Nome */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Nome da Categoria *</Text>
                <View style={[styles.inputWrapper, errors.name && styles.inputError]}>
                  <MaterialCommunityIcons
                    name="tag"
                    size={20}
                    color={errors.name ? NUBANK_COLORS.ERROR : NUBANK_COLORS.TEXT_SECONDARY}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={(value) => updateFormData('name', value)}
                    placeholder="Ex: Restaurante, Supermercado, Farmácia"
                    placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                    maxLength={50}
                    editable={!isSubmitting}
                  />
                </View>
                {errors.name && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={14}
                      color={NUBANK_COLORS.ERROR}
                    />
                    <Text style={styles.errorText}>{errors.name}</Text>
                  </View>
                )}
                <Text style={styles.charCounter}>{formData.name.length}/50</Text>
              </View>

              {/* Seletor de Ícones */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Ícone *</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.iconContainer}
                  contentContainerStyle={styles.iconContent}
                >
                  {AVAILABLE_ESTABLISHMENT_ICONS.map((icon, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.iconOption,
                        formData.icon === icon && styles.iconOptionActive
                      ]}
                      onPress={() => updateFormData('icon', icon)}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.iconText}>{icon}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {errors.icon && (
                  <View style={styles.errorContainer}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={14}
                      color={NUBANK_COLORS.ERROR}
                    />
                    <Text style={styles.errorText}>{errors.icon}</Text>
                  </View>
                )}
              </View>

              {/* Prévia */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>Prévia</Text>
                <View style={styles.previewCard}>
                  <View style={styles.previewIconContainer}>
                    <Text style={styles.previewIcon}>{formData.icon}</Text>
                  </View>
                  <Text style={styles.previewName}>
                    {formData.name || 'Nome da categoria'}
                  </Text>
                </View>
              </View>

              {/* Sugestões rápidas */}
              <View style={styles.suggestionsContainer}>
                <Text style={styles.suggestionsTitle}>Sugestões rápidas:</Text>
                <View style={styles.suggestionsList}>
                  {[
                    { name: 'Restaurante', icon: '🍽️' },
                    { name: 'Supermercado', icon: '🛒' },
                    { name: 'Farmácia', icon: '💊' },
                    { name: 'Posto Combustível', icon: '⛽' },
                    { name: 'Loja', icon: '🏪' },
                    { name: 'Café', icon: '☕' }
                  ].map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionChip}
                      onPress={() => {
                        updateFormData('name', suggestion.name);
                        updateFormData('icon', suggestion.icon);
                      }}
                      disabled={isSubmitting}
                    >
                      <Text style={styles.suggestionText}>
                        {suggestion.icon} {suggestion.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer com botões */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (isSubmitting || !formData.name.trim()) && styles.saveButtonDisabled
                ]}
                onPress={handleSave}
                disabled={isSubmitting || !formData.name.trim()}
              >
                <MaterialCommunityIcons
                  name="check"
                  size={20}
                  color={NUBANK_COLORS.TEXT_WHITE}
                />
                <Text style={styles.saveButtonText}>
                  {category?.id ? 'Atualizar' : 'Salvar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.OVERLAY,
    justifyContent: 'flex-end'
  },
  
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  
  modalContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderTopLeftRadius: NUBANK_BORDER_RADIUS.XXL,
    borderTopRightRadius: NUBANK_BORDER_RADIUS.XXL,
    minHeight: '60%',
    maxHeight: '90%',
    ...NUBANK_SHADOWS.XL
  },
  
  header: {
    paddingTop: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG,
    borderTopLeftRadius: NUBANK_BORDER_RADIUS.XXL,
    borderTopRightRadius: NUBANK_BORDER_RADIUS.XXL
  },
  
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between'
  },
  
  headerLeft: {
    flex: 1
  },
  
  title: {
    fontSize: NUBANK_FONT_SIZES.XL,
    fontWeight: NUBANK_FONT_WEIGHTS.BOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginBottom: NUBANK_SPACING.XS
  },
  
  subtitle: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_WHITE,
    opacity: 0.9
  },
  
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: NUBANK_SPACING.MD
  },
  
  body: {
    flex: 1
  },
  
  bodyContent: {
    padding: NUBANK_SPACING.LG
  },
  
  fieldContainer: {
    marginBottom: NUBANK_SPACING.LG
  },
  
  label: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    marginBottom: NUBANK_SPACING.SM
  },
  
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  inputError: {
    borderColor: NUBANK_COLORS.ERROR,
    backgroundColor: `${NUBANK_COLORS.ERROR}10`
  },
  
  inputIcon: {
    marginLeft: NUBANK_SPACING.MD
  },
  
  input: {
    flex: 1,
    paddingVertical: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.SM,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: NUBANK_SPACING.XS
  },
  
  errorText: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.ERROR,
    marginLeft: NUBANK_SPACING.XS
  },
  
  charCounter: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    textAlign: 'right',
    marginTop: NUBANK_SPACING.XS
  },
  
  iconContainer: {
    marginBottom: NUBANK_SPACING.SM
  },
  
  iconContent: {
    paddingVertical: NUBANK_SPACING.SM
  },
  
  iconOption: {
    width: 56,
    height: 56,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.SM,
    borderWidth: 2,
    borderColor: 'transparent',
    ...NUBANK_SHADOWS.SM
  },
  
  iconOptionActive: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderColor: NUBANK_COLORS.PRIMARY,
    ...NUBANK_SHADOWS.MD
  },
  
  iconText: {
    fontSize: 22
  },
  
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    padding: NUBANK_SPACING.LG,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER,
    ...NUBANK_SHADOWS.SM
  },
  
  previewIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: NUBANK_SPACING.MD,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.CARD_BORDER
  },
  
  previewIcon: {
    fontSize: 20
  },
  
  previewName: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  suggestionsContainer: {
    marginTop: NUBANK_SPACING.MD,
    paddingTop: NUBANK_SPACING.MD,
    borderTopWidth: 1,
    borderTopColor: NUBANK_COLORS.CARD_BORDER
  },
  
  suggestionsTitle: {
    fontSize: NUBANK_FONT_SIZES.SM,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginBottom: NUBANK_SPACING.SM
  },
  
  suggestionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  
  suggestionChip: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: NUBANK_SPACING.MD,
    paddingVertical: NUBANK_SPACING.XS,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    marginRight: NUBANK_SPACING.SM,
    marginBottom: NUBANK_SPACING.SM,
    borderWidth: 1,
    borderColor: '#DBEAFE'
  },
  
  suggestionText: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: '#3B82F6',
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM
  },
  
  footer: {
    flexDirection: 'row',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.MD,
    paddingBottom: NUBANK_SPACING.XL,
    borderTopWidth: 1,
    borderTopColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingVertical: NUBANK_SPACING.MD,
    alignItems: 'center',
    marginRight: NUBANK_SPACING.SM
  },
  
  cancelButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  
  saveButton: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    paddingVertical: NUBANK_SPACING.MD,
    marginLeft: NUBANK_SPACING.SM,
    ...NUBANK_SHADOWS.MD
  },
  
  saveButtonDisabled: {
    opacity: 0.6
  },
  
  saveButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginLeft: NUBANK_SPACING.SM
  }
});