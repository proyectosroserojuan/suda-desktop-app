// ================================================================
// examenes_unificados.js - VERSIÓN SIMPLIFICADA (SOLO UNA TABLA)
// ================================================================

const pool = require('./connection');
const cloudinaryService = require('../services/cloudinaryService');

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
        grafica_tonal_base64,   // llega igual que siempre desde el frontend
        grafica_logo_base64,    // llega igual que siempre desde el frontend
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

    // 1️⃣ SUBIR IMÁGENES A CLOUDINARY (fuera de la transacción de BD,
    //    para no dejar el pool bloqueado esperando la red)
    let graficaTonal = { url: null, public_id: null };
    let graficaLogo = { url: null, public_id: null };

    try {
        const [resTonal, resLogo] = await Promise.all([
            grafica_tonal_base64
                ? cloudinaryService.subirImagenBase64(
                    grafica_tonal_base64,
                    'suda/examenes',
                    `cita_${cita_id}_tonal`
                  )
                : Promise.resolve(null),
            grafica_logo_base64
                ? cloudinaryService.subirImagenBase64(
                    grafica_logo_base64,
                    'suda/examenes',
                    `cita_${cita_id}_logo`
                  )
                : Promise.resolve(null)
        ]);

        if (resTonal) graficaTonal = resTonal;
        if (resLogo) graficaLogo = resLogo;

    } catch (error) {
        // ⚠️ IMPORTANTE: si Cloudinary falla, NO abortamos el guardado clínico.
        // El examen se guarda igual (sin imagen) y queda registrado en el log.
        console.error('⚠️ Error subiendo a Cloudinary, se guarda el examen sin imagen:', error);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `INSERT INTO examenes_audiologicos
             (tipo_examen, paciente_id, cita_id, entidad_id,
              diagnostico_od, diagnostico_oi, observaciones,
              grafica_tonal_url, grafica_tonal_public_id,
              grafica_logo_url, grafica_logo_public_id,
              otoscopia,
              valores_od, valores_oi,
              diagnostico,
              urv_od, urv_oi, upalabra_od, upalabra_oi,
              udisc_od, udisc_oi, pmax_od, pmax_oi,
              pta_via_aerea_od, pta_via_osea_od,
              pta_via_aerea_oi, pta_via_osea_oi,
              fecha_registro)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                     $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, CURRENT_TIMESTAMP)
             RETURNING id`,
            [
                tipo_examen, paciente_id, cita_id, entidad_id,
                diagnostico_od, diagnostico_oi, observaciones,
                graficaTonal.url, graficaTonal.public_id,
                graficaLogo.url, graficaLogo.public_id,
                otoscopia,
                valores_od ? JSON.stringify(valores_od) : null,
                valores_oi ? JSON.stringify(valores_oi) : null,
                diagnostico,
                urv_od, urv_oi, upalabra_od, upalabra_oi,
                udisc_od, udisc_oi, pmax_od, pmax_oi,
                pta_via_aerea_od || null,
                pta_via_osea_od || null,
                pta_via_aerea_oi || null,
                pta_via_osea_oi || null
            ]
        );

        if (cita_id) {
            await client.query(
                `UPDATE citas SET estado = 'atendida' WHERE id = $1`,
                [cita_id]
            );
            console.log(`✅ Cita ${cita_id} actualizada a estado "atendida"`);
        }

        await client.query('COMMIT');
        return { id: result.rows[0].id, ok: true };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error guardando examen:', error);
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

async function eliminarExamenPorCitaId(citaId) {
    try {
        const result = await pool.query(
            'DELETE FROM examenes_audiologicos WHERE cita_id = $1 RETURNING id',
            [citaId]
        );
        return { deleted: result.rowCount > 0 };
    } catch (error) {
        throw error;
    }
}

// En db/examenes_unificados.js

async function obtenerExamenPorCitaId(citaId) {
    const result = await pool.query(`
        SELECT 
            e.*,
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
    
    // ✅ LOG PARA VERIFICAR QUÉ CAMPOS TRAE
    if (result.rows.length > 0) {
        console.log('📊 Examen recuperado, campos:', Object.keys(result.rows[0]));
        console.log('📊 tiene grafica_tonal_base64:', !!result.rows[0].grafica_tonal_base64);
        console.log('📊 longitud grafica_tonal_base64:', result.rows[0].grafica_tonal_base64?.length || 0);
    }
    
    return result.rows[0] || null;
}

/**
 * OBTENER TODOS LOS EXÁMENES DE UNA CITA
 */
async function obtenerExamenesPorCitaId(citaId) {
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
    `, [citaId]);
    
    return result.rows;
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

/**
 * OBTENER EXAMEN POR CITA Y TIPO
 */
async function obtenerExamenesPorCitaYtipo(citaId, tipoExamen) {
    console.log(`\n📊 Buscando: cita_id=${citaId}, tipo=${tipoExamen}`);
    
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
    
    return result.rows[0] || null;
}

/**
 * OBTENER EXÁMENES CON DETALLES DE CITA
 */
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

// REEMPLAZA la función existeExamenPorCitaId por esta:

async function existeExamenPorCitaId(citaId) {
    console.log(`🔍 existeExamenPorCitaId - Cita ID: ${citaId}`);
    
    try {
        const result = await pool.query(`
            SELECT id, tipo_examen 
            FROM examenes_audiologicos 
            WHERE cita_id = $1
            LIMIT 1
        `, [citaId]);
        
        if (result.rows.length > 0) {
            console.log(`   ✅ Encontrado en examenes_audiologicos: ${result.rows[0].tipo_examen}`);
            return result.rows[0];
        }
        
        console.log(`   ❌ No se encontró examen`);
        return null;
        
    } catch (error) {
        console.error('❌ Error en existeExamenPorCitaId:', error);
        throw error;
    }
}

/**
 * OBTENER EXÁMENES POR MÚLTIPLES CITAS
 */
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
    obtenerExamenesPorCitaId,        // NUEVO: todos los exámenes de una cita
    obtenerExamenesPorCitaYtipo,
    obtenerExamenesConDetallesCita,
    existeExamenPorCitaId,
    obtenerExamenesPorCitas,
    eliminarExamenPorCitaId
};