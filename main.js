const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;
const configPath = path.join(app.getPath('userData'), 'config.json');

let config = {
  transparency: 1,
  opacity: 1,
};

// Cargar configuración desde el archivo
function loadConfig() {
  if (fs.existsSync(configPath)) {
    const data = fs.readFileSync(configPath);
    config = JSON.parse(data);
  }
}

// Guardar configuración en el archivo
function saveConfig() {
  fs.writeFileSync(configPath, JSON.stringify(config));
}

function createWindow() {
  loadConfig(); // Cargar configuración al iniciar

  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 300,
    minHeight: 200,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    },
    frame: true,
    backgroundColor: '#FFFFFF',
    hasShadow: true,
  });

  mainWindow.loadFile('renderer/index.html');

  // Aplicar configuración de transparencia y opacidad
  mainWindow.setOpacity(config.opacity);
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('update-transparency-opacity', {
      transparency: config.transparency,
      opacity: config.opacity,
    });
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('toggle-compact-mode', (event, { isCompact }) => {
  if (!mainWindow) return;

  mainWindow.setAlwaysOnTop(isCompact);
  mainWindow.setSize(isCompact ? 400 : 800, isCompact ? 500 : 600);
  mainWindow.setResizable(!isCompact);

  // Guardar configuración
  config.transparency = isCompact ? 0.15 : 1;
  config.opacity = isCompact ? 0.85 : 1;
  saveConfig(); // Guardar la configuración

  mainWindow.setOpacity(config.opacity);
  mainWindow.webContents.send('update-transparency-opacity', {
    transparency: config.transparency,
    opacity: config.opacity,
  });
});

// Inicializar la aplicación
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Nuevo manejador para habilitar temporalmente la interacción
ipcMain.on('temp-enable-interactions', () => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(false);
});

// Nuevo manejador para deshabilitar la interacción
ipcMain.on('temp-disable-interactions', () => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
});

// Nuevo manejador para actualizar la transparencia de la ventana
ipcMain.on('update-window-transparency', (event, transparency) => {
  if (!mainWindow) return;
  const opacity = 1 - transparency;
  mainWindow.setOpacity(opacity);
});

ipcMain.on('hide-app', (event) => {
  if (mainWindow) {
    mainWindow.minimize(); // Minimizar la ventana en lugar de ocultarla
  }
});

ipcMain.on('start-drag', () => {
  if (mainWindow) {
    mainWindow.startDrag();
  }
});
