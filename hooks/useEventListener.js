// hooks/useEventListener.js
import { useEffect, useRef } from 'react';
import eventEmitter, { EVENTS } from '../services/EventEmitter';

export const useEventListener = (event, handler) => {
  const savedHandler = useRef();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (...args) => savedHandler.current(...args);
    const unsubscribe = eventEmitter.on(event, eventListener);

    return unsubscribe;
  }, [event]);
};

// Hook para emitir eventos
export const useEventEmitter = () => {
  const emit = (event, ...args) => {
    eventEmitter.emit(event, ...args);
  };

  return { emit, EVENTS };
};

// Hook para múltiplos eventos
export const useMultipleEventListeners = eventHandlers => {
  useEffect(() => {
    const unsubscribes = [];

    for (const [event, handler] of Object.entries(eventHandlers)) {
      const unsubscribe = eventEmitter.on(event, handler);
      unsubscribes.push(unsubscribe);
    }

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [eventHandlers]);
};
