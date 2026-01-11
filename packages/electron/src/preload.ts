import { contextBridge } from 'electron';

// Get server port from URL query params
const urlParams = new URLSearchParams(window.location.search);
const serverPort = urlParams.get('serverPort') || '3001';

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  serverPort: serverPort,
  getApiBaseUrl: () => `http://localhost:${serverPort}`,
  isElectron: true,
  platform: process.platform,
});
