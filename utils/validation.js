// utils/validation.js - Sistema de validação robusta e tipagem

import { VALIDATION_TYPES, SECURITY } from '../constants';
import logger from './logger';

/**
 * 🛡️ Sistema de Validação Robusta
 *
 * Funcionalidades:
 * - Validação de tipos seguros
 * - Sanitização automática
 * - Mensagens de erro consistentes
 * - Validação de schemas complexos
 * - Sanitização contra XSS
 */

// 🎯 REGRAS DE VALIDAÇÃO
const VALIDATION_RULES = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'Email deve ter um formato válido'
  },
  password: {
    minLength: SECURITY.PASSWORD_MIN_LENGTH,
    pattern: /^(?=.*[a-zA-Z]).{6,}$/,
    message: `Senha deve ter pelo menos ${SECURITY.PASSWORD_MIN_LENGTH} caracteres`
  },
  currency: {
    pattern: /^\d+(\.\d{1,2})?$/,
    message: 'Valor deve ser um número válido com até 2 casas decimais'
  },
  phone: {
    pattern: /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/,
    message: 'Telefone deve ter formato (XX) XXXXX-XXXX'
  },
  cpf: {
    pattern: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    message: 'CPF deve ter formato XXX.XXX.XXX-XX'
  },
  date: {
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    message: 'Data deve ter formato YYYY-MM-DD'
  }
};

/**
 * 🧹 Sanitização de dados
 */
export class DataSanitizer {
  /**
   * Remove caracteres perigosos para prevenir XSS
   */
  static sanitizeString(value) {
    if (typeof value !== 'string') return value;

    return value
      .replace(/[<>\"']/g, '') // Remove caracteres HTML/JS perigosos
      .trim() // Remove espaços extras
      .substring(0, 1000); // Limita tamanho
  }

  /**
   * Sanitiza email
   */
  static sanitizeEmail(email) {
    if (typeof email !== 'string') return '';

    return email.toLowerCase().trim().substring(0, 254); // Limite RFC para email
  }

  /**
   * Sanitiza número/moeda
   */
  static sanitizeCurrency(value) {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return 0;

    // Remove tudo exceto números e ponto decimal
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
  }

  /**
   * Sanitiza telefone
   */
  static sanitizePhone(phone) {
    if (typeof phone !== 'string') return '';

    // Remove tudo exceto números
    const numbers = phone.replace(/\D/g, '');

    // Formata como (XX) XXXXX-XXXX
    if (numbers.length === 11) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 7)}-${numbers.substring(7)}`;
    } else if (numbers.length === 10) {
      return `(${numbers.substring(0, 2)}) ${numbers.substring(2, 6)}-${numbers.substring(6)}`;
    }

    return numbers;
  }

  /**
   * Sanitiza data
   */
  static sanitizeDate(date) {
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }

    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
    }

    return null;
  }
}

/**
 * ✅ Validador de tipos seguros
 */
export class TypeValidator {
  /**
   * Valida se é string não vazia
   */
  static isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Valida se é número válido
   */
  static isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
  }

  /**
   * Valida se é array não vazio
   */
  static isNonEmptyArray(value) {
    return Array.isArray(value) && value.length > 0;
  }

  /**
   * Valida se é objeto válido
   */
  static isValidObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  /**
   * Valida se é data válida
   */
  static isValidDate(value) {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Valida se é email válido
   */
  static isValidEmail(email) {
    if (!this.isNonEmptyString(email)) return false;
    return VALIDATION_RULES.email.pattern.test(email);
  }

  /**
   * Valida se é senha forte
   */
  static isValidPassword(password) {
    if (!this.isNonEmptyString(password)) return false;
    return (
      password.length >= VALIDATION_RULES.password.minLength &&
      VALIDATION_RULES.password.pattern.test(password)
    );
  }

  /**
   * Valida se é valor monetário
   */
  static isValidCurrency(value) {
    if (this.isValidNumber(value)) return value >= 0;
    if (this.isNonEmptyString(value)) {
      return VALIDATION_RULES.currency.pattern.test(value);
    }
    return false;
  }
}

/**
 * 📋 Validador de schemas complexos
 */
export class SchemaValidator {
  /**
   * Valida objeto contra schema
   */
  static validate(data, schema) {
    const errors = [];
    const sanitizedData = {};

    // Percorre cada campo do schema
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = this.validateField(field, value, rules);

      if (fieldErrors.length > 0) {
        errors.push(...fieldErrors);
      } else {
        // Sanitiza o valor se passou na validação
        sanitizedData[field] = this.sanitizeField(value, rules);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: sanitizedData
    };
  }

  /**
   * Valida um campo específico
   */
  static validateField(field, value, rules) {
    const errors = [];

    // Verifica se é obrigatório
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} é obrigatório`);
      return errors;
    }

    // Se não é obrigatório e está vazio, pula outras validações
    if (!rules.required && (value === undefined || value === null || value === '')) {
      return errors;
    }

    // Valida tipo
    if (rules.type) {
      if (!this.validateType(value, rules.type)) {
        errors.push(`${field} deve ser do tipo ${rules.type}`);
      }
    }

    // Valida tamanho mínimo
    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} deve ter pelo menos ${rules.minLength} caracteres`);
    }

    // Valida tamanho máximo
    if (rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} deve ter no máximo ${rules.maxLength} caracteres`);
    }

    // Valida valor mínimo
    if (rules.min !== undefined && value < rules.min) {
      errors.push(`${field} deve ser maior que ${rules.min}`);
    }

    // Valida valor máximo
    if (rules.max !== undefined && value > rules.max) {
      errors.push(`${field} deve ser menor que ${rules.max}`);
    }

    // Valida padrão regex
    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || `${field} tem formato inválido`);
    }

    // Validação customizada
    if (rules.custom && typeof rules.custom === 'function') {
      const customResult = rules.custom(value);
      if (customResult !== true) {
        errors.push(customResult || `${field} é inválido`);
      }
    }

    return errors;
  }

  /**
   * Valida tipo do valor
   */
  static validateType(value, type) {
    switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return TypeValidator.isValidNumber(value);
    case 'email':
      return TypeValidator.isValidEmail(value);
    case 'password':
      return TypeValidator.isValidPassword(value);
    case 'currency':
      return TypeValidator.isValidCurrency(value);
    case 'date':
      return TypeValidator.isValidDate(value);
    case 'array':
      return Array.isArray(value);
    case 'object':
      return TypeValidator.isValidObject(value);
    default:
      return true;
    }
  }

  /**
   * Sanitiza campo baseado nas regras
   */
  static sanitizeField(value, rules) {
    if (rules.sanitize === false) return value;

    switch (rules.type) {
    case 'string':
      return DataSanitizer.sanitizeString(value);
    case 'email':
      return DataSanitizer.sanitizeEmail(value);
    case 'currency':
      return DataSanitizer.sanitizeCurrency(value);
    case 'phone':
      return DataSanitizer.sanitizePhone(value);
    case 'date':
      return DataSanitizer.sanitizeDate(value);
    default:
      return value;
    }
  }
}

