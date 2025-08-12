// constants/index.js - Constantes centralizadas do aplicativo

// 🎨 CORES DO TEMA
export const COLORS = {
  // Cores primárias
  PRIMARY: '#6366F1',
  PRIMARY_LIGHT: '#8B5CF6',
  PRIMARY_DARK: '#4F46E5',

  // Cores de status
  SUCCESS: '#10B981',
  WARNING: '#F59E0B',
  ERROR: '#EF4444',
  INFO: '#3B82F6',

  // Cores neutras
  WHITE: '#FFFFFF',
  BLACK: '#000000',
  GRAY_50: '#F9FAFB',
  GRAY_100: '#F3F4F6',
  GRAY_200: '#E5E7EB',
  GRAY_300: '#D1D5DB',
  GRAY_400: '#9CA3AF',
  GRAY_500: '#6B7280',
  GRAY_600: '#4B5563',
  GRAY_700: '#374151',
  GRAY_800: '#1F2937',
  GRAY_900: '#111827',

  // Cores específicas do app
  EXPENSE_RED: '#DC2626',
  INCOME_GREEN: '#16A34A',
  BACKGROUND: '#F9FAFB',
  CARD_BACKGROUND: '#FFFFFF',

  // Cores dos gráficos
  CHART_COLORS: [
    '#6366F1',
    '#8B5CF6',
    '#EC4899',
    '#F59E0B',
    '#10B981',
    '#3B82F6',
    '#EF4444',
    '#84CC16'
  ]
};

// 📏 DIMENSÕES E ESPAÇAMENTOS
export const SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
  XXXL: 64
};

export const BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  XXL: 24,
  ROUND: 50
};

// 📝 TIPOGRAFIA
export const FONT_SIZES = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 20,
  XXL: 24,
  XXXL: 32,
  HEADING: 28
};

export const FONT_WEIGHTS = {
  LIGHT: '300',
  REGULAR: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700'
};

// 🔐 CONFIGURAÇÕES DE SEGURANÇA
export const SECURITY = {
  SALT_ROUNDS: 12,
  SESSION_TIMEOUT: 30 * 24 * 60 * 60 * 1000, // 30 dias em ms
  PASSWORD_MIN_LENGTH: 6,
  MAX_LOGIN_ATTEMPTS: 5
};

// 💾 CONFIGURAÇÕES DE CACHE
export const CACHE = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutos
  LONG_TTL: 30 * 60 * 1000, // 30 minutos
  SHORT_TTL: 1 * 60 * 1000, // 1 minuto
  STALE_TIME: 30 * 1000, // 30 segundos
  MAX_CACHE_SIZE: 100
};

// 📱 CONFIGURAÇÕES DA API
export const API = {
  TIMEOUT: 10000, // 10 segundos
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 segundo
};

// 📊 CONFIGURAÇÕES DE PAGINAÇÃO
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 0.1
};

// 🗃️ CONFIGURAÇÕES DO BANCO DE DADOS
export const DATABASE = {
  NAME: 'controle_financeiro.db',
  VERSION: 1,
  MAX_CONNECTIONS: 1,
  BUSY_TIMEOUT: 5000
};

// 📍 CONFIGURAÇÕES DE LOCALIZAÇÃO
export const LOCATION = {
  ACCURACY: 'Balanced',
  TIMEOUT: 15000, // 15 segundos
  MAX_AGE: 300000, // 5 minutos
  ENABLE_HIGH_ACCURACY: false
};

// 🎯 TIPOS DE VALIDAÇÃO
export const VALIDATION_TYPES = {
  EMAIL: 'email',
  PASSWORD: 'password',
  REQUIRED: 'required',
  MIN_LENGTH: 'minLength',
  MAX_LENGTH: 'maxLength',
  NUMERIC: 'numeric',
  CURRENCY: 'currency',
  DATE: 'date'
};

// 🏷️ CATEGORIAS PADRÃO
export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍽️' },
  { name: 'Transporte', icon: '🚗' },
  { name: 'Moradia', icon: '🏠' },
  { name: 'Saúde', icon: '🏥' },
  { name: 'Educação', icon: '📚' },
  { name: 'Lazer', icon: '🎮' },
  { name: 'Compras', icon: '🛒' },
  { name: 'Outros', icon: '📦' }
];

