// utils/helpers.js
export const rs = {
  spacing: {
    sm: 8,
    md: 12,
    lg: 20,
    xl: 32,
  },
  fontSize: {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  },
};

export function formatCurrency(value) {
  if (!value && value !== 0) return 'R$ 0,00';
  
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(isoDateString) {
  if (!isoDateString) return "";
  
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat("pt-BR").format(date);
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return "";
  }
}

export function formatDateTime(isoDateString) {
  if (!isoDateString) return "";
  
  try {
    const date = new Date(isoDateString);
    return new Intl.DateTimeFormat("pt-BR", {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch (error) {
    console.error('Erro ao formatar data/hora:', error);
    return "";
  }
}

export function formatPhone(text) {
  if (!text) return '';
  
  const cleaned = text.replace(/\D/g, '');
  
  if (cleaned.length <= 2) {
    return cleaned;
  } else if (cleaned.length <= 7) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
  } else if (cleaned.length <= 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  } else {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
  }
}

export function validateEmail(email) {
  if (!email || !email.trim()) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePhone(phone) {
  if (!phone) return false;
  
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
}

export function truncateText(text, maxLength = 50) {
  if (!text) return "";
  
  if (text.length <= maxLength) {
    return text;
  }
  
  return text.substring(0, maxLength) + "...";
}

export function capitalizeWords(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseMoneyInput(input) {
  if (!input) return null;
  
  const cleaned = input.replace(/[^0-9,]/g, '');
  const normalized = cleaned.replace(',', '.');
  const value = parseFloat(normalized);
  
  return isNaN(value) ? null : value;
}

export function generateRandomColor() {
  const colors = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
    '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', 
    '#f43f5e', '#64748b'
  ];
  
  return colors[Math.floor(Math.random() * colors.length)];
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

export function isNotEmpty(value) {
  return value && value.toString().trim().length > 0;
}

export function formatLargeNumber(num) {
  if (!num) return '0';
  
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  
  return num.toString();
}

export default {
  rs,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  validateEmail,
  validatePhone,
  truncateText,
  capitalizeWords,
  parseMoneyInput,
  generateRandomColor,
  debounce,
  daysBetween,
  isNotEmpty,
  formatLargeNumber
};