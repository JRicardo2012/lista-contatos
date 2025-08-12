// utils/crypto.js - VERSÃO SEGURA COM BCRYPT
import bcrypt from 'react-native-bcrypt';

// Número de rounds para o salt (10-12 é um bom balanço entre segurança e performance)
const SALT_ROUNDS = 10;

/**
 * Gera hash seguro da senha usando bcrypt
 * @param {string} password - Senha em texto plano
 * @returns {string} - Hash seguro da senha
 */
export const hashPassword = password => {
  if (!password) return '';

  try {
    // Gera salt único para cada senha
    const salt = bcrypt.genSaltSync(SALT_ROUNDS);
    // Cria hash com o salt
    const hash = bcrypt.hashSync(password, salt);
    return hash;
  } catch (error) {
    console.error('Erro ao gerar hash da senha:', error);
    // Fallback para o método antigo temporariamente
    return oldHashMethod(password);
  }
};

/**
 * Verifica se a senha corresponde ao hash
 * @param {string} password - Senha em texto plano
 * @param {string} hash - Hash armazenado
 * @returns {boolean} - True se a senha está correta
 */
export const verifyPassword = (password, hash) => {
  if (!password || !hash) return false;

  try {
    // Verifica se é um hash bcrypt válido
    if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
      return bcrypt.compareSync(password, hash);
    }

    // Se não é bcrypt, pode ser hash antigo
    return oldHashMethod(password) === hash;
  } catch (error) {
    console.error('Erro ao verificar senha:', error);
    return false;
  }
};

/**
 * Método antigo mantido temporariamente para migração
 * @private
 */
const oldHashMethod = password => {
  const salt = 'FinanceApp2024';
  const combined = password + salt;
  let hash = '';
  for (let i = 0; i < combined.length; i++) {
    hash += combined.charCodeAt(i).toString(16);
  }
  return hash;
};

/**
 * Verifica se a senha precisa ser migrada para bcrypt
 * @param {string} hash - Hash atual
 * @returns {boolean} - True se precisa migração
 */
export const needsPasswordMigration = hash => {
  if (!hash) return false;
  // Hashes bcrypt começam com $2a$ ou $2b$
  return !hash.startsWith('$2a$') && !hash.startsWith('$2b$');
};

/**
 * Valida força da senha
 * @param {string} password - Senha a validar
 * @returns {object} - { isValid: boolean, message: string }
 */
export const validatePasswordStrength = password => {
  if (!password) {
    return { isValid: false, message: 'Senha é obrigatória' };
  }

  if (password.length < 8) {
    return { isValid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase) {
    return { isValid: false, message: 'Senha deve conter letras maiúsculas e minúsculas' };
  }

  if (!hasNumbers) {
    return { isValid: false, message: 'Senha deve conter pelo menos um número' };
  }

  if (!hasSpecialChar) {
    return { isValid: false, message: 'Senha deve conter pelo menos um caractere especial' };
  }

  return { isValid: true, message: 'Senha forte' };
};
