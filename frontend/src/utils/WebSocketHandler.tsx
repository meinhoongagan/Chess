// src/utils/WebSocketHandler.js
import { useEffect } from 'react';

class WebSocketEventEmitter {
    private listeners: { [key: string]: Function[] } = {};
    
    constructor() {
      this.listeners = {};
    }
  
    on(event: string, callback: Function) {
      if (!this.listeners[event]) {
        this.listeners[event] = [];
      }
      this.listeners[event].push(callback);
      return () => this.off(event, callback);
    }
  
    off(event: string, callback: Function) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  
    emit(event: string, data: any) {
      if (!this.listeners[event]) return;
      this.listeners[event].forEach(callback => callback(data));
    }
  }
  
  // Singleton instance
  const eventEmitter = new WebSocketEventEmitter();
  
  export const setupWebSocketHandler = (socket: WebSocket) => {
    if (!socket) return null;
  
    console.log("🔌 Setting up centralized WebSocket handler");
  
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📩 Received WebSocket message:", data.event, data);
        
        // Emit the specific event
        eventEmitter.emit(data.event, data);
        
        // Also emit a general message event
        eventEmitter.emit('message', data);
      } catch (error) {
        console.error("Error processing WebSocket message:", error);
      }
    };
  
    // Clean up any existing handler and set the new one
    socket.onmessage = handleMessage;
  
    return () => {
      socket.onmessage = null;
    };
  };
  
  export const useWebSocketEvent = (event: string, callback: (data: any) => void) => {
    useEffect(() => {
      const cleanup = eventEmitter.on(event, callback);
      return cleanup;
    }, [event, callback]);
  };
  
  export default eventEmitter;