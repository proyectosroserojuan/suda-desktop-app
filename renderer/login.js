async function login() {
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  // Validar que los campos no estén vacíos
  if (!username || !password) {
    alert('Por favor ingrese usuario y contraseña');
    return;
  }

  try {
    const res = await window.api.login({ username, password });

    if (res.ok) {
      // Mostrar mensaje de bienvenida
      alert('Bienvenido ' + res.user.nombre_completo);

      // ✅ REDIRIGIR AL DASHBOARD (correcto según tu estructura)
      window.location.href = 'dashboard.html';
      
    } else {
      alert(res.error || 'Error al iniciar sesión');
    }
  } catch (error) {
    console.error('Error en login:', error);
    alert('Error de conexión. Por favor intente nuevamente.');
  }
}

// También puedes permitir que al presionar Enter en los campos se ejecute el login
document.getElementById('username').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    login();
  }
});

document.getElementById('password').addEventListener('keypress', function(event) {
  if (event.key === 'Enter') {
    event.preventDefault();
    login();
  }
});