async function crear() {
  const username = document.getElementById('username').value;
  const nombre = document.getElementById('nombre').value;
  const password = document.getElementById('password').value;

  const res = await window.api.crearUsuario({
    username,
    nombre_completo: nombre,
    password
  });

  if (res.ok) {
    alert('Usuario creado correctamente');
  } else {
    alert(res.error);
  }
}