// examples/BestPracticesExample.js - Exemplo de uso das boas práticas implementadas

import React, { useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SPACING, FONT_SIZES } from '../constants';
import { useValidation } from '../utils/validation';
import { useErrorHandler } from '../utils/errorHandler';
import { useLogger } from '../utils/logger';
import config from '../config/environment';

/**
 * 🌟 Exemplo de Componente com Boas Práticas
 *
 * Este componente demonstra como usar:
 * - Constantes centralizadas
 * - Validação robusta
 * - Tratamento de erros padronizado
 * - Logging estruturado
 * - Configuração de ambiente
 * - Tipagem e sanitização
 */

const BestPracticesExample = () => {
  // 🎯 Hooks das boas práticas
  const { validate: validateSchema, sanitize } = useValidation();
  const { handle: handleError, show: showError } = useErrorHandler();
  const logger = useLogger();

  // 📊 Estados locais
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 📝 Schema de validação para o formulário
  const formSchema = {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
      message: 'Nome deve ter entre 2 e 100 caracteres'
    },
    email: {
      type: 'email',
      required: true,
      message: 'Email deve ter formato válido'
    },
    amount: {
      type: 'currency',
      required: true,
      min: 0.01,
      message: 'Valor deve ser maior que zero'
    }
  };

  /**
   * 🔄 Atualiza campo do formulário com sanitização automática
   */
  const updateField = useCallback(
    (field, value) => {
      logger.ui('field_update', 'BestPracticesExample', { field, hasValue: !!value });

      let sanitizedValue = value;

      // Sanitiza baseado no tipo do campo
      switch (field) {
        case 'name':
          sanitizedValue = sanitize.string(value);
          break;
        case 'email':
          sanitizedValue = sanitize.email(value);
          break;
        case 'amount':
          sanitizedValue = sanitize.currency(value);
          break;
      }

      setFormData(prev => ({
        ...prev,
        [field]: sanitizedValue
      }));

      // Remove erro do campo se existir
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [sanitize, errors, logger]
  );

  /**
   * ✅ Valida formulário completo
   */
  const validateForm = useCallback(() => {
    logger.start('form_validation');

    const validation = validateSchema(formData, formSchema);

    if (!validation.isValid) {
      // Converte array de erros para objeto com campos
      const fieldErrors = {};
      validation.errors.forEach(error => {
        const field = error.split(' ')[0];
        fieldErrors[field] = error;
      });

      setErrors(fieldErrors);
      logger.warn('Validação do formulário falhou', {
        errors: validation.errors,
        fields: Object.keys(fieldErrors)
      });

      return false;
    }

    setErrors({});
    logger.info('Formulário validado com sucesso');
    return true;
  }, [formData, validateSchema, logger]);

  /**
   * 💾 Simula salvamento de dados
   */
  const mockSaveData = useCallback(async data => {
    // Simula delay de rede
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simula erro aleatório em desenvolvimento
    if (config.IS_DEVELOPMENT && Math.random() < 0.3) {
      throw new Error('Erro simulado para demonstração');
    }

    return { success: true, id: Math.random().toString(36) };
  }, []);

  /**
   * 🚀 Submete formulário com todas as boas práticas
   */
  const handleSubmit = useCallback(async () => {
    const startTime = Date.now();
    logger.start('form_submission', {
      environment: config.ENVIRONMENT,
      debug: config.DEBUG
    });

    try {
      setLoading(true);

      // 1. Valida formulário
      if (!validateForm()) {
        logger.warn('Submission cancelada - validação falhou');
        return;
      }

      // 2. Prepara dados sanitizados
      const sanitizedData = {
        name: sanitize.string(formData.name),
        email: sanitize.email(formData.email),
        amount: sanitize.currency(formData.amount)
      };

      logger.info('Dados sanitizados', { fields: Object.keys(sanitizedData) });

      // 3. Tenta salvar com retry automático
      const result = await mockSaveData(sanitizedData);

      // 4. Log de sucesso
      logger.performance('form_submission', startTime, {
        success: true,
        resultId: result.id
      });

      // 5. Reset do formulário
      setFormData({ name: '', email: '', amount: '' });
      setErrors({});

      logger.info('Formulário submetido com sucesso', { id: result.id });
    } catch (error) {
      // 6. Tratamento de erro padronizado
      const handledError = handleError(error, {
        operation: 'form_submission',
        formData: Object.keys(formData),
        environment: config.ENVIRONMENT
      });

      // 7. Mostra erro para o usuário
      showError(
        error,
        {},
        {
          onRetry: handleSubmit // Permite tentar novamente
        }
      );

      logger.performance('form_submission', startTime, {
        success: false,
        errorType: handledError.type
      });
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm, sanitize, handleError, showError, logger, mockSaveData]);

  /**
   * 🎨 Renderização do componente
   */
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🌟 Exemplo de Boas Práticas</Text>

      <Text style={styles.subtitle}>
        Demonstra: Validação, Tratamento de Erros, Logging e Configuração
      </Text>

      {/* Campo Nome */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nome *</Text>
        <TextInput
          style={[styles.input, errors.name && styles.inputError]}
          value={formData.name}
          onChangeText={value => updateField('name', value)}
          placeholder='Digite seu nome'
          placeholderTextColor={COLORS.GRAY_400}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>

      {/* Campo Email */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          value={formData.email}
          onChangeText={value => updateField('email', value)}
          placeholder='Digite seu email'
          placeholderTextColor={COLORS.GRAY_400}
          keyboardType='email-address'
          autoCapitalize='none'
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>

      {/* Campo Valor */}
      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Valor *</Text>
        <TextInput
          style={[styles.input, errors.amount && styles.inputError]}
          value={formData.amount.toString()}
          onChangeText={value => updateField('amount', value)}
          placeholder='0,00'
          placeholderTextColor={COLORS.GRAY_400}
          keyboardType='numeric'
        />
        {errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
      </View>

      {/* Botão Submit */}
      <TouchableOpacity
        style={[styles.submitButton, loading && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        <Text style={styles.submitButtonText}>
          {loading ? 'Salvando...' : 'Salvar com Boas Práticas'}
        </Text>
      </TouchableOpacity>

      {/* Informações de Debug (apenas em desenvolvimento) */}
      {config.DEBUG && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🐛 Debug Info</Text>
          <Text style={styles.debugText}>Environment: {config.ENVIRONMENT}</Text>
          <Text style={styles.debugText}>Debug Mode: {config.DEBUG ? 'ON' : 'OFF'}</Text>
          <Text style={styles.debugText}>
            Form Valid: {Object.keys(errors).length === 0 ? '✅' : '❌'}
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * 🎨 Estilos usando constantes centralizadas
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.MD,
    backgroundColor: COLORS.BACKGROUND
  },
  title: {
    fontSize: FONT_SIZES.XXL,
    fontWeight: '700',
    color: COLORS.GRAY_800,
    textAlign: 'center',
    marginBottom: SPACING.SM
  },
  subtitle: {
    fontSize: FONT_SIZES.SM,
    color: COLORS.GRAY_600,
    textAlign: 'center',
    marginBottom: SPACING.XL
  },
  fieldContainer: {
    marginBottom: SPACING.MD
  },
  label: {
    fontSize: FONT_SIZES.SM,
    fontWeight: '600',
    color: COLORS.GRAY_700,
    marginBottom: SPACING.XS
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.GRAY_300,
    borderRadius: 8,
    padding: SPACING.MD,
    fontSize: FONT_SIZES.MD,
    color: COLORS.GRAY_800,
    backgroundColor: COLORS.WHITE
  },
  inputError: {
    borderColor: COLORS.ERROR
  },
  errorText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.ERROR,
    marginTop: SPACING.XS
  },
  submitButton: {
    backgroundColor: COLORS.PRIMARY,
    padding: SPACING.MD,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.LG
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: COLORS.WHITE,
    fontSize: FONT_SIZES.MD,
    fontWeight: '600'
  },
  debugContainer: {
    marginTop: SPACING.XL,
    padding: SPACING.MD,
    backgroundColor: COLORS.GRAY_100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.GRAY_300
  },
  debugTitle: {
    fontSize: FONT_SIZES.MD,
    fontWeight: '600',
    color: COLORS.GRAY_800,
    marginBottom: SPACING.XS
  },
  debugText: {
    fontSize: FONT_SIZES.XS,
    color: COLORS.GRAY_600,
    marginBottom: 2
  }
});

export default BestPracticesExample;
