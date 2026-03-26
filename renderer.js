document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('user-table-body');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');
  const selectImageBtn = document.getElementById('select-image-btn');

  // Referencias a los campos del formulario
  const inputId = document.getElementById('user-id');
  const inputUsuario = document.getElementById('usuario');
  const inputClave = document.getElementById('clave');
  const selectRol = document.getElementById('rol');
  const inputRutaimg = document.getElementById('rutaimg');
  const selectActivo = document.getElementById('activo');
  const formTitle = document.getElementById('form-title');

  // Seleccionar Imagen
  selectImageBtn.addEventListener('click', async () => {
    const imagePath = await window.api.selectImage();
    if (imagePath) {
        inputRutaimg.value = imagePath;
    }
  });

  // Función para mostrar notificaciones (Toasts)
  function showNotification(message, type = 'success') {
      const toastContainer = document.getElementById('toast-container');
      const toast = document.createElement('div');

      toast.className = `toast ${type}`;
      toast.textContent = message;

      toastContainer.appendChild(toast);

      // Eliminar el toast del DOM después de que termine la animación (3 segundos)
      setTimeout(() => {
          toast.remove();
      }, 3000);
  }

  // Función para cargar usuarios
  async function loadUsers() {
      try {
          const usuarios = await window.api.getUsuarios();
          tableBody.innerHTML = ''; // Limpiar tabla

          usuarios.forEach(user => {
              const tr = document.createElement('tr');

              // ID
              const tdId = document.createElement('td');
              tdId.textContent = user.id;
              tr.appendChild(tdId);

              // Usuario
              const tdUsuario = document.createElement('td');
              tdUsuario.textContent = user.usuario;
              tr.appendChild(tdUsuario);

              // Rol
              const tdRol = document.createElement('td');
              tdRol.textContent = user.rol;
              tr.appendChild(tdRol);

              // Activo
              const tdActivo = document.createElement('td');
              const spanBadge = document.createElement('span');
              spanBadge.className = user.activo === 1 ? 'badge active' : 'badge inactive';
              spanBadge.textContent = user.activo === 1 ? 'Activo' : 'Inactivo';
              tdActivo.appendChild(spanBadge);
              tr.appendChild(tdActivo);

              // Ruta Img
              const tdRutaimg = document.createElement('td');
              if (user.rutaimg) {
                  const img = document.createElement('img');
                  img.src = `file://${user.rutaimg}`;
                  img.className = 'thumb';
                  tdRutaimg.appendChild(img);
              } else {
                  const noImg = document.createElement('div');
                  noImg.className = 'thumb';
                  noImg.textContent = 'N/A';
                  tdRutaimg.appendChild(noImg);
              }
              tr.appendChild(tdRutaimg);

              // Acciones
              const tdAcciones = document.createElement('td');
              tdAcciones.className = 'actions';

              const editBtn = document.createElement('button');
              editBtn.className = 'edit-btn';
              editBtn.textContent = 'Editar';
              editBtn.addEventListener('click', () => editUser(user));
              tdAcciones.appendChild(editBtn);

              const deleteBtn = document.createElement('button');
              deleteBtn.className = 'delete-btn';
              deleteBtn.textContent = 'Eliminar';
              deleteBtn.addEventListener('click', () => deleteUser(user.id));
              tdAcciones.appendChild(deleteBtn);

              tr.appendChild(tdAcciones);

              tableBody.appendChild(tr);
          });
      } catch (error) {
          console.error("Error cargando usuarios:", error);
      }
  }

  // Inicialmente cargar usuarios
  loadUsers();

  // Guardar usuario (Crear o Actualizar)
  saveBtn.addEventListener('click', async () => {
      const id = inputId.value;
      const usuario = inputUsuario.value.trim();
      const clave = inputClave.value.trim();
      const rol = selectRol.value;
      const rutaimg = inputRutaimg.value.trim();
      const activo = parseInt(selectActivo.value, 10);

      if (!usuario) {
          alert('El nombre de Usuario es obligatorio.');
          return;
      }

      if (!id && !clave) {
          alert('La contraseña es obligatoria al crear un usuario nuevo.');
          return;
      }

      try {
          if (id) {
              // Actualizar
              await window.api.updateUsuario(id, usuario, clave, rol, rutaimg, activo);
              showNotification(`Usuario "${usuario}" actualizado correctamente.`);
          } else {
              // Crear
              await window.api.createUsuario(usuario, clave, rol, rutaimg, activo);
              showNotification(`Usuario "${usuario}" creado con éxito.`);
          }

          resetForm();
          loadUsers();
      } catch (error) {
          console.error("Error al guardar usuario", error);
          showNotification('Error al guardar el usuario (Puede que el nombre ya exista).', 'error');
      }
  });

  // Preparar formulario para editar
  function editUser(user) {
      inputId.value = user.id;
      inputUsuario.value = user.usuario;
      inputClave.value = ''; // No mostrar ni sobreescribir la contraseña a menos que se escriba una nueva
      selectRol.value = user.rol;
      inputRutaimg.value = user.rutaimg || '';
      selectActivo.value = user.activo;

      formTitle.textContent = 'Editar Usuario';
      cancelBtn.style.display = 'inline-block';
  }

  // Eliminar usuario
  async function deleteUser(id) {
      if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
          try {
              await window.api.deleteUsuario(id);
              loadUsers();
              showNotification(`Usuario con ID ${id} eliminado.`, 'info');
          } catch (error) {
              console.error("Error al eliminar usuario", error);
              showNotification('Hubo un error al eliminar el usuario.', 'error');
          }
      }
  }

  // Limpiar formulario
  function resetForm() {
      inputId.value = '';
      inputUsuario.value = '';
      inputClave.value = '';
      selectRol.value = 'Lector';
      inputRutaimg.value = '';
      selectActivo.value = '1';

      formTitle.textContent = 'Añadir Nuevo Usuario';
      cancelBtn.style.display = 'none';
  }

  // Botón cancelar
  cancelBtn.addEventListener('click', resetForm);
});
