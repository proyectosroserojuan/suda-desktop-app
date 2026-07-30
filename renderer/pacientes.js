
/*
async function guardarPaciente(e) {
  e.preventDefault();

  const nombre = document.getElementById('nombre').value.trim();
  const documento = document.getElementById('documento').value.trim();
  const fecha = document.getElementById('fecha').value;
  const telefono = document.getElementById('telefono').value.trim();
  const email = document.getElementById('email').value.trim();

  // 🔹 Validación básica
  if (!nombre || !documento || !fecha) {
    alert('Completa los campos obligatorios');
    return;
  }

  const res = await window.api.crearPaciente({
    nombre,
    documento,
    fecha_nacimiento: fecha,
    telefono,
    email
  });

  if (res.ok) {
    alert('Paciente guardado correctamente');

    // 🔹 Limpiar formulario
    document.querySelector('.form').reset();

  } else {
    alert(res.error);
  }
}

/* Función para calcular la edad
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return '';
  
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  
  // Verificar si la fecha es válida
  if (isNaN(fechaNac.getTime())) return '';
  
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  
  // Si aún no ha cumplido años este año
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  return edad;
}
*/

/* Event listener para calcular edad automáticamente
document.getElementById('fechaNacimiento').addEventListener('change', function() {
  const fechaNacimiento = this.value;
  const edad = calcularEdad(fechaNacimiento);
  document.getElementById('edad').value = edad;
});


// También calcular al cargar una fecha en edición
document.getElementById('fechaNacimiento').addEventListener('input', function() {
  const fechaNacimiento = this.value;
  const edad = calcularEdad(fechaNacimiento);
  document.getElementById('edad').value = edad;
});

*/