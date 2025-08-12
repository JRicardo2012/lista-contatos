// __tests__/utils/validation.test.js - Testes do sistema de validação

import {
  DataSanitizer,
  TypeValidator,
  SchemaValidator,
  validateUser,
  validateExpense,
  sanitize,
  validate
} from '../../utils/validation';

describe('DataSanitizer', () => {
  describe('sanitizeString', () => {
    it('deve remover caracteres perigosos', () => {
      const input = '<script>alert("xss")</script>';
      const result = DataSanitizer.sanitizeString(input);
      expect(result).toBe('scriptalert(xss)/script');
    });

    it('deve remover espaços extras', () => {
      const input = '  texto com espaços  ';
      const result = DataSanitizer.sanitizeString(input);
      expect(result).toBe('texto com espaços');
    });

    it('deve limitar o tamanho', () => {
      const input = 'a'.repeat(1500);
      const result = DataSanitizer.sanitizeString(input);
      expect(result.length).toBe(1000);
    });
  });

  describe('sanitizeEmail', () => {
    it('deve converter para minúsculo', () => {
      const input = 'TESTE@EXAMPLE.COM';
      const result = DataSanitizer.sanitizeEmail(input);
      expect(result).toBe('teste@example.com');
    });

    it('deve remover espaços', () => {
      const input = ' teste@example.com ';
      const result = DataSanitizer.sanitizeEmail(input);
      expect(result).toBe('teste@example.com');
    });
  });

  describe('sanitizeCurrency', () => {
    it('deve converter string para número', () => {
      expect(DataSanitizer.sanitizeCurrency('123.45')).toBe(123.45);
      expect(DataSanitizer.sanitizeCurrency('R$ 100,50')).toBe(100.5);
    });

    it('deve arredondar para 2 casas decimais', () => {
      expect(DataSanitizer.sanitizeCurrency('123.456')).toBe(123.46);
    });

    it('deve retornar 0 para valores inválidos', () => {
      expect(DataSanitizer.sanitizeCurrency('abc')).toBe(0);
      expect(DataSanitizer.sanitizeCurrency('')).toBe(0);
    });
  });
});

describe('TypeValidator', () => {
  describe('isNonEmptyString', () => {
    it('deve validar strings não vazias', () => {
      expect(TypeValidator.isNonEmptyString('teste')).toBe(true);
      expect(TypeValidator.isNonEmptyString('')).toBe(false);
      expect(TypeValidator.isNonEmptyString('   ')).toBe(false);
      expect(TypeValidator.isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('deve validar números', () => {
      expect(TypeValidator.isValidNumber(123)).toBe(true);
      expect(TypeValidator.isValidNumber(123.45)).toBe(true);
      expect(TypeValidator.isValidNumber(0)).toBe(true);
      expect(TypeValidator.isValidNumber(-123)).toBe(true);
      expect(TypeValidator.isValidNumber(NaN)).toBe(false);
      expect(TypeValidator.isValidNumber(Infinity)).toBe(false);
      expect(TypeValidator.isValidNumber('123')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('deve validar emails', () => {
      expect(TypeValidator.isValidEmail('teste@example.com')).toBe(true);
      expect(TypeValidator.isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(TypeValidator.isValidEmail('invalid-email')).toBe(false);
      expect(TypeValidator.isValidEmail('test@')).toBe(false);
      expect(TypeValidator.isValidEmail('@domain.com')).toBe(false);
    });
  });

  describe('isValidPassword', () => {
    it('deve validar senhas', () => {
      expect(TypeValidator.isValidPassword('123456')).toBe(true);
      expect(TypeValidator.isValidPassword('senha123')).toBe(true);
      expect(TypeValidator.isValidPassword('12345')).toBe(false); // Muito curta
      expect(TypeValidator.isValidPassword('')).toBe(false);
    });
  });

  describe('isValidCurrency', () => {
    it('deve validar valores monetários', () => {
      expect(TypeValidator.isValidCurrency(123.45)).toBe(true);
      expect(TypeValidator.isValidCurrency(0)).toBe(true);
      expect(TypeValidator.isValidCurrency('123.45')).toBe(true);
      expect(TypeValidator.isValidCurrency(-10)).toBe(false);
      expect(TypeValidator.isValidCurrency('abc')).toBe(false);
    });
  });
});

describe('SchemaValidator', () => {
  const testSchema = {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 50
    },
    email: {
      type: 'email',
      required: true
    },
    age: {
      type: 'number',
      required: false,
      min: 0,
      max: 120
    }
  };

  describe('validate', () => {
    it('deve validar objeto válido', () => {
      const data = {
        name: 'João Silva',
        email: 'joao@example.com',
        age: 30
      };

      const result = SchemaValidator.validate(data, testSchema);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.name).toBe('João Silva');
    });

    it('deve detectar campos obrigatórios ausentes', () => {
      const data = {
        age: 30
      };

      const result = SchemaValidator.validate(data, testSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name é obrigatório');
      expect(result.errors).toContain('email é obrigatório');
    });

    it('deve validar tamanhos mínimo e máximo', () => {
      const data = {
        name: 'A', // Muito curto
        email: 'joao@example.com'
      };

      const result = SchemaValidator.validate(data, testSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name deve ter pelo menos 2 caracteres');
    });

    it('deve validar limites numéricos', () => {
      const data = {
        name: 'João Silva',
        email: 'joao@example.com',
        age: 150 // Muito alto
      };

      const result = SchemaValidator.validate(data, testSchema);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('age deve ser menor que 120');
    });
  });
});

describe('Schemas pré-definidos', () => {
  describe('validateUser', () => {
    it('deve validar usuário válido', () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@example.com',
        password: '123456'
      };

      const result = validateUser(userData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar usuário inválido', () => {
      const userData = {
        name: '',
        email: 'email-inválido',
        password: '123'
      };

      const result = validateUser(userData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateExpense', () => {
    it('deve validar despesa válida', () => {
      const expenseData = {
        description: 'Almoço',
        amount: 25.5,
        date: '2024-01-15',
        categoryId: 1
      };

      const result = validateExpense(expenseData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('deve rejeitar despesa inválida', () => {
      const expenseData = {
        description: '',
        amount: -10,
        date: 'data-inválida',
        categoryId: 'não-é-número'
      };

      const result = validateExpense(expenseData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

describe('Funções de conveniência', () => {
  describe('sanitize', () => {
    it('deve ter todas as funções de sanitização', () => {
      expect(typeof sanitize.string).toBe('function');
      expect(typeof sanitize.email).toBe('function');
      expect(typeof sanitize.currency).toBe('function');
      expect(typeof sanitize.phone).toBe('function');
      expect(typeof sanitize.date).toBe('function');
    });
  });

  describe('validate', () => {
    it('deve ter todas as funções de validação', () => {
      expect(typeof validate.string).toBe('function');
      expect(typeof validate.number).toBe('function');
      expect(typeof validate.email).toBe('function');
      expect(typeof validate.password).toBe('function');
      expect(typeof validate.currency).toBe('function');
    });
  });
});
