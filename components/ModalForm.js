// components/ModalForm.js - FORMULÁRIO MODAL REUTILIZÁVEL COM DESIGN NUBANK
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ActivityIndicator,
  Alert,
  Dimensions
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  NUBANK_COLORS,
  NUBANK_SPACING,
  NUBANK_FONT_SIZES,
  NUBANK_BORDER_RADIUS,
  NUBANK_SHADOWS,
  NUBANK_FONT_WEIGHTS
} from '../constants/nubank-theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ModalForm({
  visible,
  onClose,
  onSubmit,
  title,
  subtitle,
  fields = [],
  submitText = 'Salvar',
  cancelText = 'Cancelar',
  loading = false,
  validationRules = {},
  initialValues = {}
}) {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Animações
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Inicializa valores do formulário
  useEffect(() => {
    if (visible) {
      const initialData = {};
      fields.forEach(field => {
        initialData[field.name] = initialValues[field.name] || field.defaultValue || '';
      });
      setFormData(initialData);
      setErrors({});
      setTouched({});
      animateIn();
    } else {
      animateOut();
    }
  }, [visible, fields, initialValues]);

  const animateIn = () => {
    // Animações simplificadas que funcionam
    slideAnim.setValue(0);
    fadeAnim.setValue(1);
    scaleAnim.setValue(1);
  };

  const animateOut = () => {
    // Sem animações para evitar problemas
  };

  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return '';

    if (rules.required && !value) {
      return rules.requiredMessage || 'Campo obrigatório';
    }

    if (rules.minLength && value.length < rules.minLength) {
      return rules.minLengthMessage || `Mínimo ${rules.minLength} caracteres`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return rules.maxLengthMessage || `Máximo ${rules.maxLength} caracteres`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.patternMessage || 'Formato inválido';
    }

    if (rules.custom) {
      return rules.custom(value, formData) || '';
    }

    return '';
  };

  const handleFieldChange = (fieldName, value) => {
    // Aplica formatação se o campo tiver um formatter
    const field = fields.find(f => f.name === fieldName);
    const formattedValue = field?.formatter ? field.formatter(value) : value;
    
    setFormData(prev => ({ ...prev, [fieldName]: formattedValue }));
    
    if (touched[fieldName]) {
      const error = validateField(fieldName, formattedValue);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  const handleFieldBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    const error = validateField(fieldName, formData[fieldName]);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field.name, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(fields.reduce((acc, field) => ({ ...acc, [field.name]: true }), {}));
    
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Atenção', 'Por favor, corrija os erros no formulário');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      handleClose();
    } catch (error) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao salvar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    animateOut();
    setTimeout(() => {
      onClose();
    }, 250);
  };

  const renderField = (field) => {
    const hasError = touched[field.name] && errors[field.name];

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'password':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {validationRules[field.name]?.required && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
            
            <View style={[styles.inputWrapper, hasError && styles.inputError]}>
              {field.icon && (
                <MaterialCommunityIcons
                  name={field.icon}
                  size={20}
                  color={hasError ? NUBANK_COLORS.ERROR : NUBANK_COLORS.TEXT_SECONDARY}
                  style={styles.inputIcon}
                />
              )}
              
              <TextInput
                style={[styles.input, field.icon && styles.inputWithIcon]}
                value={formData[field.name] || ''}
                onChangeText={(value) => handleFieldChange(field.name, value)}
                onBlur={() => handleFieldBlur(field.name)}
                placeholder={field.placeholder}
                placeholderTextColor={NUBANK_COLORS.TEXT_TERTIARY}
                keyboardType={field.keyboardType || 'default'}
                secureTextEntry={field.type === 'password'}
                autoCapitalize={field.autoCapitalize || 'sentences'}
                autoCorrect={field.autoCorrect !== false}
                editable={!field.disabled && !isSubmitting}
                maxLength={field.maxLength}
                multiline={field.multiline}
                numberOfLines={field.numberOfLines}
              />
            </View>
            
            {hasError && (
              <Animated.View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={14}
                  color={NUBANK_COLORS.ERROR}
                />
                <Text style={styles.errorText}>{errors[field.name]}</Text>
              </Animated.View>
            )}
            
            {field.helper && !hasError && (
              <Text style={styles.helperText}>{field.helper}</Text>
            )}
          </View>
        );

      case 'select':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {validationRules[field.name]?.required && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectContainer}
            >
              {field.options.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.selectOption,
                    formData[field.name] === option.value && styles.selectOptionActive
                  ]}
                  onPress={() => handleFieldChange(field.name, option.value)}
                  disabled={isSubmitting}
                >
                  {option.icon && (
                    <Text style={styles.selectOptionIcon}>
                      {option.icon}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.selectOptionText,
                      formData[field.name] === option.value && styles.selectOptionTextActive
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {hasError && (
              <Animated.View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={14}
                  color={NUBANK_COLORS.ERROR}
                />
                <Text style={styles.errorText}>{errors[field.name]}</Text>
              </Animated.View>
            )}
          </View>
        );

      case 'multiselect':
        return (
          <View key={field.name} style={styles.fieldContainer}>
            <Text style={styles.label}>
              {field.label}
              {validationRules[field.name]?.required && (
                <Text style={styles.required}> *</Text>
              )}
            </Text>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.selectContainer}
            >
              {field.options.map(option => {
                const isSelected = (formData[field.name] || []).includes(option.value);
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.selectOption,
                      isSelected && styles.selectOptionActive
                    ]}
                    onPress={() => {
                      const currentValues = formData[field.name] || [];
                      let newValues;
                      if (isSelected) {
                        // Remove se já selecionado
                        newValues = currentValues.filter(val => val !== option.value);
                      } else {
                        // Adiciona se não selecionado
                        newValues = [...currentValues, option.value];
                      }
                      handleFieldChange(field.name, newValues);
                    }}
                    disabled={isSubmitting}
                  >
                    {option.icon && (
                      <Text style={styles.selectOptionIcon}>
                        {option.icon}
                      </Text>
                    )}
                    <Text
                      style={[
                        styles.selectOptionText,
                        isSelected && styles.selectOptionTextActive
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            
            {hasError && (
              <Animated.View style={styles.errorContainer}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={14}
                  color={NUBANK_COLORS.ERROR}
                />
                <Text style={styles.errorText}>{errors[field.name]}</Text>
              </Animated.View>
            )}
          </View>
        );

      case 'switch':
        return (
          <TouchableOpacity
            key={field.name}
            style={styles.switchContainer}
            onPress={() => handleFieldChange(field.name, !formData[field.name])}
            disabled={isSubmitting}
          >
            <View style={styles.switchLeft}>
              {field.icon && (
                <MaterialCommunityIcons
                  name={field.icon}
                  size={24}
                  color={NUBANK_COLORS.PRIMARY}
                  style={styles.switchIcon}
                />
              )}
              <View>
                <Text style={styles.switchLabel}>{field.label}</Text>
                {field.description && (
                  <Text style={styles.switchDescription}>{field.description}</Text>
                )}
              </View>
            </View>
            
            <View
              style={[
                styles.switch,
                formData[field.name] && styles.switchActive
              ]}
            >
              <Animated.View
                style={[
                  styles.switchThumb,
                  formData[field.name] && styles.switchThumbActive
                ]}
              />
            </View>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: fadeAnim
          }
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
        
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ]
            }
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            {/* Header com gradiente */}
            <LinearGradient
              colors={NUBANK_COLORS.GRADIENT_PRIMARY}
              style={styles.header}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.title}>{title}</Text>
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
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
              {fields.map(renderField)}
            </ScrollView>

            {/* Footer com botões */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.submitButton,
                  (isSubmitting || loading) && styles.buttonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting || loading}
              >
                {(isSubmitting || loading) ? (
                  <ActivityIndicator color={NUBANK_COLORS.TEXT_WHITE} />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="check"
                      size={20}
                      color={NUBANK_COLORS.TEXT_WHITE}
                    />
                    <Text style={styles.submitButtonText}>{submitText}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: NUBANK_COLORS.OVERLAY,
    justifyContent: 'flex-end'
  },
  
  modalContainer: {
    backgroundColor: NUBANK_COLORS.BACKGROUND,
    borderTopLeftRadius: NUBANK_BORDER_RADIUS.XXL,
    borderTopRightRadius: NUBANK_BORDER_RADIUS.XXL,
    minHeight: screenHeight * 0.6,
    maxHeight: screenHeight * 0.9,
    ...NUBANK_SHADOWS.XL
  },
  
  keyboardView: {
    flex: 1
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
  
  required: {
    color: NUBANK_COLORS.ERROR
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
    paddingHorizontal: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  inputWithIcon: {
    paddingLeft: NUBANK_SPACING.SM
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
  
  helperText: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginTop: NUBANK_SPACING.XS
  },
  
  selectContainer: {
    marginBottom: NUBANK_SPACING.SM
  },
  
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: NUBANK_SPACING.SM,
    paddingHorizontal: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    marginRight: NUBANK_SPACING.SM,
    borderWidth: 1,
    borderColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  selectOptionActive: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    borderColor: NUBANK_COLORS.PRIMARY
  },
  
  selectOptionIcon: {
    fontSize: 18,
    marginRight: NUBANK_SPACING.XS
  },
  
  selectOptionText: {
    fontSize: NUBANK_FONT_SIZES.SM,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  
  selectOptionTextActive: {
    color: NUBANK_COLORS.TEXT_WHITE,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD
  },
  
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.MD,
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    marginBottom: NUBANK_SPACING.LG
  },
  
  switchLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  
  switchIcon: {
    marginRight: NUBANK_SPACING.MD
  },
  
  switchLabel: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.MEDIUM,
    color: NUBANK_COLORS.TEXT_PRIMARY
  },
  
  switchDescription: {
    fontSize: NUBANK_FONT_SIZES.XS,
    color: NUBANK_COLORS.TEXT_SECONDARY,
    marginTop: NUBANK_SPACING.XS
  },
  
  switch: {
    width: 50,
    height: 30,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.TEXT_TERTIARY,
    padding: 2
  },
  
  switchActive: {
    backgroundColor: NUBANK_COLORS.PRIMARY
  },
  
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: NUBANK_BORDER_RADIUS.ROUND,
    backgroundColor: NUBANK_COLORS.TEXT_WHITE,
    ...NUBANK_SHADOWS.SM
  },
  
  switchThumbActive: {
    transform: [{ translateX: 20 }]
  },
  
  footer: {
    flexDirection: 'row',
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingTop: NUBANK_SPACING.MD,
    paddingBottom: NUBANK_SPACING.XL,
    borderTopWidth: 1,
    borderTopColor: NUBANK_COLORS.BACKGROUND_SECONDARY
  },
  
  button: {
    flex: 1,
    paddingVertical: NUBANK_SPACING.MD,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  cancelButton: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    marginRight: NUBANK_SPACING.SM
  },
  
  cancelButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_SECONDARY
  },
  
  submitButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    marginLeft: NUBANK_SPACING.SM,
    ...NUBANK_SHADOWS.MD
  },
  
  submitButtonText: {
    fontSize: NUBANK_FONT_SIZES.MD,
    fontWeight: NUBANK_FONT_WEIGHTS.SEMIBOLD,
    color: NUBANK_COLORS.TEXT_WHITE,
    marginLeft: NUBANK_SPACING.SM
  },
  
  buttonDisabled: {
    opacity: 0.6
  }
});