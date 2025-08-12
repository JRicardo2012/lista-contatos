// constants/nubank-theme.js
// Tema inspirado no design do Nubank

export const NUBANK_COLORS = {
  // Cores principais do Nubank
  PRIMARY: '#820AD1', // Roxo principal
  PRIMARY_DARK: '#6B0AAE', // Roxo escuro
  PRIMARY_LIGHT: '#A640FF', // Roxo claro

  // Cores secundárias
  SECONDARY: '#8A05BE', // Roxo secundário
  ACCENT: '#820AD1', // Roxo accent

  // Cores de fundo
  BACKGROUND: '#FFFFFF', // Branco puro
  BACKGROUND_SECONDARY: '#F7F7F7', // Cinza muito claro
  BACKGROUND_TERTIARY: '#F0F0F3', // Cinza claro

  // Cores de texto
  TEXT_PRIMARY: '#111111', // Preto
  TEXT_SECONDARY: '#717171', // Cinza médio
  TEXT_TERTIARY: '#919191', // Cinza claro
  TEXT_WHITE: '#FFFFFF', // Branco

  // Cores de status
  SUCCESS: '#00D1B6', // Verde água
  WARNING: '#FFA500', // Laranja
  ERROR: '#FF5252', // Vermelho
  INFO: '#820AD1', // Roxo

  // Cores de cartões
  CARD_BACKGROUND: '#FFFFFF',
  CARD_BORDER: '#F0F0F3',

  // Sombras
  SHADOW: 'rgba(0, 0, 0, 0.1)',
  SHADOW_LIGHT: 'rgba(0, 0, 0, 0.05)',

  // Overlays
  OVERLAY: 'rgba(0, 0, 0, 0.5)',
  OVERLAY_LIGHT: 'rgba(0, 0, 0, 0.3)',

  // Gradientes
  GRADIENT_PRIMARY: ['#820AD1', '#A640FF'],
  GRADIENT_SECONDARY: ['#820AD1', '#6B0AAE']
};

export const NUBANK_SPACING = {
  XS: 4,
  SM: 8,
  MD: 16,
  LG: 24,
  XL: 32,
  XXL: 48,
  XXXL: 64
};

export const NUBANK_FONT_SIZES = {
  XS: 12,
  SM: 14,
  MD: 16,
  LG: 18,
  XL: 24,
  XXL: 32,
  XXXL: 40,
  GIANT: 48
};

export const NUBANK_FONT_WEIGHTS = {
  REGULAR: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700',
  EXTRABOLD: '800'
};

export const NUBANK_BORDER_RADIUS = {
  SM: 4,
  MD: 8,
  LG: 12,
  XL: 16,
  XXL: 24,
  ROUND: 9999
};

export const NUBANK_SHADOWS = {
  SM: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  MD: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4
  },
  LG: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8
  },
  XL: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12
  }
};

// Componentes estilizados do Nubank
export const NUBANK_COMPONENTS = {
  // Botão primário estilo Nubank
  primaryButton: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingVertical: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.XL,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center',
    ...NUBANK_SHADOWS.MD
  },

  // Botão secundário (outline)
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: NUBANK_COLORS.PRIMARY,
    paddingVertical: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.XL,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    alignItems: 'center',
    justifyContent: 'center'
  },

  // Card estilo Nubank
  card: {
    backgroundColor: NUBANK_COLORS.CARD_BACKGROUND,
    borderRadius: NUBANK_BORDER_RADIUS.LG,
    padding: NUBANK_SPACING.LG,
    marginBottom: NUBANK_SPACING.MD,
    ...NUBANK_SHADOWS.MD
  },

  // Input estilo Nubank
  input: {
    backgroundColor: NUBANK_COLORS.BACKGROUND_SECONDARY,
    borderRadius: NUBANK_BORDER_RADIUS.MD,
    paddingVertical: NUBANK_SPACING.MD,
    paddingHorizontal: NUBANK_SPACING.MD,
    fontSize: NUBANK_FONT_SIZES.MD,
    color: NUBANK_COLORS.TEXT_PRIMARY,
    borderWidth: 1,
    borderColor: 'transparent'
  },

  // Header estilo Nubank
  header: {
    backgroundColor: NUBANK_COLORS.PRIMARY,
    paddingTop: 60,
    paddingHorizontal: NUBANK_SPACING.LG,
    paddingBottom: NUBANK_SPACING.LG
  }
};

// Animações comuns do Nubank
export const NUBANK_ANIMATIONS = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500
  },
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  }
};

export default {
  COLORS: NUBANK_COLORS,
  SPACING: NUBANK_SPACING,
  FONT_SIZES: NUBANK_FONT_SIZES,
  FONT_WEIGHTS: NUBANK_FONT_WEIGHTS,
  BORDER_RADIUS: NUBANK_BORDER_RADIUS,
  SHADOWS: NUBANK_SHADOWS,
  COMPONENTS: NUBANK_COMPONENTS,
  ANIMATIONS: NUBANK_ANIMATIONS
};
