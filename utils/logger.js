// utils/logger.js - Sistema de logging estruturado

import { LOG_LEVELS } from '../constants';
import config from '../config/environment';

/**
 * 📝 Sistema de Logging Estruturado
 *
 * Funcionalidades:
 * - Logs estruturados com contexto
 * - Diferentes níveis de log (error, warn, info, debug)
 * - Formatação consistente
 * - Filtragem por ambiente
 * - Persistência opcional
 */

class Logger {
  constructor() {
    this.logLevel = config.LOG_LEVEL || 'info';
    this.enableConsole = config.DEBUG || false;
    this.enablePersistence = false; // Pode ser habilitado futuramente

    // 📊 Hierarquia dos níveis de log
    this.levels = {
      [LOG_LEVELS.ERROR]: 0,
      [LOG_LEVELS.WARN]: 1,
      [LOG_LEVELS.INFO]: 2,
      [LOG_LEVELS.DEBUG]: 3
    };
  }

  /**
   * 🎯 Verifica se o nível de log deve ser exibido
   */
  shouldLog(level) {
    const currentLevelValue = this.levels[this.logLevel] || 0;
    const messageLevelValue = this.levels[level] || 0;
    return messageLevelValue <= currentLevelValue;
  }

  /**
   * 🎨 Formata a mensagem de log
   */
  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString();
    const emoji = this.getLevelEmoji(level);

    return {
      timestamp,
      level: level.toUpperCase(),
      message,
      context,
      emoji,
      formatted: `${emoji} [${level.toUpperCase()}] ${timestamp} - ${message}`
    };
  }

  /**
   * 😀 Retorna emoji para o nível de log
   */
  getLevelEmoji(level) {
    const emojis = {
      [LOG_LEVELS.ERROR]: '❌',
      [LOG_LEVELS.WARN]: '⚠️',
      [LOG_LEVELS.INFO]: 'ℹ️',
      [LOG_LEVELS.DEBUG]: '🐛'
    };
    return emojis[level] || '📝';
  }

  /**
   * 🖨️ Imprime o log no console
   */
  printToConsole(logObject) {
    if (!this.enableConsole) return;

    const { level, formatted, context } = logObject;

    // Escolhe o método do console baseado no nível
    const consoleMethod =
      {
        [LOG_LEVELS.ERROR]: console.error,
        [LOG_LEVELS.WARN]: console.warn,
        [LOG_LEVELS.INFO]: console.info,
        [LOG_LEVELS.DEBUG]: console.log
      }[level] || console.log;

    // Imprime a mensagem
    consoleMethod(formatted);

    // Imprime o contexto se houver
    if (Object.keys(context).length > 0) {
      console.log('📋 Context:', context);
    }
  }

  /**
   * 💾 Salva o log (implementação futura)
   */
  async persistLog(logObject) {
    if (!this.enablePersistence) return;

    // TODO: Implementar persistência em AsyncStorage ou arquivo
    // Para desenvolvimento futuro com análise de logs
  }

  /**
   * 📝 Método genérico de log
   */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) return;

    const logObject = this.formatMessage(level, message, context);

    // Imprime no console
    this.printToConsole(logObject);

    // Persiste se habilitado
    this.persistLog(logObject);

    return logObject;
  }

  /**
   * ❌ Log de erro
   */
  error(message, context = {}) {
    return this.log(LOG_LEVELS.ERROR, message, {
      ...context,
      stack: context.error?.stack || new Error().stack
    });
  }

  /**
   * ⚠️ Log de aviso
   */
  warn(message, context = {}) {
    return this.log(LOG_LEVELS.WARN, message, context);
  }

  /**
   * ℹ️ Log de informação
   */
  info(message, context = {}) {
    return this.log(LOG_LEVELS.INFO, message, context);
  }

  /**
   * 🐛 Log de debug
   */
  debug(message, context = {}) {
    return this.log(LOG_LEVELS.DEBUG, message, context);
  }

  /**
   * 🚀 Log de início de operação
   */
  start(operation, context = {}) {
    return this.info(`🚀 Iniciando: ${operation}`, {
      operation,
      ...context
    });
  }

  /**
   * ✅ Log de fim de operação
   */
  end(operation, duration, context = {}) {
    return this.info(`✅ Concluído: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      ...context
    });
  }

  /**
   * 📊 Log de performance
   */
  performance(operation, startTime, context = {}) {
    const duration = Date.now() - startTime;
    const level = duration > 1000 ? LOG_LEVELS.WARN : LOG_LEVELS.INFO;

    return this.log(level, `⏱️ Performance: ${operation}`, {
      operation,
      duration: `${duration}ms`,
      slow: duration > 1000,
      ...context
    });
  }

  /**
   * 🔐 Log de autenticação
   */
  auth(action, userId, context = {}) {
    return this.info(`🔐 Auth: ${action}`, {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...context
    });
  }

  /**
   * 💾 Log de banco de dados
   */
  database(operation, table, context = {}) {
    return this.debug(`💾 DB: ${operation} on ${table}`, {
      operation,
      table,
      ...context
    });
  }

  /**
   * 🌐 Log de API
   */
  api(method, url, status, duration, context = {}) {
    const level = status >= 400 ? LOG_LEVELS.ERROR : LOG_LEVELS.INFO;

    return this.log(level, `🌐 API: ${method} ${url} - ${status}`, {
      method,
      url,
      status,
      duration: `${duration}ms`,
      ...context
    });
  }

  /**
   * 📱 Log de interface
   */
  ui(action, component, context = {}) {
    return this.debug(`📱 UI: ${action} in ${component}`, {
      action,
      component,
      ...context
    });
  }
}

// 🏭 Instância singleton do logger
const logger = new Logger();

// 🎯 Métodos de conveniência exportados
export const logError = (message, context) => logger.error(message, context);
export const logWarn = (message, context) => logger.warn(message, context);
export const logInfo = (message, context) => logger.info(message, context);
export const logDebug = (message, context) => logger.debug(message, context);

export const logStart = (operation, context) => logger.start(operation, context);
export const logEnd = (operation, duration, context) => logger.end(operation, duration, context);
export const logPerformance = (operation, startTime, context) =>
  logger.performance(operation, startTime, context);

export const logAuth = (action, userId, context) => logger.auth(action, userId, context);
export const logDatabase = (operation, table, context) =>
  logger.database(operation, table, context);
export const logApi = (method, url, status, duration, context) =>
  logger.api(method, url, status, duration, context);
export const logUI = (action, component, context) => logger.ui(action, component, context);

// 📊 Exporta o logger principal
export default logger;

// 🎯 Hook para usar o logger em componentes React
export const useLogger = () => {
  return {
    error: logError,
    warn: logWarn,
    info: logInfo,
    debug: logDebug,
    start: logStart,
    end: logEnd,
    performance: logPerformance,
    auth: logAuth,
    database: logDatabase,
    api: logApi,
    ui: logUI
  };
};
