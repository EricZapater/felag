import { Message } from './types';

type MessageHandler = (message: Message) => void;
type StatusHandler = (connected: boolean) => void;

class ChatWebSocketClient {
  private socket: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectTimeout: any = null;
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private token: string | null = null;

  private getWsUrl(token: string): string {
    const customWsUrl = import.meta.env.VITE_WS_URL;
    if (customWsUrl) {
      return `${customWsUrl}?token=${encodeURIComponent(token)}`;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const wsProtocol = apiUrl.startsWith('https') ? 'wss:' : 'ws:';
    const host = apiUrl.replace(/^https?:\/\//, '');
    return `${wsProtocol}//${host}/api/v1/ws/chat?token=${encodeURIComponent(token)}`;
  }

  public connect(token?: string) {
    if (token) {
      this.token = token;
    } else if (!this.token) {
      this.token = localStorage.getItem('access_token');
    }

    if (!this.token) {
      return;
    }

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.shouldReconnect = true;
    const wsUrl = this.getWsUrl(this.token);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Standardize payload if message is wrapped or raw
          const message: Message = data.message || data;
          if (message && message.id && message.conversation_id) {
            this.notifyMessage(message);
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      this.socket.onclose = () => {
        this.notifyStatus(false);
        this.socket = null;
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = (error) => {
        console.warn('[WS] Error:', error);
        if (this.socket) {
          this.socket.close();
        }
      };
    } catch (err) {
      console.error('[WS] Connection failed:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout || !this.shouldReconnect) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.connect();
    }, delay);
  }

  public disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.notifyStatus(false);
  }

  public send(payload: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(typeof payload === 'string' ? payload : JSON.stringify(payload));
    }
  }

  public onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  public onStatusChange(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    handler(this.isConnected());
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  private notifyMessage(msg: Message) {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(msg);
      } catch (err) {
        console.error('[WS] Handler error:', err);
      }
    });
  }

  private notifyStatus(connected: boolean) {
    this.statusHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (err) {
        console.error('[WS] Status handler error:', err);
      }
    });
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}

export const chatWsClient = new ChatWebSocketClient();
