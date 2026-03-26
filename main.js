const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

let mainWindow;
let db;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile('index.html');
}

// Configuración de la base de datos para app portable
function initDB() {
  // Si estamos en un ejecutable portable (Electron Builder), usa esa ruta
  // Si no, usa el directorio de datos del usuario o el directorio actual
  let dbPath;
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    dbPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'database.sqlite');
  } else if (app.isPackaged) {
      dbPath = path.join(path.dirname(app.getPath('exe')), 'database.sqlite');
  } else {
    dbPath = path.join(__dirname, 'database.sqlite');
  }

  console.log('Database path:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      // Crear tabla de ejemplo
      db.run(`CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL
      )`);
    }
  });
}

app.whenReady().then(() => {
  initDB();
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error(err.message);
            }
            console.log('Closed the database connection.');
        });
    }
});

// IPC handler para obtener usuarios
ipcMain.handle('get-users', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM users', [], (err, rows) => {
      if (err) {
        reject(err);
      }
      resolve(rows);
    });
  });
});

// IPC handler para añadir un usuario
ipcMain.handle('add-user', async (event, name) => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (name) VALUES (?)', [name], function(err) {
      if (err) {
        reject(err);
      }
      resolve({ id: this.lastID, name: name });
    });
  });
});
