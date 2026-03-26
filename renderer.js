document.addEventListener('DOMContentLoaded', async () => {
  const tableBody = document.getElementById('user-table-body');
  const saveBtn = document.getElementById('save-btn');
  const cancelBtn = document.getElementById('cancel-btn');

  // Referencias a los campos del formulario
  const inputId = document.getElementById('user-id');
  const inputUsuario = document.getElementById('usuario');
  const inputClave = document.getElementById('clave');
  const selectRol = document.getElementById('rol');
  const inputRutaimg = document.getElementById('rutaimg');
  const selectActivo = document.getElementById('activo');
  const formTitle = document.getElementById('form-title');

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
              tdActivo.textContent = user.activo === 1 ? 'Sí' : 'No';
              tr.appendChild(tdActivo);

              // Ruta Img
              const tdRutaimg = document.createElement('td');
              tdRutaimg.textContent = user.rutaimg || '';
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

      if (!usuario || !clave) {
          alert('Usuario y Clave son obligatorios.');
          return;
      }

      try {
          if (id) {
              // Actualizar
              await window.api.updateUsuario(id, usuario, clave, rol, rutaimg, activo);
          } else {
              // Crear
              await window.api.createUsuario(usuario, clave, rol, rutaimg, activo);
          }

          resetForm();
          loadUsers();
      } catch (error) {
          console.error("Error al guardar usuario", error);
          alert('Hubo un error al guardar el usuario. (Posiblemente el usuario ya exista)');
      }
  });

  // Preparar formulario para editar
  function editUser(user) {
      inputId.value = user.id;
      inputUsuario.value = user.usuario;
      inputClave.value = user.clave;
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
          } catch (error) {
              console.error("Error al eliminar usuario", error);
              alert("Hubo un error al eliminar el usuario");
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
