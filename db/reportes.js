const db = require('./connection');

// Obtener todas las citas con datos de paciente y entidad
async function obtenerCitasConDetalles() {
    try {
        const result = await db.query(`
            SELECT 
                c.*,
                p.nombre AS paciente_nombre,
                p.documento,
                p.telefono,
                p.email,
                e.nombre AS entidad_nombre,
                e.id AS entidad_id
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC
        `);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

// Obtener citas filtradas por mes y año
async function obtenerCitasPorMes(mes, año) {
    try {
        const result = await db.query(`
            SELECT 
                c.*,
                p.nombre AS paciente_nombre,
                p.documento,
                p.telefono,
                p.email,
                e.nombre AS entidad_nombre,
                e.id AS entidad_id
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            WHERE EXTRACT(MONTH FROM c.fecha_cita) = $1 
            AND EXTRACT(YEAR FROM c.fecha_cita) = $2
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC
        `, [mes, año]);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

// Obtener estadísticas de citas por entidad en un mes específico
async function obtenerEstadisticasPorEntidad(mes, año) {
    try {
        const result = await db.query(`
            SELECT 
                COALESCE(e.nombre, 'Sin entidad') AS entidad_nombre,
                COUNT(c.id) AS total_citas
            FROM citas c
            LEFT JOIN entidades e ON c.entidad_id = e.id
            WHERE EXTRACT(MONTH FROM c.fecha_cita) = $1 
            AND EXTRACT(YEAR FROM c.fecha_cita) = $2
            GROUP BY e.nombre
            ORDER BY total_citas DESC
        `, [mes, año]);
        return result.rows;
    } catch (error) {
        throw error;
    }
}

module.exports = {
    obtenerCitasConDetalles,
    obtenerCitasPorMes,
    obtenerEstadisticasPorEntidad
};