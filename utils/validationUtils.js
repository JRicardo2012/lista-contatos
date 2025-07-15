// utils/validationUtils.js
// Sistema completo de validações para formulários
// Centraliza todas as regras de validação em um só lugar

import React from 'react';

/**
 * OBJETO 1: Validadores individuais
 * Cada função valida um tipo específico de campo
 */
export const validators = {
  
  /**
   * Validador de nome (firstName, lastName)
   * Regras: obrigatório, mínimo 2 chars, máximo 50, só letras
   */
  name: (value, fieldName = "Nome") => {
    // Verifica se está vazio
    if (!value || !value.trim()) {
      return `${fieldName} é obrigatório`;
    }
    
    // Verifica tamanho mínimo
    if (value.trim().length < 2) {
      return `${fieldName} deve ter pelo menos 2 caracteres`;
    }
    
    // Verifica tamanho máximo
    if (value.trim().length > 50) {
      return `${fieldName} deve ter no máximo 50 caracteres`;
    }
    
    // Verifica se contém apenas letras e espaços
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(value.trim())) {
      return `${fieldName} deve conter apenas letras`;
    }
    
    return ""; // Sem erro = string vazia
  },

  /**
   * Validador de email
   * Regras: obrigatório, formato válido, máximo 100 chars
   */
  email: (value) => {
    if (!value || !value.trim()) {
      return "Email é obrigatório";
    }
    
    // Regex para formato de email válido
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value.trim())) {
      return "Email inválido";
    }
    
    if (value.trim().length > 100) {
      return "Email deve ter no máximo 100 caracteres";
    }
    
    return "";
  },

  /**
   * Validador de telefone
   * Regras: obrigatório, 10-11 dígitos
   */
  phone: (value) => {
    if (!value || !value.trim()) {
      return "Telefone é obrigatório";
    }
    
    // Remove tudo que não é número
    const cleaned = value.replace(/\D/g, '');
    
    if (cleaned.length < 10 || cleaned.length > 11) {
      return "Telefone deve ter entre 10 e 11 dígitos";
    }
    
    return "";
  },

  /**
   * Validador de descrição
   * Regras: obrigatório, mínimo/máximo configurável
   */
  description: (value, minLength = 3, maxLength = 100) => {
    if (!value || !value.trim()) {
      return "Descrição é obrigatória";
    }
    
    if (value.trim().length < minLength) {
      return `Descrição deve ter pelo menos ${minLength} caracteres`;
    }
    
    if (value.trim().length > maxLength) {
      return `Descrição deve ter no máximo ${maxLength} caracteres`;
    }
    
    return "";
  },

  /**
   * Validador de valor monetário
   * Regras: obrigatório, número válido, maior que zero
   */
  amount: (value) => {
    if (!value || !value.trim()) {
      return "Valor é obrigatório";
    }
    
    // Substitui vírgula por ponto para conversão
    const valorLimpo = value.replace(',', '.');
    const valor = parseFloat(valorLimpo);
    
    if (isNaN(valor)) {
      return "Valor deve ser um número válido";
    }
    
    if (valor <= 0) {
      return "Valor deve ser maior que zero";
    }
    
    if (valor > 999999.99) {
      return "Valor deve ser menor que R$ 999.999,99";
    }
    
    return "";
  },

  /**
   * Validador de nome de categoria
   * Regras: obrigatório, 2-50 chars, letras/números/símbolos básicos
   */
  categoryName: (value) => {
    if (!value || !value.trim()) {
      return "Nome da categoria é obrigatório";
    }
    
    if (value.trim().length < 2) {
      return "Nome deve ter pelo menos 2 caracteres";
    }
    
    if (value.trim().length > 50) {
      return "Nome deve ter no máximo 50 caracteres";
    }
    
    // Permite letras, números, espaços, hífens e underscores
    if (!/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/.test(value.trim())) {
      return "Nome pode conter apenas letras, números, espaços, hífens e underscores";
    }
    
    return "";
  },

  /**
   * Validador de local/endereço
   * Regras: opcional, mas se preenchido, máximo de caracteres
   */
  place: (value, maxLength = 200) => {
    if (value && value.trim().length > maxLength) {
      return `Local deve ter no máximo ${maxLength} caracteres`;
    }
    return "";
  },

  /**
   * Validador genérico obrigatório
   * Regras: campo não pode estar vazio
   */
  required: (value, fieldName = "Campo") => {
    if (!value || !value.trim()) {
      return `${fieldName} é obrigatório`;
    }
    return "";
  },

  /**
   * Validador de texto genérico
   * Regras: configurável (obrigatório, min/max)
   */
  text: (value, fieldName = "Campo", minLength = 1, maxLength = 255, required = true) => {
    if (required && (!value || !value.trim())) {
      return `${fieldName} é obrigatório`;
    }
    
    if (value && value.trim().length < minLength) {
      return `${fieldName} deve ter pelo menos ${minLength} caracteres`;
    }
    
    if (value && value.trim().length > maxLength) {
      return `${fieldName} deve ter no máximo ${maxLength} caracteres`;
    }
    
    return "";
  }
};

