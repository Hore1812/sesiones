const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getUsuarios: () => ipcRenderer.invoke('get-usuarios'),
  createUsuario: (usuario, clave, rol, rutaimg, activo) => ipcRenderer.invoke('create-usuario', usuario, clave, rol, rutaimg, activo),
  updateUsuario: (id, usuario, clave, rol, rutaimg, activo) => ipcRenderer.invoke('update-usuario', id, usuario, clave, rol, rutaimg, activo),
  deleteUsuario: (id) => ipcRenderer.invoke('delete-usuario', id),
  selectImage: () => ipcRenderer.invoke('select-image')
});
