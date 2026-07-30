const db = require('./connection');

// Crear paciente
// En el backend (pacientes.model.js)
async function crearPaciente(data) {
  try {
    // 🔹 USAR LA EDAD QUE VIENE DEL FRONTEND (si existe)
    // Si no viene edad, calcular desde fecha_nacimiento (por compatibilidad)
    let edad = data.edad || null;
    
    if (data.fecha_nacimiento && !data.edad) {
      edad = calcularEdadDesdeFecha(data.fecha_nacimiento);
    }
    
    const result = await db.query(
      `
      INSERT INTO pacientes
      (nombre, documento, fecha_nacimiento, edad, telefono, email)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        data.nombre,
        data.documento,
        data.fecha_nacimiento || null,  // Permitir NULL
        edad,
        data.telefono,
        data.email
      ]
    );

    return result.rows[0];

  } catch (error) {
    if (error.code === '23505') {
      throw new Error('El paciente ya existe (documento duplicado)');
    }
    throw error;
  }
}
// Función auxiliar para calcular edad (en el backend)
function calcularEdadDesdeFecha(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  
  const hoy = new Date();
  const fechaNac = new Date(fechaNacimiento);
  
  if (isNaN(fechaNac.getTime())) return null;
  
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const mes = hoy.getMonth() - fechaNac.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
    edad--;
  }
  
  return edad;
}

// Obtener todos los pacientes
async function obtenerPacientes() {
  try {
    const result = await db.query(
      `SELECT * FROM pacientes ORDER BY nombre ASC`
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// Actualizar paciente
// Actualizar paciente
async function actualizarPaciente(id, data) {
  try {
    // 🔹 USAR LA EDAD QUE VIENE DEL FRONTEND (si existe)
    let edad = data.edad || null;
    
    // Si no viene edad pero viene fecha_nacimiento, calcular automáticamente
    if (data.fecha_nacimiento && !data.edad) {
      edad = calcularEdadDesdeFecha(data.fecha_nacimiento);
    }
    
    const result = await db.query(
      `
      UPDATE pacientes 
      SET nombre = $1, 
          documento = $2, 
          fecha_nacimiento = $3, 
          edad = $4,
          telefono = $5, 
          email = $6
      WHERE id = $7
      RETURNING id
      `,
      [
        data.nombre,
        data.documento,
        data.fecha_nacimiento || null,
        edad,
        data.telefono,
        data.email,
        id
      ]
    );
    return { updated: result.rowCount > 0, id: result.rows[0]?.id };
  } catch (error) {
    console.error('Error actualizando paciente:', error);
    throw error;
  }
}
// Eliminar paciente (y sus citas relacionadas por CASCADE)
async function eliminarPaciente(id) {
  try {
    const result = await db.query('DELETE FROM pacientes WHERE id = $1 RETURNING id', [id]);
    return { deleted: result.rowCount > 0 };
  } catch (error) {
    throw error;
  }
}

// Obtener paciente por ID
async function obtenerPacientePorId(id) {
  try {
    const result = await db.query('SELECT * FROM pacientes WHERE id = $1', [id]);
    return result.rows[0] || null;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  crearPaciente,
  obtenerPacientes,
  actualizarPaciente,
  eliminarPaciente,
  obtenerPacientePorId
};