// Types
export * from './types/index.js';

// API Client
export { SoundTouchClient, type ClientOptions } from './api/client.js';

// WebSocket Client
export {
  SoundTouchWebSocket,
  createWebSocket,
  type WebSocketClientOptions,
  type WebSocketEventHandler,
  type ConnectionHandler,
  type ErrorHandler,
} from './api/websocket.js';

// Discovery (browser-compatible version)
export {
  scanNetwork,
  scanIPs,
  type DiscoveryOptions,
} from './discovery/browser.js';

// XML utilities (for advanced usage)
export { parseXml, buildXml } from './utils/xml-parser.js';