/**
 * 🎯 Schemas pré-definidos para entidades do app
 */
export const SCHEMAS = {
  USER: {
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
      message: 'Email deve ter um formato válido'
    },
    password: {
      type: 'password',
      required: true,
      message: `Senha deve ter pelo menos ${SECURITY.PASSWORD_MIN_LENGTH} caracteres`
    }
  },

  EXPENSE: {
    description: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 255,
      message: 'Descrição é obrigatória'
    },
    amount: {
      type: 'currency',
      required: true,
      min: 0.01,
      message: 'Valor deve ser maior que zero'
    },
    date: {
      type: 'date',
      required: true,
      message: 'Data é obrigatória'
    },
    categoryId: {
      type: 'number',
      required: true,
      message: 'Categoria é obrigatória'
    }
  },

  CATEGORY: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 50,
      message: 'Nome da categoria é obrigatório'
    },
    icon: {
      type: 'string',
      required: false,
      maxLength: 10
    }
  },

  ESTABLISHMENT: {
    name: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 100,
      message: 'Nome do estabelecimento é obrigatório'
    },
    category: {
      type: 'string',
      required: false,
      maxLength: 50
    },
    phone: {
      type: 'phone',
      required: false
    }
  }
};

/**
 * 🎯 Funções de conveniência
 */
export const validateUser = data => SchemaValidator.validate(data, SCHEMAS.USER);
export const validateExpense = data => SchemaValidator.validate(data, SCHEMAS.EXPENSE);
export const validateCategory = data => SchemaValidator.validate(data, SCHEMAS.CATEGORY);
export const validateEstablishment = data => SchemaValidator.validate(data, SCHEMAS.ESTABLISHMENT);

/**
 * 🔒 Sanitização rápida de dados de entrada
 */
export const sanitize = {
  string: DataSanitizer.sanitizeString,
  email: DataSanitizer.sanitizeEmail,
  currency: DataSanitizer.sanitizeCurrency,
  phone: DataSanitizer.sanitizePhone,
  date: DataSanitizer.sanitizeDate
};

/**
 * ✅ Validação rápida de tipos
 */
export const validate = {
  string: TypeValidator.isNonEmptyString,
  number: TypeValidator.isValidNumber,
  array: TypeValidator.isNonEmptyArray,
  object: TypeValidator.isValidObject,
  date: TypeValidator.isValidDate,
  email: TypeValidator.isValidEmail,
  password: TypeValidator.isValidPassword,
  currency: TypeValidator.isValidCurrency
};

/**
 * 🎯 Hook para usar validação em componentes React
 */
export const useValidation = () => {
  const validateSchema = (data, schema) => {
    const result = SchemaValidator.validate(data, schema);

    if (!result.isValid) {
      logger.warn('Validação falhou', {
        errors: result.errors,
        data: Object.keys(data)
      });
    }

    return result;
  };

  return {
    validate: validateSchema,
    sanitize,
    check: validate,
    schemas: SCHEMAS
  };
};

export default {
  DataSanitizer,
  TypeValidator,
  SchemaValidator,
  SCHEMAS,
  sanitize,
  validate
};
