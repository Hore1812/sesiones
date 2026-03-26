document.addEventListener('DOMContentLoaded', async () => {
  const userList = document.getElementById('user-list');
  const addBtn = document.getElementById('add-user-btn');
  const nameInput = document.getElementById('new-user-name');

  // Función para cargar usuarios
  async function loadUsers() {
      try {
          const users = await window.api.getUsers();
          userList.innerHTML = ''; // Limpiar lista
          users.forEach(user => {
              const li = document.createElement('li');
              li.textContent = `${user.id}: ${user.name}`;
              userList.appendChild(li);
          });
      } catch (error) {
          console.error("Error cargando usuarios:", error);
      }
  }

  // Inicialmente cargar usuarios
  loadUsers();

  // Función para añadir usuario
  addBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (name) {
          try {
              await window.api.addUser(name);
              nameInput.value = '';
              loadUsers(); // Recargar después de añadir
          } catch (error) {
              console.error("Error al añadir usuario", error);
          }
      }
  });
});
