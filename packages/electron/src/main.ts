import { app, BrowserWindow, shell, screen } from 'electron';
import * as path from 'path';
import { startServer, stopServer, getServerPort } from './server-manager';

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;
const APP_VERSION = '2.1.1';

// Set About panel info
app.setAboutPanelOptions({
  applicationName: 'SoundTouch Controller',
  applicationVersion: APP_VERSION,
  version: `Electron ${process.versions.electron}`,
  copyright: '© 2024 Carlos Campano',
  credits: 'Control your Bose SoundTouch devices',
});

// Handle uncaught errors to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
});

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

  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
  const windowWidth = 1200;
  const windowHeight = 800;

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    minWidth: 900,
    minHeight: 600,
    x: Math.floor((screenWidth - windowWidth) / 2),
    y: Math.floor((screenHeight - windowHeight) / 2),
    show: true,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  console.log(`Window created at position: ${mainWindow.getPosition()}, size: ${mainWindow.getSize()}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Window ready to show');
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
      app.dock?.show();
    }
  });

  // Force show after content loads
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('Content loaded, ensuring window is visible');
    if (mainWindow) {
      // Force window to be visible on all workspaces temporarily
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
      // Then reset to normal
      setTimeout(() => {
        mainWindow?.setVisibleOnAllWorkspaces(false);
      }, 100);
    }
  });

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Render process gone:', details);
  });


  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`);
  });

  // Load the frontend
  if (isDev) {
    // In development, load from Vite dev server
    mainWindow.loadURL(`http://localhost:3000?serverPort=${serverPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    const appPath = getResourcePath('app/index.html');
    console.log('Loading app from:', appPath);
    mainWindow.loadFile(appPath, {
      query: { serverPort: String(serverPort) }
    }).catch(err => console.error('Load error:', err));
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
app.whenReady().then(async () => {
  // Force app to be active/focused on macOS
  if (process.platform === 'darwin') {
    app.dock?.bounce('critical');
    app.focus({ steal: true });
  }
  await createWindow();

  // Extra focus attempts after window is created
  setTimeout(() => {
    if (mainWindow) {
      app.focus({ steal: true });
      mainWindow.show();
      mainWindow.focus();
      mainWindow.moveTop();
    }
  }, 500);
}).catch((error) => {
  console.error('Error creating window:', error);
});

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow().catch((error) => {
      console.error('Error creating window on activate:', error);
    });
  }
});

app.on('before-quit', () => {
  stopServer();
});
