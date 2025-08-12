// __tests__/utils/errorHandler.test.js - Testes do sistema de tratamento de erros

import errorHandler, {
  ERROR_TYPES,
  handleError,
  showUserError,
  withRetry
} from '../../utils/errorHandler';
// Mock do Alert (simula React Native)
const Alert = {
  alert: jest.fn()
};

describe('ErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('classifyError', () => {
    it('deve classificar erro de rede', () => {
      const networkError = new Error('Network request failed');
      const result = errorHandler.classifyError(networkError);
      expect(result).toBe(ERROR_TYPES.NETWORK);
    });

    it('deve classificar erro de timeout', () => {
      const timeoutError = new Error('Request timeout');
      const result = errorHandler.classifyError(timeoutError);
      expect(result).toBe(ERROR_TYPES.TIMEOUT);
    });

    it('deve classificar erro HTTP 401', () => {
      const authError = { status: 401, message: 'Unauthorized' };
      const result = errorHandler.classifyError(authError);
      expect(result).toBe(ERROR_TYPES.UNAUTHORIZED);
    });

    it('deve classificar erro HTTP 403', () => {
      const forbiddenError = { status: 403, message: 'Forbidden' };
      const result = errorHandler.classifyError(forbiddenError);
      expect(result).toBe(ERROR_TYPES.FORBIDDEN);
    });

    it('deve classificar erro HTTP 404', () => {
      const notFoundError = { status: 404, message: 'Not found' };
      const result = errorHandler.classifyError(notFoundError);
      expect(result).toBe(ERROR_TYPES.NOT_FOUND);
    });

    it('deve classificar erro de validação', () => {
      const validationError = new Error('Validation failed');
      const result = errorHandler.classifyError(validationError);
      expect(result).toBe(ERROR_TYPES.VALIDATION);
    });

    it('deve classificar erro de autenticação', () => {
      const authError = new Error('Authentication failed');
      const result = errorHandler.classifyError(authError);
      expect(result).toBe(ERROR_TYPES.AUTH);
    });

    it('deve classificar erro de banco de dados', () => {
      const dbError = new Error('Database connection failed');
      const result = errorHandler.classifyError(dbError);
      expect(result).toBe(ERROR_TYPES.DATABASE);
    });

    it('deve classificar erro de constraint', () => {
      const constraintError = new Error('UNIQUE constraint failed');
      const result = errorHandler.classifyError(constraintError);
      expect(result).toBe(ERROR_TYPES.CONSTRAINT);
    });

    it('deve classificar erro desconhecido', () => {
      const unknownError = new Error('Something weird happened');
      const result = errorHandler.classifyError(unknownError);
      expect(result).toBe(ERROR_TYPES.UNKNOWN);
    });
  });

  describe('createErrorContext', () => {
    it('deve criar contexto completo do erro', () => {
      const error = new Error('Test error');
      error.code = 'TEST_CODE';

      const context = errorHandler.createErrorContext(error, {
        userId: 123,
        action: 'test'
      });

      expect(context.message).toBe('Test error');
      expect(context.code).toBe('TEST_CODE');
      expect(context.userId).toBe(123);
      expect(context.action).toBe('test');
      expect(context.timestamp).toBeDefined();
    });
  });

  describe('handleError', () => {
    it('deve tratar erro completamente', () => {
      const error = new Error('Network request failed');
      const result = errorHandler.handleError(error, { userId: 123 });

      expect(result.type).toBe(ERROR_TYPES.NETWORK);
      expect(result.original).toBe(error);
      expect(result.context.userId).toBe(123);
      expect(result.userMessage.title).toBe('Erro de Conexão');
    });
  });

  describe('showUserError', () => {
    it('deve mostrar alert para o usuário', () => {
      const error = new Error('Network request failed');

      errorHandler.showUserError(error);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Erro de Conexão',
        'Verifique sua conexão com a internet e tente novamente.',
        expect.any(Array)
      );
    });

    it('deve incluir botão de retry quando fornecido', () => {
      const error = new Error('Network request failed');
      const retryFn = jest.fn();

      errorHandler.showUserError(error, {}, { onRetry: retryFn });

      expect(Alert.alert).toHaveBeenCalled();
      const alertCall = Alert.alert.mock.calls[0];
      const buttons = alertCall[2];

      expect(buttons).toHaveLength(2);
      expect(buttons[0].text).toBe('Tentar novamente');
    });

    it('deve usar mensagem customizada quando fornecida', () => {
      const error = new Error('Network request failed');
      const customMessage = 'Mensagem personalizada';

      errorHandler.showUserError(error, {}, { customMessage });

      expect(Alert.alert).toHaveBeenCalledWith('Erro de Conexão', customMessage, expect.any(Array));
    });
  });

  describe('withRetry', () => {
    it('deve executar operação com sucesso na primeira tentativa', async () => {
      const successOperation = jest.fn().mockResolvedValue('success');

      const result = await errorHandler.withRetry(successOperation, 3);

      expect(result).toBe('success');
      expect(successOperation).toHaveBeenCalledTimes(1);
    });

    it('deve tentar novamente em caso de falha', async () => {
      const failingOperation = jest
        .fn()
        .mockRejectedValueOnce(new Error('Falha 1'))
        .mockRejectedValueOnce(new Error('Falha 2'))
        .mockResolvedValue('success');

      const result = await errorHandler.withRetry(failingOperation, 3, 10);

      expect(result).toBe('success');
      expect(failingOperation).toHaveBeenCalledTimes(3);
    });

    it('deve falhar após esgotar tentativas', async () => {
      const alwaysFailingOperation = jest.fn().mockRejectedValue(new Error('Sempre falha'));

      await expect(errorHandler.withRetry(alwaysFailingOperation, 2, 10)).rejects.toThrow(
        'Sempre falha'
      );

      expect(alwaysFailingOperation).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Funções de conveniência', () => {
  describe('handleError', () => {
    it('deve exportar função de conveniência', () => {
      expect(typeof handleError).toBe('function');
    });
  });

  describe('showUserError', () => {
    it('deve exportar função de conveniência', () => {
      expect(typeof showUserError).toBe('function');
    });
  });

  describe('withRetry', () => {
    it('deve exportar função de conveniência', () => {
      expect(typeof withRetry).toBe('function');
    });
  });
});

describe('ERROR_TYPES', () => {
  it('deve ter todos os tipos de erro definidos', () => {
    expect(ERROR_TYPES.NETWORK).toBeDefined();
    expect(ERROR_TYPES.TIMEOUT).toBeDefined();
    expect(ERROR_TYPES.CONNECTION).toBeDefined();
    expect(ERROR_TYPES.AUTH).toBeDefined();
    expect(ERROR_TYPES.UNAUTHORIZED).toBeDefined();
    expect(ERROR_TYPES.FORBIDDEN).toBeDefined();
    expect(ERROR_TYPES.VALIDATION).toBeDefined();
    expect(ERROR_TYPES.REQUIRED_FIELD).toBeDefined();
    expect(ERROR_TYPES.INVALID_FORMAT).toBeDefined();
    expect(ERROR_TYPES.DATABASE).toBeDefined();
    expect(ERROR_TYPES.CONSTRAINT).toBeDefined();
    expect(ERROR_TYPES.NOT_FOUND).toBeDefined();
    expect(ERROR_TYPES.PERMISSION).toBeDefined();
    expect(ERROR_TYPES.STORAGE).toBeDefined();
    expect(ERROR_TYPES.UNKNOWN).toBeDefined();
  });
});
