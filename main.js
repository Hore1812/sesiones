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
    dbPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'bdsesiones.db');
  } else if (app.isPackaged) {
      dbPath = path.join(path.dirname(app.getPath('exe')), 'bdsesiones.db');
  } else {
    // Apuntando a la base de datos de "sesiones/bd/bdsesiones.db"
    // Asegurando que el directorio exista si es entorno dev.
    const devDbDir = path.join(__dirname, 'sesiones', 'bd');
    if (!fs.existsSync(devDbDir)) {
      fs.mkdirSync(devDbDir, { recursive: true });
    }
    dbPath = path.join(devDbDir, 'bdsesiones.db');
  }

  console.log('Database path:', dbPath);

  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      // Inicializar la tabla si no existe (para portabilidad/nuevos setups)
      db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        clave TEXT NOT NULL,
        rol TEXT CHECK(rol IN ('Admin', 'Lector', 'Editor')) DEFAULT 'Lector',
        rutaimg TEXT,
        activo INTEGER DEFAULT 1,
        registrado DATETIME DEFAULT CURRENT_TIMESTAMP,
        modificado DATETIME DEFAULT CURRENT_TIMESTAMP
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

// IPC handlers para el CRUD de Usuarios
ipcMain.handle('get-usuarios', async () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM usuarios ORDER BY id DESC', [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
});

ipcMain.handle('create-usuario', async (event, usuario, clave, rol, rutaimg, activo) => {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO usuarios (usuario, clave, rol, rutaimg, activo) VALUES (?, ?, ?, ?, ?)`;
    db.run(query, [usuario, clave, rol, rutaimg, activo], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ id: this.lastID, usuario, clave, rol, rutaimg, activo });
    });
  });
});

ipcMain.handle('update-usuario', async (event, id, usuario, clave, rol, rutaimg, activo) => {
  return new Promise((resolve, reject) => {
    const query = `UPDATE usuarios SET usuario = ?, clave = ?, rol = ?, rutaimg = ?, activo = ?, modificado = CURRENT_TIMESTAMP WHERE id = ?`;
    db.run(query, [usuario, clave, rol, rutaimg, activo, id], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ id, usuario, clave, rol, rutaimg, activo });
    });
  });
});

ipcMain.handle('delete-usuario', async (event, id) => {
  return new Promise((resolve, reject) => {
    const query = `DELETE FROM usuarios WHERE id = ?`;
    db.run(query, [id], function(err) {
      if (err) {
        return reject(err);
      }
      resolve({ deleted: this.changes > 0 });
    });
  });
});
