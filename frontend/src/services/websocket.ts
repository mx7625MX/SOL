/**
 * WebSocket 服务
 */

import { WebSocketMessage } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectTimeout: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url: string = `ws://${window.location.hostname}:3001/ws`) {
    this.url = url;
  }

  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('WebSocket 已连接');
        this.emit('connected', {});
        
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('收到消息:', message);
          this.emit(message.type, message.data);
        } catch (error) {
          console.error('解析 WebSocket 消息失败:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket 已断开');
        this.emit('disconnected', {});
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket 错误:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('WebSocket 连接失败:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket 未连接');
    }
  }

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(eventType: string, data: any): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectTimer = setTimeout(() => {
      console.log('尝试重新连接...');
      this.reconnectTimer = null;
      this.connect();
    }, this.reconnectTimeout);
  }
}

export const ws = new WebSocketService();
export default ws;
