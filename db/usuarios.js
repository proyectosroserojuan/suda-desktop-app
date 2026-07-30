const db = require('./connection');

// Crear usuario
async function crearUsuario(data) {
  const { username, nombre_completo, password, rol = 'secretaria' } = data;

  try {
    const result = await db.query(
      `INSERT INTO usuarios 
      (username, nombre_completo, password, rol)
      VALUES ($1, $2, $3, $4)
      RETURNING id`,
      [username, nombre_completo, password, rol]
    );

    return result.rows[0];

  } catch (error) {
    if (error.code === '23505') {
      throw new Error('El usuario ya existe');
    }
    throw error;
  }
}

// Login usuario
async function loginUsuario(username, password) {
  try {
    const result = await db.query(
      `SELECT id, username, nombre_completo, rol FROM usuarios WHERE username = $1 AND password = $2`,
      [username, password]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];

  } catch (error) {
    throw error;
  }
}

// Obtener todos los usuarios
async function obtenerUsuarios() {
  try {
    const result = await db.query(
      `SELECT id, username, nombre_completo, rol, created_at FROM usuarios ORDER BY id`
    );
    return result.rows;
  } catch (error) {
    throw error;
  }
}

// Actualizar rol de usuario
async function actualizarRol(id, rol) {
  try {
    await db.query(
      `UPDATE usuarios SET rol = $1 WHERE id = $2`,
      [rol, id]
    );
    return { ok: true };
  } catch (error) {
    throw error;
  }
}

module.exports = {
  crearUsuario,
  loginUsuario,
  obtenerUsuarios,
  actualizarRol
};