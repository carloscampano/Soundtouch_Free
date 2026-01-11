import { type UpdateEvent, type UpdateType } from '../types/index.js';
import { parseXml, getAttribute } from '../utils/xml-parser.js';

const WEBSOCKET_PORT = 8080;
const WEBSOCKET_PROTOCOL = 'gabbo';

export type WebSocketEventHandler = (event: UpdateEvent) => void;
export type ConnectionHandler = () => void;
export type ErrorHandler = (error: Error) => void;

export interface WebSocketClientOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class SoundTouchWebSocket {
  private ws: WebSocket | null = null;
  private host: string;
  private options: Required<WebSocketClientOptions>;
  private reconnectAttempts = 0;
  private isManualClose = false;

  private eventHandlers: Map<UpdateType | '*', Set<WebSocketEventHandler>> = new Map();
  private connectHandlers: Set<ConnectionHandler> = new Set();
  private disconnectHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  constructor(host: string, options: WebSocketClientOptions = {}) {
    this.host = host;
    this.options = {
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isManualClose = false;

    try {
      const url = `ws://${this.host}:${WEBSOCKET_PORT}`;
      this.ws = new WebSocket(url, WEBSOCKET_PROTOCOL);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.connectHandlers.forEach((handler) => handler());
      };

      this.ws.onclose = () => {
        this.disconnectHandlers.forEach((handler) => handler());
        this.handleReconnect();
      };

      this.ws.onerror = (event) => {
        const error = new Error(`WebSocket error: ${event}`);
        this.errorHandlers.forEach((handler) => handler(error));
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      this.errorHandlers.forEach((handler) =>
        handler(error instanceof Error ? error : new Error(String(error)))
      );
      this.handleReconnect();
    }
  }

  disconnect(): void {
    this.isManualClose = true;
    this.ws?.close();
    this.ws = null;
  }

  private handleReconnect(): void {
    if (
      this.isManualClose ||
      !this.options.reconnect ||
      this.reconnectAttempts >= this.options.maxReconnectAttempts
    ) {
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      this.connect();
    }, this.options.reconnectInterval);
  }

  private handleMessage(data: string): void {
    try {
      const parsed = parseXml<{ updates: Record<string, unknown> }>(data);
      const updates = parsed.updates;

      if (!updates) {
        return;
      }

      const deviceID = getAttribute(updates, 'deviceID') ?? '';

      // Detect update type from the XML structure
      const updateTypes: UpdateType[] = [
        'volumeUpdated',
        'nowPlayingUpdated',
        'zoneUpdated',
        'presetsUpdated',
        'bassUpdated',
        'sourcesUpdated',
        'infoUpdated',
        'connectionStateUpdated',
        'nowSelectionUpdated',
        'recentsUpdated',
        'acctModeUpdated',
      ];

      for (const type of updateTypes) {
        if (type in updates) {
          const event: UpdateEvent = {
            deviceID,
            type,
            data: updates[type],
          };

          this.emitEvent(event);
        }
      }
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private emitEvent(event: UpdateEvent): void {
    // Emit to specific type handlers
    const typeHandlers = this.eventHandlers.get(event.type);
    if (typeHandlers) {
      typeHandlers.forEach((handler) => handler(event));
    }

    // Emit to wildcard handlers
    const wildcardHandlers = this.eventHandlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach((handler) => handler(event));
    }
  }

  // Event subscription methods
  on(type: UpdateType | '*', handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(type)) {
      this.eventHandlers.set(type, new Set());
    }
    this.eventHandlers.get(type)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.eventHandlers.get(type)?.delete(handler);
    };
  }

  off(type: UpdateType | '*', handler: WebSocketEventHandler): void {
    this.eventHandlers.get(type)?.delete(handler);
  }

  onConnect(handler: ConnectionHandler): () => void {
    this.connectHandlers.add(handler);
    return () => this.connectHandlers.delete(handler);
  }

  onDisconnect(handler: ConnectionHandler): () => void {
    this.disconnectHandlers.add(handler);
    return () => this.disconnectHandlers.delete(handler);
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  // Convenience methods for specific events
  onVolumeChange(handler: WebSocketEventHandler): () => void {
    return this.on('volumeUpdated', handler);
  }

  onNowPlayingChange(handler: WebSocketEventHandler): () => void {
    return this.on('nowPlayingUpdated', handler);
  }

  onZoneChange(handler: WebSocketEventHandler): () => void {
    return this.on('zoneUpdated', handler);
  }

  onPresetsChange(handler: WebSocketEventHandler): () => void {
    return this.on('presetsUpdated', handler);
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get readyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

export function createWebSocket(
  host: string,
  options?: WebSocketClientOptions
): SoundTouchWebSocket {
  return new SoundTouchWebSocket(host, options);
}
