const pool = require('./connection');

async function guardarLogoaudiometria(data) {
    const { 
        paciente_id,
        cita_id,
        diagnostico,
        diagnostico_od,
        diagnostico_oi,
        otoscopia,  // ← AGREGAR ESTO
        valores_od,
        valores_oi,
        grafica_logo_base64
    } = data;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Insertar logoaudiometría
const result = await client.query(
    `INSERT INTO logoaudiometrias 
     (paciente_id, cita_id, diagnostico, diagnostico_od, diagnostico_oi, otoscopia,
      valores_od, valores_oi, grafica_logo_base64, fecha_registro)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP)
     RETURNING id`,
    [paciente_id, cita_id, diagnostico, diagnostico_od, diagnostico_oi, otoscopia,
     valores_od, valores_oi, grafica_logo_base64]
);
        
        // ACTUALIZAR EL ESTADO DE LA CITA A "ATENDIDA"
        if (cita_id) {
            await client.query(
                `UPDATE citas SET estado = 'atendida' WHERE id = $1`,
                [cita_id]
            );
            console.log(`✅ Cita ${cita_id} actualizada a estado "atendida"`);
        }
        
        await client.query('COMMIT');
        return { id: result.rows[0].id };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error guardando logoaudiometría:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerLogoaudiometrias() {
    const result = await pool.query(`
        SELECT l.*, p.nombre as paciente_nombre, p.documento as paciente_documento,
               c.fecha_cita, c.hora_cita
        FROM logoaudiometrias l
        JOIN pacientes p ON l.paciente_id = p.id
        JOIN citas c ON l.cita_id = c.id
        ORDER BY l.fecha_registro DESC
    `);
    return result.rows;
}

async function obtenerLogoaudiometriaPorId(id) {
    const result = await pool.query(`
        SELECT l.*, p.nombre as paciente_nombre, p.documento as paciente_documento,
               p.telefono, p.email, p.fecha_nacimiento,
               c.fecha_cita, c.hora_cita, c.motivo
        FROM logoaudiometrias l
        JOIN pacientes p ON l.paciente_id = p.id
        JOIN citas c ON l.cita_id = c.id
        WHERE l.id = $1
    `, [id]);
    return result.rows[0];
}

async function obtenerLogoaudiometriaPorCitaId(citaId) {
    console.log('=== obtenerLogoaudiometriaPorCitaId ===');
    console.log('Buscando logoaudiometría para cita_id:', citaId);
    
    try {
        const result = await pool.query(`
            SELECT * FROM logoaudiometrias WHERE cita_id = $1 ORDER BY fecha_registro DESC LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            const examen = result.rows[0];
            console.log('✅ Logoaudiometría encontrada');
            console.log('Datos:', {
                urv_od: examen.valores_od?.urv,
                upalabra_od: examen.valores_od?.upalabra,
                urv_oi: examen.valores_oi?.urv,
                tiene_grafica: !!examen.grafica_logo_base64
            });
            return examen;
        }
        
        console.log('❌ No se encontró logoaudiometría para cita:', citaId);
        return null;
    } catch (error) {
        console.error('Error en obtenerLogoaudiometriaPorCitaId:', error);
        throw error;
    }
}

module.exports = { 
    guardarLogoaudiometria, 
    obtenerLogoaudiometrias, 
    obtenerLogoaudiometriaPorId,
     obtenerLogoaudiometriaPorCitaId 
};