/**
 * FUNÇÃO 2: Validar múltiplos campos de uma vez
 * Recebe um objeto com campos e regras, retorna erros encontrados
 */
export const validateFields = (fields, rules) => {
  const errors = {};
  
  // Percorre cada campo que tem regras definidas
  Object.keys(rules).forEach(fieldName => {
    const value = fields[fieldName];
    const rule = rules[fieldName];
    
    // Se a regra é uma função simples
    if (typeof rule === 'function') {
      const error = rule(value);
      if (error) {
        errors[fieldName] = error;
      }
    } 
    // Se a regra é um array de validadores
    else if (Array.isArray(rule)) {
      for (const validator of rule) {
        const error = validator(value);
        if (error) {
          errors[fieldName] = error;
          break; // Para na primeira validação que falhar
        }
      }
    }
  });
  
  return errors;
};

/**
 * HOOK 3: useFormValidation
 * Hook customizado para gerenciar validação de formulários
 * Facilita o uso em componentes React
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  // Estados do hook
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});

  /**
   * Função para validar um campo específico
   */
  const validateField = (fieldName, value) => {
    const rule = validationRules[fieldName];
    if (!rule) return "";

    if (typeof rule === 'function') {
      return rule(value);
    } else if (Array.isArray(rule)) {
      for (const validator of rule) {
        const error = validator(value);
        if (error) return error;
      }
    }
    return "";
  };

  /**
   * Função para atualizar valor de um campo
   * Também valida se o campo já foi "tocado"
   */
  const handleChange = (fieldName, value) => {
    // Atualiza o valor
    setValues(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Valida apenas se o campo já foi tocado
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({
        ...prev,
        [fieldName]: error
      }));
    }
  };

  /**
   * Função para marcar campo como "tocado"
   * Executada quando o usuário sai do campo (onBlur)
   */
  const handleBlur = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));

    const error = validateField(fieldName, values[fieldName]);
    setErrors(prev => ({
      ...prev,
      [fieldName]: error
    }));
  };

  /**
   * Função para validar o formulário inteiro
   * Retorna true se válido, false se inválido
   */
  const validateForm = () => {
    const newErrors = {};
    const newTouched = {};
    let isValid = true;

    // Valida todos os campos com regras
    Object.keys(validationRules).forEach(fieldName => {
      newTouched[fieldName] = true;
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    setTouched(newTouched);
    return isValid;
  };

  /**
   * Função para resetar o formulário
   */
  const reset = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
    setTouched({});
  };

  // Retorna tudo que o componente precisa
  return {
    values,        // Valores atuais dos campos
    errors,        // Erros de validação
    touched,       // Campos que foram "tocados"
    handleChange,  // Função para atualizar valores
    handleBlur,    // Função para marcar como "tocado"
    validateForm,  // Função para validar tudo
    reset,         // Função para resetar
    setValues,     // Função para definir valores diretamente
    isValid: Object.keys(errors).length === 0 // True se não há erros
  };
};

/**
 * OBJETO 4: Sanitizadores de dados
 * Funções para limpar/formatar dados antes de salvar
 */
export const sanitizers = {
  /**
   * Remove espaços extras e normaliza texto
   */
  text: (value) => {
    return value ? value.trim().replace(/\s+/g, ' ') : '';
  },

  /**
   * Formata email (lowercase, sem espaços)
   */
  email: (value) => {
    return value ? value.trim().toLowerCase() : '';
  },

  /**
   * Remove caracteres não numéricos do telefone
   */
  phone: (value) => {
    return value ? value.replace(/\D/g, '') : '';
  },

  /**
   * Formata valor monetário (remove caracteres inválidos)
   */
  currency: (value) => {
    if (!value) return '';
    return value.replace(/[^0-9,]/g, '');
  },

  /**
   * Capitaliza primeira letra de cada palavra
   */
  capitalize: (value) => {
    if (!value) return '';
    return value.trim().toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }
};

/**
 * EXEMPLOS DE USO:
 * 
 * 1. Validação simples:
 * const error = validators.email("test@email.com");
 * if (error) console.log(error);
 * 
 * 2. Validação múltipla:
 * const errors = validateFields(
 *   { name: "João", email: "invalid" },
 *   { name: validators.name, email: validators.email }
 * );
 * 
 * 3. Hook em componente:
 * const { values, errors, handleChange, validateForm } = useFormValidation(
 *   { name: '', email: '' },
 *   { name: validators.name, email: validators.email }
 * );
 */

// Exporta tudo para uso em outros arquivos
export default {
  validators,
  validateFields,
  useFormValidation,
  sanitizers
};