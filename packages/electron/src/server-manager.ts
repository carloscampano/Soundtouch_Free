import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as net from 'net';
import { app } from 'electron';

let serverProcess: ChildProcess | null = null;
let serverPort: number = 3001;

const isDev = !app.isPackaged;

function getServerPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'web', 'server.js');
  } else {
    return path.join(process.resourcesPath, 'server', 'server.js');
  }
}

function getDataPath(): string {
  if (isDev) {
    return path.join(__dirname, '..', '..', 'web', 'data');
  } else {
    // In production, use app's user data directory for persistence
    return path.join(app.getPath('userData'), 'data');
  }
}

// Simple port availability check
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  for (let port = startPort; port < startPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  return startPort; // Fallback to original port
}

export async function startServer(): Promise<void> {
  // Find an available port
  serverPort = await findAvailablePort(3001);

  const serverPath = getServerPath();
  const dataPath = getDataPath();

  console.log(`Starting server on port ${serverPort}`);
  console.log(`Server path: ${serverPath}`);
  console.log(`Data path: ${dataPath}`);

  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        PORT: String(serverPort),
        DATA_DIR: dataPath,
        ELECTRON_RUN: 'true',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    serverProcess.stdout?.on('data', (data) => {
      console.log(`[Server] ${data.toString().trim()}`);
      // Resolve when server is ready
      if (data.toString().includes('SoundTouch Proxy Server running')) {
        resolve();
      }
    });

    serverProcess.stderr?.on('data', (data) => {
      console.error(`[Server Error] ${data.toString().trim()}`);
    });

    serverProcess.on('error', (error) => {
      console.error('Failed to start server:', error);
      reject(error);
    });

    serverProcess.on('exit', (code) => {
      console.log(`Server exited with code ${code}`);
      serverProcess = null;
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      if (serverProcess) {
        resolve(); // Assume it started anyway
      }
    }, 5000);
  });
}

export function stopServer(): void {
  if (serverProcess) {
    console.log('Stopping server...');
    serverProcess.kill();
    serverProcess = null;
  }
}

export function getServerPort(): number {
  return serverPort;
}