// 💳 MÉTODOS DE PAGAMENTO PADRÃO
export const DEFAULT_PAYMENT_METHODS = [
  { name: 'Dinheiro', icon: '💵' },
  { name: 'Cartão de Débito', icon: '💳' },
  { name: 'Cartão de Crédito', icon: '💳' },
  { name: 'PIX', icon: '📱' },
  { name: 'Transferência', icon: '🏦' }
];

// 📊 TIPOS DE PERÍODO
export const PERIOD_TYPES = {
  TODAY: 'today',
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  CUSTOM: 'custom'
};

// 🎨 ÍCONES DISPONÍVEIS
export const AVAILABLE_ICONS = {
  CATEGORIES: [
    '🍽️',
    '🛒',
    '🏠',
    '🚗',
    '⛽',
    '🎮',
    '🎬',
    '📚',
    '🏥',
    '💊',
    '👕',
    '👟',
    '✈️',
    '🏖️',
    '🎁',
    '💰',
    '📱',
    '💻',
    '🏋️',
    '🚌',
    '🚇',
    '🏪',
    '☕',
    '🍺',
    '🎯',
    '🔧',
    '🐾',
    '👶',
    '🎓',
    '💼',
    '🏦',
    '📦'
  ],
  PAYMENT_METHODS: [
    '💳',
    '💵',
    '💰',
    '🏦',
    '📱',
    '💸',
    '🪙',
    '💲',
    '🏧',
    '💴',
    '💶',
    '💷',
    '📲',
    '🏪',
    '🛒',
    '💎',
    '🎫',
    '🧾',
    '📄',
    '✉️',
    '📮',
    '🔖',
    '🏷️',
    '💌'
  ]
};

// 📅 CONFIGURAÇÕES DE DATA
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy',
  DISPLAY_TIME: 'dd/MM/yyyy HH:mm',
  DATABASE: 'yyyy-MM-dd',
  DATABASE_TIME: 'yyyy-MM-dd HH:mm:ss',
  API: 'yyyy-MM-ddTHH:mm:ss.SSSZ'
};

// 🌍 CONFIGURAÇÕES DE LOCALIZAÇÃO
export const LOCALE = {
  LANGUAGE: 'pt',
  COUNTRY: 'BR',
  CURRENCY: 'BRL',
  CURRENCY_SYMBOL: 'R$',
  DATE_LOCALE: 'pt-BR'
};

// 🚨 TIPOS DE LOG
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// 📱 CONFIGURAÇÕES DA APLICAÇÃO
export const APP_CONFIG = {
  NAME: 'Controle Financeiro',
  VERSION: '1.0.0',
  BUILD_NUMBER: 1,
  ENVIRONMENT: __DEV__ ? 'development' : 'production',
  DEBUG_MODE: __DEV__,
  ENABLE_FLIPPER: __DEV__,
  ENABLE_ANALYTICS: !__DEV__
};

// 🔔 TIPOS DE NOTIFICAÇÃO
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// ⏱️ DURAÇÕES DE ANIMAÇÃO
export const ANIMATION_DURATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800
};

// 📏 BREAKPOINTS RESPONSIVOS
export const BREAKPOINTS = {
  SMALL: 576,
  MEDIUM: 768,
  LARGE: 992,
  EXTRA_LARGE: 1200
};

export default {
  COLORS,
  SPACING,
  BORDER_RADIUS,
  FONT_SIZES,
  FONT_WEIGHTS,
  SECURITY,
  CACHE,
  API,
  PAGINATION,
  DATABASE,
  LOCATION,
  VALIDATION_TYPES,
  DEFAULT_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
  PERIOD_TYPES,
  AVAILABLE_ICONS,
  DATE_FORMATS,
  LOCALE,
  LOG_LEVELS,
  APP_CONFIG,
  NOTIFICATION_TYPES,
  ANIMATION_DURATION,
  BREAKPOINTS
};
