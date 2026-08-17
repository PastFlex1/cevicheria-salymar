const { app, BrowserWindow, dialog } = require('electron');
const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

let expressProcess = null;
let javaProcess = null;
let mainWindow = null;

// Determine if we are in packaged production mode
const isPackaged = app.isPackaged;

// Find Java executable path
function findJava() {
  const candidates = [
    'C:\\Program Files\\Java\\jdk-23\\bin\\java.exe',
    'C:\\Program Files\\Java\\jdk-21\\bin\\java.exe',
    'C:\\Program Files\\Java\\jre-21\\bin\\java.exe',
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand)) {
      return cand;
    }
  }

  if (process.env.JAVA_HOME) {
    const javaHomeExe = path.join(process.env.JAVA_HOME, 'bin', 'java.exe');
    if (fs.existsSync(javaHomeExe)) {
      return javaHomeExe;
    }
  }

  return 'java'; // Fallback to PATH
}

// Check if a port is open
function checkPort(port, callback) {
  const socket = new net.Socket();
  socket.setTimeout(200);
  
  socket.once('connect', () => {
    socket.destroy();
    callback(true);
  });
  
  socket.once('timeout', () => {
    socket.destroy();
    callback(false);
  });
  
  socket.once('error', () => {
    socket.destroy();
    callback(false);
  });
  
  socket.connect({ port, host: '127.0.0.1' });
}

// Wait for a port to become available
function waitForPort(port, timeoutMs, callback) {
  const start = Date.now();
  const interval = setInterval(() => {
    checkPort(port, (open) => {
      if (open) {
        clearInterval(interval);
        callback(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        callback(false);
      }
    });
  }, 500);
}

// Start backend services
function startServices() {
  const userDataPath = app.getPath('userData');
  console.log(`[Electron] User Data Path: ${userDataPath}`);

  // 1. Start SQLite database backend (Express)
  // We locate server.js. In production it's bundled in app.asar.
  const serverPath = path.join(__dirname, 'server.js');
  
  console.log(`[Electron] Starting Express server at: ${serverPath}`);
  expressProcess = fork(serverPath, [], {
    env: {
      ...process.env,
      USER_DATA_PATH: userDataPath,
      PORT: '8081'
    },
    stdio: 'ignore',
    windowsHide: true
  });

  expressProcess.on('error', (err) => {
    console.error('[Electron] Express process error:', err);
  });

  // 2. Start SRI Invoicing Service (Java JAR)
  // In production, the JAR is in the resources folder (extraResources)
  const jarPath = isPackaged
    ? path.join(process.resourcesPath, 'SRI-1.0-SNAPSHOT.jar')
    : path.join(__dirname, 'SRI-1.0-SNAPSHOT.jar');

  const javaPath = findJava();

  if (fs.existsSync(jarPath)) {
    console.log(`[Electron] Starting SRI Service (Java) using: ${javaPath} -jar ${jarPath}`);
    javaProcess = spawn(javaPath, ['-jar', jarPath], {
      cwd: isPackaged ? process.resourcesPath : __dirname,
      stdio: 'ignore',
      shell: false,
      windowsHide: true
    });

    javaProcess.on('error', (err) => {
      console.error('[Electron] Failed to start Java process:', err);
      dialog.showErrorBox(
        'Error de Java',
        'No se pudo iniciar el servicio de facturación (Java).\n\n' +
        'Por favor, asegúrate de tener instalado Java 21 o superior en este computador.\n' +
        'Puedes descargarlo de: https://adoptium.net/\n\n' +
        'Detalle técnico: ' + err.message
      );
    });
  } else {
    console.error(`[Electron] SRI JAR not found at: ${jarPath}`);
    dialog.showErrorBox(
      'Error de inicio',
      `No se encontró el servicio de facturación SRI en:\n${jarPath}`
    );
  }
}

// Stop backend services
function stopServices() {
  console.log('[Electron] Stopping backend services...');
  if (expressProcess) {
    expressProcess.kill();
    expressProcess = null;
  }
  if (javaProcess) {
    // On Windows, spawned processes via shell need to be killed properly
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', javaProcess.pid, '/f', '/t']);
    } else {
      javaProcess.kill();
    }
    javaProcess = null;
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Cevicheria Salymar - Facturación',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Enable F12 and Ctrl+Shift+I for DevTools (in both dev and prod for troubleshooting)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Auto-open DevTools in development
  if (!isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  // Wait for Express server to be ready on port 8081
  waitForPort(8081, 15000, (success) => {
    if (success) {
      mainWindow.loadURL('http://localhost:8081');
    } else {
      dialog.showErrorBox(
        'Error de Servidor',
        'El servidor local (Express) no inició a tiempo en el puerto 8081.'
      );
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  startServices();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopServices();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  stopServices();
});
