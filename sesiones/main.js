const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const bcrypt = require('bcryptjs');

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

// Funciones de utilidad para manejar las rutas y copiado de imágenes
function getImagesDir() {
  let baseDir;
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    baseDir = process.env.PORTABLE_EXECUTABLE_DIR;
  } else if (app.isPackaged) {
    baseDir = path.dirname(app.getPath('exe'));
  } else {
    baseDir = __dirname;
  }
  const imgDir = path.join(baseDir, 'sesiones', 'img', 'usuarios');
  
  // Asegurarse de que los directorios existan
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
  }
  return imgDir;
}

function saveProfileImage(sourcePath) {
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    return sourcePath; // Retornar lo mismo si está vacío o no existe
  }

  const imagesDir = getImagesDir();
  
  // Si la imagen ya está en el directorio de destino (ej. al editar sin cambiar imagen), no hacemos nada
  if (path.dirname(sourcePath) === imagesDir) {
    return sourcePath;
  }

  // Obtener solo el nombre del archivo con extensión
  const filename = path.basename(sourcePath);
  // Crear un nombre único para evitar sobrescrituras
  const uniqueFilename = `${Date.now()}_${filename}`;
  const destPath = path.join(imagesDir, uniqueFilename);

  try {
    // Solo copiar si el archivo origen y destino no son el mismo
    if (sourcePath !== destPath) {
        fs.copyFileSync(sourcePath, destPath);
    }
    return destPath;
  } catch (error) {
    console.error('Error al copiar imagen:', error);
    return sourcePath; // En caso de error, guardar la original
  }
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
    // Solo seleccionamos los campos necesarios, excluyendo la clave/hash por seguridad.
    db.all('SELECT id, usuario, rol, rutaimg, activo, registrado, modificado FROM usuarios ORDER BY id DESC', [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
});

ipcMain.handle('create-usuario', async (event, usuario, clave, rol, rutaimg, activo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashClave = await bcrypt.hash(clave, salt);
      // Copiar la imagen a nuestro directorio de destino antes de guardar la ruta
      const finalImagePath = saveProfileImage(rutaimg);

      const query = `INSERT INTO usuarios (usuario, clave, rol, rutaimg, activo) VALUES (?, ?, ?, ?, ?)`;
      db.run(query, [usuario, hashClave, rol, finalImagePath, activo], function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ id: this.lastID, usuario, rol, rutaimg: finalImagePath, activo });
      });
    } catch (error) {
        reject(error);
    }
  });
});

ipcMain.handle('update-usuario', async (event, id, usuario, clave, rol, rutaimg, activo) => {
  return new Promise(async (resolve, reject) => {
    try {
      let query;
      let params;

      // Verificamos si la ruta de la imagen ha cambiado (si es una nueva desde el diálogo, la copiamos)
      // Si el usuario edita y no cambia la imagen, `rutaimg` será la ruta que ya existe en nuestro directorio
      const finalImagePath = saveProfileImage(rutaimg);

      // Si se proporcionó una nueva clave, actualizarla
      if (clave) {
        const salt = await bcrypt.genSalt(10);
        const hashClave = await bcrypt.hash(clave, salt);
        query = `UPDATE usuarios SET usuario = ?, clave = ?, rol = ?, rutaimg = ?, activo = ?, modificado = CURRENT_TIMESTAMP WHERE id = ?`;
        params = [usuario, hashClave, rol, finalImagePath, activo, id];
      } else {
        // Si no, no modificar la clave existente
        query = `UPDATE usuarios SET usuario = ?, rol = ?, rutaimg = ?, activo = ?, modificado = CURRENT_TIMESTAMP WHERE id = ?`;
        params = [usuario, rol, finalImagePath, activo, id];
      }

      db.run(query, params, function(err) {
        if (err) {
          return reject(err);
        }
        resolve({ id, usuario, rol, rutaimg: finalImagePath, activo });
      });
    } catch (error) {
        reject(error);
    }
  });
});

ipcMain.handle('select-image', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Seleccionar Imagen de Perfil',
    properties: ['openFile'],
    filters: [
      { name: 'Imágenes', extensions: ['jpg', 'png', 'gif', 'jpeg', 'webp'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null; // El usuario canceló la selección
  } else {
    return result.filePaths[0]; // Devuelve la ruta absoluta del archivo
  }
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
