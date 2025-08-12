// services/EventEmitter.js
class EventEmitter {
  constructor() {
    this.events = {};
    this.maxListeners = 10;
  }

  /**
   * Adiciona um listener para um evento
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }

    // Verifica limite de listeners
    if (this.events[event].length >= this.maxListeners) {
      console.warn(`Máximo de listeners (${this.maxListeners}) atingido para o evento: ${event}`);
    }

    this.events[event].push(callback);

    // Retorna função para remover o listener
    return () => this.off(event, callback);
  }

  /**
   * Adiciona um listener que será executado apenas uma vez
   */
  once(event, callback) {
    const onceWrapper = (...args) => {
      callback(...args);
      this.off(event, onceWrapper);
    };

    return this.on(event, onceWrapper);
  }

  /**
   * Remove um listener
   */
  off(event, callback) {
    if (!this.events[event]) return;

    this.events[event] = this.events[event].filter(cb => cb !== callback);

    // Remove o evento se não houver mais listeners
    if (this.events[event].length === 0) {
      delete this.events[event];
    }
  }

  /**
   * Emite um evento
   */
  emit(event, ...args) {
    if (!this.events[event]) return;

    // Cria cópia para evitar problemas se um listener se remover
    const callbacks = [...this.events[event]];

    callbacks.forEach(callback => {
      try {
        callback(...args);
      } catch (error) {
        console.error(`Erro no listener do evento ${event}:`, error);
      }
    });
  }

  /**
   * Remove todos os listeners de um evento
   */
  removeAllListeners(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }

  /**
   * Lista todos os eventos e quantidade de listeners
   */
  getEventInfo() {
    const info = {};
    for (const event in this.events) {
      info[event] = this.events[event].length;
    }
    return info;
  }
}

// Singleton global
const eventEmitter = new EventEmitter();

// Eventos disponíveis
export const EVENTS = {
  EXPENSE_ADDED: 'expense:added',
  EXPENSE_UPDATED: 'expense:updated',
  EXPENSE_DELETED: 'expense:deleted',
  CATEGORY_CHANGED: 'category:changed',
  PAYMENT_METHOD_CHANGED: 'payment_method:changed',
  ESTABLISHMENT_CHANGED: 'establishment:changed',
  USER_LOGGED_IN: 'user:logged_in',
  USER_LOGGED_OUT: 'user:logged_out',
  DATA_SYNC_NEEDED: 'data:sync_needed'
};

export default eventEmitter;
