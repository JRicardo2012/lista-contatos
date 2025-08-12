// utils/errorHandler.js - Sistema de tratamento de erros padronizado

// Importação condicional do Alert para testes
let Alert;
try {
  Alert = require('react-native').Alert;
} catch (e) {
  // Mock para ambiente de teste
  Alert = {
    alert: () => {}
  };
}
import logger from './logger';
import { NOTIFICATION_TYPES } from '../constants';

/**
 * 🚨 Sistema de Tratamento de Erros Padronizado
 *
 * Funcionalidades:
 * - Classificação automática de erros
 * - Mensagens padronizadas para o usuário
 * - Logging estruturado de erros
 * - Recovery automático quando possível
 * - Notificações consistentes
 */

// 🏷️ TIPOS DE ERRO
export const ERROR_TYPES = {
  // Erros de rede
  NETWORK: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  CONNECTION: 'CONNECTION_ERROR',

  // Erros de autenticação
  AUTH: 'AUTH_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED_ERROR',
  FORBIDDEN: 'FORBIDDEN_ERROR',

  // Erros de validação
  VALIDATION: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD_ERROR',
  INVALID_FORMAT: 'INVALID_FORMAT_ERROR',

  // Erros de banco de dados
  DATABASE: 'DATABASE_ERROR',
  CONSTRAINT: 'CONSTRAINT_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',

  // Erros de sistema
  PERMISSION: 'PERMISSION_ERROR',
  STORAGE: 'STORAGE_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR'
};

// 📝 MENSAGENS DE ERRO PARA O USUÁRIO
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: {
    title: 'Erro de Conexão',
    message: 'Verifique sua conexão com a internet e tente novamente.',
    recovery: 'Tentar novamente'
  },
  [ERROR_TYPES.TIMEOUT]: {
    title: 'Tempo Esgotado',
    message: 'A operação demorou mais que o esperado. Tente novamente.',
    recovery: 'Tentar novamente'
  },
  [ERROR_TYPES.CONNECTION]: {
    title: 'Falha na Conexão',
    message: 'Não foi possível conectar ao servidor. Tente novamente em alguns instantes.',
    recovery: 'Tentar novamente'
  },
  [ERROR_TYPES.AUTH]: {
    title: 'Erro de Autenticação',
    message: 'Suas credenciais são inválidas. Verifique e tente novamente.',
    recovery: 'Fazer login novamente'
  },
  [ERROR_TYPES.UNAUTHORIZED]: {
    title: 'Acesso Negado',
    message: 'Você não tem permissão para realizar esta ação.',
    recovery: 'Fazer login novamente'
  },
  [ERROR_TYPES.FORBIDDEN]: {
    title: 'Operação Não Permitida',
    message: 'Esta operação não é permitida para sua conta.',
    recovery: null
  },
  [ERROR_TYPES.VALIDATION]: {
    title: 'Dados Inválidos',
    message: 'Alguns campos não foram preenchidos corretamente.',
    recovery: 'Corrigir dados'
  },
  [ERROR_TYPES.REQUIRED_FIELD]: {
    title: 'Campo Obrigatório',
    message: 'Por favor, preencha todos os campos obrigatórios.',
    recovery: 'Preencher campos'
  },
  [ERROR_TYPES.INVALID_FORMAT]: {
    title: 'Formato Inválido',
    message: 'O formato dos dados não está correto.',
    recovery: 'Corrigir formato'
  },
  [ERROR_TYPES.DATABASE]: {
    title: 'Erro no Banco de Dados',
    message: 'Ocorreu um erro ao salvar os dados. Tente novamente.',
    recovery: 'Tentar novamente'
  },
  [ERROR_TYPES.CONSTRAINT]: {
    title: 'Violação de Regra',
    message: 'Esta operação violaria uma regra do sistema.',
    recovery: null
  },
  [ERROR_TYPES.NOT_FOUND]: {
    title: 'Não Encontrado',
    message: 'O item solicitado não foi encontrado.',
    recovery: 'Atualizar lista'
  },
  [ERROR_TYPES.PERMISSION]: {
    title: 'Permissão Negada',
    message: 'O aplicativo precisa de permissão para realizar esta operação.',
    recovery: 'Conceder permissão'
  },
  [ERROR_TYPES.STORAGE]: {
    title: 'Erro de Armazenamento',
    message: 'Não foi possível salvar os dados no dispositivo.',
    recovery: 'Liberar espaço'
  },
  [ERROR_TYPES.UNKNOWN]: {
    title: 'Erro Inesperado',
    message: 'Ocorreu um erro inesperado. Tente novamente.',
    recovery: 'Tentar novamente'
  }
};

/**
 * 🎯 Classe principal de tratamento de erros
 */
class ErrorHandler {
  /**
   * 🔍 Classifica automaticamente o tipo de erro
   */
  classifyError(error) {
    if (!error) return ERROR_TYPES.UNKNOWN;

    const message = error.message?.toLowerCase() || '';
    const code = error.code || '';
    const status = error.status || error.statusCode || 0;

    // Erros de rede
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      code === 'NETWORK_REQUEST_FAILED'
    ) {
      return ERROR_TYPES.NETWORK;
    }

    if (message.includes('timeout') || code === 'TIMEOUT') {
      return ERROR_TYPES.TIMEOUT;
    }

    if (message.includes('connection') || code === 'CONNECTION_FAILED') {
      return ERROR_TYPES.CONNECTION;
    }

