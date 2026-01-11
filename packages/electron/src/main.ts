import { app, BrowserWindow, shell } from 'electron';
import * as path from 'path';
import { startServer, stopServer, getServerPort } from './server-manager';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;

function getResourcePath(relativePath: string): string {
  if (isDev) {
    // In development, resources are in the project structure
    return path.join(__dirname, '..', '..', 'web', relativePath);
  } else {
    // In production, resources are in the app's resources folder
    return path.join(process.resourcesPath, relativePath);
  }
}

async function createWindow() {
  // Start the Express server first
  await startServer();
  const serverPort = getServerPort();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Load the frontend
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL(`http://localhost:3000?serverPort=${serverPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const appPath = getResourcePath('app/index.html');
    mainWindow.loadFile(appPath, {
      query: { serverPort: String(serverPort) }
    });
  }

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopServer();
});
