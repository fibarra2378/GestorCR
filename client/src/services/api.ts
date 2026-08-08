/// <reference types="vite/client" />
import axios from 'axios';

const env = (import.meta as any).env || {};
export const API_BASE = env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gestorcr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export class WSSubscription {
  private static socket: WebSocket | null = null;
  private static listeners: Array<(data: any) => void> = [];

  static connect() {
    if (this.socket) return;

    let wsUrl: string;
    if (env.VITE_WS_URL) {
      wsUrl = env.VITE_WS_URL;
    } else {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }



    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onerror = () => {
        // Silently handle websocket errors on static environments
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.listeners.forEach((listener) => listener(data));
        } catch (e) {
          // ignore
        }
      };

      this.socket.onclose = () => {
        this.socket = null;
      };
    } catch (e) {
      // ignore
    }

  }

  static subscribe(callback: (data: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}
