// utils/MemoryMonitor.js
import eventEmitter from '../services/EventEmitter';

class MemoryMonitor {
  constructor() {
    this.checkInterval = null;
    this.warningThreshold = 50; // MB
  }

  start() {
    if (this.checkInterval) return;

    this.checkInterval = setInterval(() => {
      this.checkMemoryUsage();
      this.checkEventListeners();
    }, 30000); // Verifica a cada 30 segundos
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  checkMemoryUsage() {
    if (global.performance && global.performance.memory) {
      const used = global.performance.memory.usedJSHeapSize / 1048576;
      const total = global.performance.memory.totalJSHeapSize / 1048576;

      if (used > this.warningThreshold) {
        console.warn(`⚠️ Alto uso de memória: ${used.toFixed(2)}MB / ${total.toFixed(2)}MB`);
      }
    }
  }

  checkEventListeners() {
    const eventInfo = eventEmitter.getEventInfo();

    for (const [event, count] of Object.entries(eventInfo)) {
      if (count > 5) {
        console.warn(`⚠️ Muitos listeners para o evento '${event}': ${count}`);
      }
    }
  }

  getReport() {
    return {
      eventListeners: eventEmitter.getEventInfo(),
      memoryUsage: global.performance?.memory
        ? {
            used: (global.performance.memory.usedJSHeapSize / 1048576).toFixed(2) + 'MB',
            total: (global.performance.memory.totalJSHeapSize / 1048576).toFixed(2) + 'MB'
          }
        : 'Não disponível'
    };
  }
}

export default new MemoryMonitor();
