// config/environment.js - Configurações de ambiente

import { APP_CONFIG } from '../constants';

// 🌍 CONFIGURAÇÕES POR AMBIENTE
const environments = {
  development: {
    // Debug e logs
    DEBUG: true,
    LOG_LEVEL: 'debug',
    ENABLE_FLIPPER: true,
    ENABLE_REDUX_DEVTOOLS: true,

    // Performance
    ENABLE_PERFORMANCE_MONITORING: false,
    ENABLE_CRASH_REPORTING: false,

    // Features
    ENABLE_BETA_FEATURES: true,
    ENABLE_MOCK_DATA: false,

    // API
    API_BASE_URL: 'http://localhost:3000/api',
    API_TIMEOUT: 30000,

    // Cache
    CACHE_ENABLED: true,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutos

    // Database
    DATABASE_LOGGING: true,
    DATABASE_RESET_ON_START: false,

    // Analytics
    ENABLE_ANALYTICS: false,
    ANALYTICS_DEBUG: true
  },

  staging: {
    // Debug e logs
    DEBUG: false,
    LOG_LEVEL: 'info',
    ENABLE_FLIPPER: false,
    ENABLE_REDUX_DEVTOOLS: false,

    // Performance
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_CRASH_REPORTING: true,

    // Features
    ENABLE_BETA_FEATURES: true,
    ENABLE_MOCK_DATA: false,

    // API
    API_BASE_URL: 'https://staging-api.controle-financeiro.com/api',
    API_TIMEOUT: 15000,

    // Cache
    CACHE_ENABLED: true,
    CACHE_TTL: 10 * 60 * 1000, // 10 minutos

    // Database
    DATABASE_LOGGING: false,
    DATABASE_RESET_ON_START: false,

    // Analytics
    ENABLE_ANALYTICS: true,
    ANALYTICS_DEBUG: false
  },

  production: {
    // Debug e logs
    DEBUG: false,
    LOG_LEVEL: 'error',
    ENABLE_FLIPPER: false,
    ENABLE_REDUX_DEVTOOLS: false,

    // Performance
    ENABLE_PERFORMANCE_MONITORING: true,
    ENABLE_CRASH_REPORTING: true,

    // Features
    ENABLE_BETA_FEATURES: false,
    ENABLE_MOCK_DATA: false,

    // API
    API_BASE_URL: 'https://api.controle-financeiro.com/api',
    API_TIMEOUT: 10000,

    // Cache
    CACHE_ENABLED: true,
    CACHE_TTL: 30 * 60 * 1000, // 30 minutos

    // Database
    DATABASE_LOGGING: false,
    DATABASE_RESET_ON_START: false,

    // Analytics
    ENABLE_ANALYTICS: true,
    ANALYTICS_DEBUG: false
  }
};

// 🎯 DETECTAR AMBIENTE ATUAL
const getCurrentEnvironment = () => {
  if (__DEV__) {
    return 'development';
  }

  // Verifica se é ambiente de staging através de variáveis específicas
  if (APP_CONFIG.VERSION.includes('beta') || APP_CONFIG.VERSION.includes('staging')) {
    return 'staging';
  }

  return 'production';
};

// 📱 CONFIGURAÇÃO ATUAL
const currentEnv = getCurrentEnvironment();
const config = {
  ...environments[currentEnv],
  ENVIRONMENT: currentEnv,
  IS_DEVELOPMENT: currentEnv === 'development',
  IS_STAGING: currentEnv === 'staging',
  IS_PRODUCTION: currentEnv === 'production'
};

// 🛠️ UTILITÁRIOS DE CONFIGURAÇÃO
export const getConfig = key => {
  return config[key];
};

export const isFeatureEnabled = feature => {
  return config[`ENABLE_${feature.toUpperCase()}`] || false;
};

export const isDevelopment = () => config.IS_DEVELOPMENT;
export const isStaging = () => config.IS_STAGING;
export const isProduction = () => config.IS_PRODUCTION;

// 📊 LOG DE CONFIGURAÇÃO (apenas em desenvolvimento)
if (isDevelopment()) {
  console.log('🌍 Environment Configuration:', {
    environment: currentEnv,
    debug: config.DEBUG,
    logLevel: config.LOG_LEVEL,
    apiUrl: config.API_BASE_URL,
    cacheEnabled: config.CACHE_ENABLED
  });
}

export default config;