    // Erros HTTP
    if (status === 401) return ERROR_TYPES.UNAUTHORIZED;
    if (status === 403) return ERROR_TYPES.FORBIDDEN;
    if (status === 404) return ERROR_TYPES.NOT_FOUND;
    if (status >= 400 && status < 500) return ERROR_TYPES.VALIDATION;
    if (status >= 500) return ERROR_TYPES.DATABASE;

    // Erros de autenticação
    if (message.includes('auth') || message.includes('login') || message.includes('token')) {
      return ERROR_TYPES.AUTH;
    }

    // Erros de validação
    if (message.includes('required') || message.includes('obrigatório')) {
      return ERROR_TYPES.REQUIRED_FIELD;
    }

    if (message.includes('format') || message.includes('invalid') || message.includes('inválido')) {
      return ERROR_TYPES.INVALID_FORMAT;
    }

    if (message.includes('validation') || message.includes('validação')) {
      return ERROR_TYPES.VALIDATION;
    }

    // Erros de banco de dados
    if (message.includes('database') || message.includes('sql') || message.includes('constraint')) {
      return message.includes('constraint') ? ERROR_TYPES.CONSTRAINT : ERROR_TYPES.DATABASE;
    }

    // Erros de permissão
    if (message.includes('permission') || message.includes('permissão')) {
      return ERROR_TYPES.PERMISSION;
    }

    // Erros de storage
    if (message.includes('storage') || message.includes('disk') || message.includes('space')) {
      return ERROR_TYPES.STORAGE;
    }

    return ERROR_TYPES.UNKNOWN;
  }

  /**
   * 📝 Cria contexto detalhado do erro
   */
  createErrorContext(error, additionalContext = {}) {
    return {
      // Informações do erro
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status || error.statusCode,
      stack: error.stack,

      // Contexto adicional
      timestamp: new Date().toISOString(),
      userAgent: global.navigator?.userAgent,
      url: global.location?.href,

      // Contexto fornecido
      ...additionalContext
    };
  }

  /**
   * 🚨 Trata um erro de forma completa
   */
  handleError(error, context = {}) {
    // Classifica o erro
    const errorType = this.classifyError(error);

    // Cria contexto completo
    const errorContext = this.createErrorContext(error, {
      type: errorType,
      ...context
    });

    // Registra o erro no log
    logger.error(`Erro capturado: ${errorType}`, errorContext);

    // Retorna informações para tratamento
    return {
      type: errorType,
      original: error,
      context: errorContext,
      userMessage: ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN]
    };
  }

  /**
   * 📱 Mostra erro para o usuário
   */
  showUserError(error, context = {}, options = {}) {
    const handledError = this.handleError(error, context);
    const { userMessage } = handledError;

    const { showAlert = true, onRetry = null, customMessage = null } = options;

    if (!showAlert) return handledError;

    // Prepara botões do alert
    const buttons = ['Entendi'];

    if (userMessage.recovery && onRetry) {
      buttons.unshift({
        text: userMessage.recovery,
        onPress: onRetry
      });
    }

    // Mostra o alert
    Alert.alert(
      userMessage.title,
      customMessage || userMessage.message,
      buttons.map(button => (typeof button === 'string' ? { text: button } : button))
    );

    return handledError;
  }

  /**
   * 🔄 Tenta executar uma operação com retry automático
   */
  async withRetry(operation, maxRetries = 3, delay = 1000) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const result = await operation();

        // Log de sucesso após retry
        if (attempt > 1) {
          logger.info(`✅ Operação bem-sucedida após ${attempt} tentativas`, {
            attempts: attempt,
            duration: Date.now() - startTime
          });
        }

        return result;
      } catch (error) {
        lastError = error;

        logger.warn(`⚠️ Tentativa ${attempt}/${maxRetries} falhou`, {
          attempt,
          maxRetries,
          error: error.message,
          willRetry: attempt < maxRetries
        });

        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError;
  }

  /**
   * 🛡️ Wrapper para funções assíncronas com tratamento de erro
   */
  async safeAsync(operation, context = {}, options = {}) {
    try {
      return await operation();
    } catch (error) {
      return this.showUserError(error, context, options);
    }
  }

  /**
   * 🎯 Hook para boundary de erro em componentes
   */
  createErrorBoundary(fallbackComponent) {
    return class ErrorBoundary extends React.Component {
      constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
      }

      static getDerivedStateFromError(error) {
        return { hasError: true, error };
      }

      componentDidCatch(error, errorInfo) {
        errorHandler.handleError(error, {
          componentStack: errorInfo.componentStack,
          boundary: 'ErrorBoundary'
        });
      }

      render() {
        if (this.state.hasError) {
          return fallbackComponent || null;
        }

        return this.props.children;
      }
    };
  }
}

// 🏭 Instância singleton do error handler
const errorHandler = new ErrorHandler();

// 🎯 Funções de conveniência exportadas
export const handleError = (error, context, options) =>
  errorHandler.handleError(error, context, options);

export const showUserError = (error, context, options) =>
  errorHandler.showUserError(error, context, options);

export const withRetry = (operation, maxRetries, delay) =>
  errorHandler.withRetry(operation, maxRetries, delay);

export const safeAsync = (operation, context, options) =>
  errorHandler.safeAsync(operation, context, options);

export const createErrorBoundary = fallbackComponent =>
  errorHandler.createErrorBoundary(fallbackComponent);

// 📊 Exporta o handler principal
export default errorHandler;

// 🎯 Hook para usar em componentes React
export const useErrorHandler = () => {
  return {
    handle: handleError,
    show: showUserError,
    retry: withRetry,
    safe: safeAsync,
    boundary: createErrorBoundary
  };
};
