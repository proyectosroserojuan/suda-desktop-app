const db = require('./connection');

// Obtener todas las entidades
async function obtenerEntidades() {
  const result = await db.query('SELECT * FROM entidades ORDER BY id');
  return result.rows;
}

// Obtener entidad por ID
async function obtenerEntidadPorId(id) {
  const result = await db.query('SELECT * FROM entidades WHERE id = $1', [id]);
  return result.rows[0];
}

// Obtener entidad por nombre
async function obtenerEntidadPorNombre(nombre) {
  const result = await db.query('SELECT * FROM entidades WHERE nombre = $1', [nombre]);
  return result.rows[0];
}

// Crear nueva entidad
async function crearEntidad(nombre) {
  const result = await db.query(
    'INSERT INTO entidades (nombre) VALUES ($1) RETURNING *',
    [nombre]
  );
  return result.rows[0];
}

// Obtener formato PDF de una entidad
async function obtenerFormatoPorEntidadId(entidadId) {
  const result = await db.query(
    `SELECT f.*, e.nombre as entidad_nombre 
     FROM formatos_pdf f 
     JOIN entidades e ON e.id = f.entidad_id 
     WHERE f.entidad_id = $1`,
    [entidadId]
  );
  return result.rows[0];
}

// Actualizar formato PDF
async function actualizarFormato(entidadId, tipo_formato, header_image, footer_image, configuracion) {
  const result = await db.query(
    `INSERT INTO formatos_pdf (entidad_id, tipo_formato, header_image, footer_image, configuracion, updated_at) 
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     ON CONFLICT (entidad_id) DO UPDATE SET 
       tipo_formato = $2,
       header_image = $3,
       footer_image = $4,
       configuracion = $5,
       updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [entidadId, tipo_formato, header_image, footer_image, configuracion || {}]
  );
  return result.rows[0];
}

module.exports = {
  obtenerEntidades,
  obtenerEntidadPorId,
  obtenerEntidadPorNombre,
  crearEntidad,
  obtenerFormatoPorEntidadId,
  actualizarFormato
};