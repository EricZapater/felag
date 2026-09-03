import { Message } from './types';

type MessageListener = (message: Message) => void;
type ConnectionStatusListener = (connected: boolean) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private url: string = 'ws://localhost:8080/api/v1/ws';
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectTimeout: any = null;
  private messageListeners: Set<MessageListener> = new Set();
  private statusListeners: Set<ConnectionStatusListener> = new Set();
  private isExplicitlyClosed: boolean = false;

  constructor() {
    // Default url can also be customized if needed
  }

  public connect(token: string, wsUrl?: string) {
    if (wsUrl) {
      this.url = wsUrl;
    }
    this.token = token;
    this.isExplicitlyClosed = false;

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const fullUrl = `${this.url}?token=${encodeURIComponent(token)}`;
      this.socket = new WebSocket(fullUrl);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.notifyStatus(true);
      };

      this.socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // Check if parsed payload is a Message directly or wrapped inside an event { type: 'new_message', data: ... }
          if (parsed && typeof parsed === 'object') {
            const messageData: Message = parsed.data || parsed.payload || parsed;
            if (messageData && messageData.id && messageData.conversation_id) {
              this.notifyMessage(messageData);
            }
          }
        } catch (e) {
          // Ignore unparseable frames (like ping/pong text)
        }
      };

      this.socket.onerror = (_error) => {
        // WebSocket error
      };

      this.socket.onclose = () => {
        this.notifyStatus(false);
        this.socket = null;
        if (!this.isExplicitlyClosed && this.token) {
          this.scheduleReconnect();
        }
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.token = null;
    this.notifyStatus(false);
  }

  public send(payload: any): boolean {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  public addMessageListener(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => {
      this.messageListeners.delete(listener);
    };
  }

  public addStatusListener(listener: ConnectionStatusListener): () => void {
    this.statusListeners.add(listener);
    listener(this.isConnected());
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  public isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  private notifyMessage(message: Message) {
    this.messageListeners.forEach((listener) => {
      try {
        listener(message);
      } catch (e) {
        console.warn('Error in message listener:', e);
      }
    });
  }

  private notifyStatus(connected: boolean) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(connected);
      } catch (e) {
        console.warn('Error in status listener:', e);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 15000);
    this.reconnectAttempts += 1;
    this.reconnectTimeout = setTimeout(() => {
      if (this.token && !this.isExplicitlyClosed) {
        this.connect(this.token, this.url);
      }
    }, delay);
  }
}

export const wsClient = new WebSocketClient();
