import { app, BrowserWindow, shell, Menu, globalShortcut } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { startServer, stopServer, getServerPort } from './server-manager';

// Debug logging to file
const logFile = path.join(app.getPath('userData'), 'debug.log');
function debugLog(msg: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
}

let mainWindow: BrowserWindow | null = null;

const isDev = !app.isPackaged;
const APP_VERSION = '2.2.3';

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
  debugLog('createWindow: Starting server...');
  // Start the Express server first
  await startServer();
  debugLog('createWindow: Server started');
  const serverPort = getServerPort();
  debugLog(`createWindow: Server port = ${serverPort}`);

  debugLog('Creating BrowserWindow...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // Don't show until ready
    backgroundColor: '#1a1a1a',
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Center the window on screen
  mainWindow.center();
  debugLog(`Window created at position: ${mainWindow.getPosition()}, size: ${mainWindow.getSize()}`);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    debugLog('EVENT: ready-to-show');
    if (mainWindow) {
      debugLog('Calling mainWindow.show()');
      mainWindow.show();
      debugLog(`After show - visible: ${mainWindow.isVisible()}`);
      mainWindow.focus();
      app.dock?.show();
    }
  });

  // Force show after content loads
  mainWindow.webContents.once('did-finish-load', () => {
    debugLog('EVENT: did-finish-load');
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


// Force show helper with logging
function forceShowWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    debugLog(`forceShowWindow - visible=${mainWindow.isVisible()}, minimized=${mainWindow.isMinimized()}, focused=${mainWindow.isFocused()}`);

    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }

    app.focus({ steal: true });
    mainWindow.show();
    mainWindow.focus();
    mainWindow.moveTop();
    mainWindow.setAlwaysOnTop(true);

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.setAlwaysOnTop(false);
      }
    }, 200);
  }
}

// Request single instance lock
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is running, quitting');
  app.quit();
} else {
  // Handle second instance
  app.on('second-instance', () => {
    console.log('Second instance detected, showing window');
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      forceShowWindow();
    }
  });

  // App lifecycle
  app.whenReady().then(async () => {
    debugLog(`App ready, platform: ${process.platform}, isPackaged: ${app.isPackaged}`);

    // On macOS, ensure dock icon is visible and app is active
    if (process.platform === 'darwin') {
      debugLog('Showing dock...');
      app.dock?.show();
      debugLog('Bouncing dock...');
      app.dock?.bounce('critical');
    }

    debugLog('Waiting 200ms...');
    await new Promise(resolve => setTimeout(resolve, 200));

    debugLog('Calling app.focus...');
    app.focus({ steal: true });

    debugLog('Calling createWindow...');
    await createWindow();
    debugLog('createWindow completed');

    // Keep trying to show window for several seconds
    const intervals = [100, 300, 600, 1000, 1500, 2000, 3000, 5000];
    intervals.forEach(delay => {
      setTimeout(forceShowWindow, delay);
    });
  }).catch((error) => {
    debugLog(`ERROR in whenReady: ${error}`);
    console.error('Error creating window:', error);
  });
}

app.on('window-all-closed', () => {
  stopServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  console.log('Activate event triggered');
  if (mainWindow === null) {
    createWindow().catch((error) => {
      console.error('Error creating window on activate:', error);
    });
  } else {
    // Window exists but might be hidden - force show it
    console.log('Forcing window show from activate');
    forceShowWindow();
  }
});

// macOS dock menu and application menu
if (process.platform === 'darwin') {
  app.whenReady().then(() => {
    // Dock menu
    const dockMenu = Menu.buildFromTemplate([
      {
        label: 'Mostrar Ventana',
        click: () => {
          console.log('Dock menu: Show Window clicked');
          if (mainWindow) {
            forceShowWindow();
          } else {
            createWindow().catch(console.error);
          }
        }
      },
      {
        label: 'Nueva Ventana',
        click: () => {
          console.log('Dock menu: New Window clicked');
          if (mainWindow) {
            mainWindow.close();
          }
          createWindow().catch(console.error);
        }
      }
    ]);
    app.dock?.setMenu(dockMenu);

    // Application menu with Window menu
    const appMenu = Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Mostrar Ventana',
            accelerator: 'CmdOrCtrl+Shift+W',
            click: () => {
              if (mainWindow) {
                forceShowWindow();
              } else {
                createWindow().catch(console.error);
              }
            }
          },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      },
      {
        label: 'Window',
        submenu: [
          {
            label: 'Mostrar Ventana Principal',
            accelerator: 'CmdOrCtrl+1',
            click: () => {
              if (mainWindow) {
                forceShowWindow();
              } else {
                createWindow().catch(console.error);
              }
            }
          },
          { type: 'separator' },
          { role: 'minimize' },
          { role: 'zoom' },
          { type: 'separator' },
          { role: 'front' }
        ]
      }
    ]);
    Menu.setApplicationMenu(appMenu);

    // Global shortcut as backup
    globalShortcut.register('CmdOrCtrl+Shift+S', () => {
      console.log('Global shortcut triggered');
      if (mainWindow) {
        forceShowWindow();
      } else {
        createWindow().catch(console.error);
      }
    });
  });
}

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  stopServer();
});
