
/*
const db = require('./connection');

async function guardarAudiometria(data) {
    const { 
        paciente_id,
        cita_id,
        entidad_id,
        diagnostico_od,
        diagnostico_oi,
        observaciones,
        otoscopia,  // ← AGREGAR ESTO
        valores_od,
        valores_oi,
        grafica_tonal_base64,
        pta_via_aerea_od,
        pta_via_osea_od,
        pta_via_aerea_oi,
        pta_via_osea_oi
    } = data;
    
    const pool = require('./connection');
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const query = `
            INSERT INTO audiometrias 
            (paciente_id, cita_id, entidad_id, diagnostico_od, diagnostico_oi, observaciones, otoscopia,
             valores_od, valores_oi, grafica_tonal_base64,  pta_via_aerea_od,  pta_via_osea_od, pta_via_aerea_oi, pta_via_osea_oi, fecha_registro)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
            RETURNING id
        `;
        
        const values = [
            paciente_id,
            cita_id,
            entidad_id,
            diagnostico_od,
            diagnostico_oi,
            observaciones,
            otoscopia,  // ← AGREGAR ESTO
            JSON.stringify(valores_od),
            JSON.stringify(valores_oi),
            grafica_tonal_base64,
            pta_via_aerea_od,
            pta_via_osea_od,
            pta_via_aerea_oi,
            pta_via_osea_oi
        ];
        
        const result = await client.query(query, values);
        
        // 🔥 ACTUALIZAR EL ESTADO DE LA CITA A "ATENDIDA" (igual que en logoaudiometria)
        if (cita_id) {
            await client.query(
                `UPDATE citas SET estado = 'atendida' WHERE id = $1`,
                [cita_id]
            );
            console.log(`✅ Cita ${cita_id} actualizada a estado "atendida" (Audiometría)`);
        }
        
        await client.query('COMMIT');
        return { id: result.rows[0].id };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error guardando audiometría:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function obtenerAudiometriaPorCitaId(citaId) {
    console.log('=== obtenerAudiometriaPorCitaId ===');
    console.log('Buscando audiometría para cita_id:', citaId);
    
    try {
        const pool = require('./connection');
        const result = await pool.query(`
            SELECT * FROM audiometrias WHERE cita_id = $1 ORDER BY fecha_registro DESC LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            const examen = result.rows[0];
            console.log('✅ Audiometría encontrada');
            console.log('Datos:', {
                id: examen.id,
                tiene_grafica: !!examen.grafica_tonal_base64,
                valores_od: examen.valores_od,
                valores_oi: examen.valores_oi
            });
            return examen;
        }
        
        console.log('❌ No se encontró audiometría para cita:', citaId);
        return null;
    } catch (error) {
        console.error('Error en obtenerAudiometriaPorCitaId:', error);
        throw error;
    }
}
async function obtenerAudiometrias() {
    const query = `
        SELECT a.*, p.nombre as paciente_nombre, p.documento as paciente_documento,
               c.fecha_cita, c.hora_cita, e.nombre as entidad_nombre
        FROM audiometrias a
        JOIN pacientes p ON a.paciente_id = p.id
        JOIN citas c ON a.cita_id = c.id
        LEFT JOIN entidades e ON a.entidad_id = e.id
        ORDER BY a.fecha_registro DESC
    `;
    
    try {
        const result = await db.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error obteniendo audiometrías:', error);
        throw error;
    }
}

async function obtenerAudiometriaPorId(id) {
    const query = `
        SELECT a.*, p.nombre as paciente_nombre, p.documento as paciente_documento,
               p.telefono, p.email, p.fecha_nacimiento,
               c.fecha_cita, c.hora_cita, c.motivo, e.nombre as entidad_nombre
        FROM audiometrias a
        JOIN pacientes p ON a.paciente_id = p.id
        JOIN citas c ON a.cita_id = c.id
        LEFT JOIN entidades e ON a.entidad_id = e.id
        WHERE a.id = $1
    `;
    
    try {
        const result = await db.query(query, [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error obteniendo audiometría:', error);
        throw error;
    }
}

module.exports = { guardarAudiometria, obtenerAudiometrias, obtenerAudiometriaPorId, obtenerAudiometriaPorCitaId   };
*/