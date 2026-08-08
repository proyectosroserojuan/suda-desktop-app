const pool = require('./connection');

/**
 * GUARDAR EXAMEN UNIFICADO (Audiometría o Logoaudiometría)
 */
async function guardarExamen(data) {
    const { 
        tipo_examen,
        paciente_id,
        cita_id,
        entidad_id,
        diagnostico_od,
        diagnostico_oi,
        observaciones,
        grafica_base64,
        otoscopia,
        valores_od,
        valores_oi,
        pta_via_aerea_od,
        pta_via_osea_od,
        pta_via_aerea_oi,
        pta_via_osea_oi,
        diagnostico,
        urv_od, urv_oi,
        upalabra_od, upalabra_oi,
        udisc_od, udisc_oi,
        pmax_od, pmax_oi
    } = data;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const result = await client.query(
            `INSERT INTO examenes_audiologicos 
             (tipo_examen, paciente_id, cita_id, entidad_id,
              diagnostico_od, diagnostico_oi, observaciones, grafica_base64,
              otoscopia,
              valores_od, valores_oi,
              diagnostico,
              urv_od, urv_oi, upalabra_od, upalabra_oi, udisc_od, udisc_oi, pmax_od, pmax_oi,
              pta_via_aerea_od, pta_via_osea_od, pta_via_aerea_oi, pta_via_osea_oi,
              fecha_registro)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, CURRENT_TIMESTAMP)
             RETURNING id`,
            [
                tipo_examen, paciente_id, cita_id, entidad_id,
                diagnostico_od, diagnostico_oi, observaciones, grafica_base64, otoscopia,
                valores_od ? JSON.stringify(valores_od) : null,
                valores_oi ? JSON.stringify(valores_oi) : null,
                diagnostico,
                urv_od, urv_oi, upalabra_od, upalabra_oi, udisc_od, udisc_oi, pmax_od, pmax_oi,
                pta_via_aerea_od || null,
                pta_via_osea_od || null,
                pta_via_aerea_oi || null,
                pta_via_osea_oi || null
            ]
        );
        
        if (cita_id) {
            await client.query(`UPDATE citas SET estado = 'atendida' WHERE id = $1`, [cita_id]);
            console.log(`✅ Cita ${cita_id} actualizada a estado "atendida"`);
        }
        
        await client.query('COMMIT');
        return { id: result.rows[0].id, ok: true };
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error guardando examen:', error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * OBTENER TODOS LOS EXÁMENES
 */
async function obtenerExamenes() {
    const result = await pool.query(`
        SELECT e.*, 
               p.nombre as paciente_nombre, 
               p.documento as paciente_documento,
               c.fecha_cita, 
               c.hora_cita,
               ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        ORDER BY e.fecha_registro DESC
    `);
    return result.rows;
}


/**
 * OBTENER EXAMEN POR ID DE CITA
 */
async function obtenerExamenPorCitaId(citaId) {
    const result = await pool.query(`
        SELECT e.*, 
               p.nombre as paciente_nombre, 
               p.documento as paciente_documento,
               c.fecha_cita, 
               c.hora_cita,
               ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        WHERE e.cita_id = $1
        ORDER BY e.fecha_registro DESC
        LIMIT 1
    `, [citaId]);
    
    return result.rows[0] || null;
}


/**
 * OBTENER EXAMEN POR ID
 */
async function obtenerExamenPorId(id) {
    const result = await pool.query(`
        SELECT e.*, 
               p.nombre as paciente_nombre, 
               p.documento as paciente_documento,
               p.telefono, p.email, p.fecha_nacimiento,
               c.fecha_cita, c.hora_cita, c.motivo,
               ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        WHERE e.id = $1
    `, [id]);
    return result.rows[0];
}

/**
 * OBTENER EXÁMENES POR TIPO
 */
async function obtenerExamenesPorTipo(tipo_examen) {
    const result = await pool.query(`
        SELECT e.*, 
               p.nombre as paciente_nombre, 
               p.documento as paciente_documento,
               c.fecha_cita, 
               c.hora_cita,
               ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        WHERE e.tipo_examen = $1
        ORDER BY e.fecha_registro DESC
    `, [tipo_examen]);
    return result.rows;
}

async function obtenerExamenesPorCitaYtipo(citaId, tipoExamen) {
    console.log(`\n📊 obtenerExamenesPorCitaYtipo - Buscando: cita_id=${citaId}, tipo=${tipoExamen}`);
    
    const result = await pool.query(`
        SELECT e.*, 
               p.nombre as paciente_nombre, 
               p.documento as paciente_documento,
               c.fecha_cita, 
               c.hora_cita,
               ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        WHERE e.cita_id = $1 AND e.tipo_examen = $2
        ORDER BY e.fecha_registro DESC
        LIMIT 1
    `, [citaId, tipoExamen]);
    
    console.log(`   - Resultados encontrados: ${result.rows.length}`);
    if (result.rows.length > 0) {
        console.log(`   - ID del examen: ${result.rows[0].id}`);
        console.log(`   - tipo_examen: ${result.rows[0].tipo_examen}`);
    }
    
    return result.rows[0] || null;
}

async function obtenerExamenesConDetallesCita() {
    const result = await pool.query(`
        SELECT 
            e.*,
            p.nombre as paciente_nombre,
            p.documento as paciente_documento,
            p.telefono as paciente_telefono,
            c.fecha_cita,
            c.hora_cita,
            c.motivo as cita_motivo,
            c.estado as cita_estado,
            ent.nombre as entidad_nombre
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        LEFT JOIN entidades ent ON e.entidad_id = ent.id
        ORDER BY e.fecha_registro DESC
    `);
    return result.rows;
}

/**
 * VERIFICAR SI UNA CITA TIENE EXAMEN ASOCIADO

async function existeExamenPorCitaId(citaId) {
    const result = await pool.query(`
        SELECT id, tipo_examen 
        FROM examenes_audiologicos 
        WHERE cita_id = $1
        LIMIT 1
    `, [citaId]);
    
    return result.rows[0] || null;
}
     */

/**
 * OBTENER EXÁMENES AGRUPADOS POR CITA
 */

/**
 * VERIFICAR SI UNA CITA TIENE EXAMEN ASOCIADO (TODAS LAS TABLAS)
 */
async function existeExamenPorCitaId(citaId) {
    console.log(`🔍 existeExamenPorCitaId - Cita ID: ${citaId}`);
    
    try {
        // 1. Verificar en tabla unificada
        let result = await pool.query(`
            SELECT id, tipo_examen 
            FROM examenes_audiologicos 
            WHERE cita_id = $1
            LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            console.log(`   ✅ Encontrado en examenes_audiologicos: ${result.rows[0].tipo_examen}`);
            return result.rows[0];
        }
        
        // 2. Verificar en audiometrias
        result = await pool.query(`
            SELECT id, 'audiometria' as tipo_examen
            FROM audiometrias 
            WHERE cita_id = $1
            LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            console.log(`   ✅ Encontrado en audiometrias`);
            return result.rows[0];
        }
        
        // 3. Verificar en logoaudiometrias
        result = await pool.query(`
            SELECT id, 'logoaudiometria' as tipo_examen
            FROM logoaudiometrias 
            WHERE cita_id = $1
            LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            console.log(`   ✅ Encontrado en logoaudiometrias`);
            return result.rows[0];
        }
        
        console.log(`   ❌ No se encontró examen en ninguna tabla`);
        return null;
        
    } catch (error) {
        console.error('❌ Error en existeExamenPorCitaId:', error);
        throw error;
    }
}


async function obtenerExamenesPorCitas(citaIds) {
    if (!citaIds || citaIds.length === 0) {
        return [];
    }
    
    const placeholders = citaIds.map((_, i) => `$${i + 1}`).join(',');
    
    const result = await pool.query(`
        SELECT 
            e.*,
            p.nombre as paciente_nombre,
            c.fecha_cita,
            c.hora_cita
        FROM examenes_audiologicos e
        JOIN pacientes p ON e.paciente_id = p.id
        JOIN citas c ON e.cita_id = c.id
        WHERE e.cita_id IN (${placeholders})
        ORDER BY e.fecha_registro DESC
    `, citaIds);
    
    return result.rows;
}

module.exports = { 
    guardarExamen, 
    obtenerExamenes, 
    obtenerExamenPorId,
    obtenerExamenesPorTipo,
    obtenerExamenPorCitaId,
    obtenerExamenesPorCitaYtipo,
        obtenerExamenesConDetallesCita,  // NUEVO
    existeExamenPorCitaId,            // NUEVO
    obtenerExamenesPorCitas           // NUEVO
};