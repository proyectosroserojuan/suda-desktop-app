const db = require('./connection');

async function crearCita(data) {
    try {
        const result = await db.query(
            `
            INSERT INTO citas
            (paciente_id, entidad_id, fecha_cita, hora_cita, motivo, tipo_atencion_id, estado, prioridad)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id
            `,
            [
                data.paciente_id,
                data.entidad_id || null,
                data.fecha_cita,
                data.hora_cita,
                data.motivo,
                data.tipo_atencion_id || null,  // ← CAMBIADO
                data.estado || 'pendiente',
                data.prioridad || false
            ]
        );
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

// Obtener citas pendientes
async function obtenerCitasPendientes() {
  try {
    const result = await db.query(
      `
      SELECT 
        c.*, 
        p.nombre AS paciente_nombre,
        p.documento,
        p.telefono,
        p.email,
        p.fecha_nacimiento,
        e.nombre AS entidad_nombre
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN entidades e ON c.entidad_id = e.id
      WHERE c.estado = 'pendiente'
      ORDER BY c.prioridad DESC, c.fecha_cita ASC, c.hora_cita ASC
      `
    );

    return result.rows;

  } catch (error) {
    throw error;
  }
}

async function obtenerCitaPorId(id) {
    try {
        const result = await db.query(
            `
            SELECT 
                c.*, 
                p.nombre AS paciente_nombre,
                p.documento,
                p.telefono,
                p.email,
                p.fecha_nacimiento,
                p.direccion,
                e.nombre AS entidad_nombre,
                t.id AS tipo_atencion_id,
                t.nombre AS tipo_atencion_nombre,
                t.requiere_audiometria,
                t.requiere_logoaudiometria,
                t.panel_html
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
            WHERE c.id = $1
            `,
            [id]
        );
        return result.rows[0] || null;
    } catch (error) {
        throw error;
    }
}

// Actualizar estado de cita
async function actualizarEstadoCita(id, estado) {
  try {
    const result = await db.query(
      `
      UPDATE citas
      SET estado = $1
      WHERE id = $2
      RETURNING id
      `,
      [estado, id]
    );

    return {
      updated: result.rowCount
    };

  } catch (error) {
    throw error;
  }
}

// Obtener citas por paciente
async function obtenerCitasPorPaciente(pacienteId) {
  try {
    const result = await db.query(
      `
      SELECT 
        c.id,
        c.paciente_id,
        c.entidad_id,
        c.fecha_cita,
        c.hora_cita,
        c.motivo,
        c.estado,
        c.prioridad,
        c.created_at,
        e.nombre AS entidad_nombre
      FROM citas c
      LEFT JOIN entidades e ON c.entidad_id = e.id
      WHERE c.paciente_id = $1
      ORDER BY c.fecha_cita DESC, c.hora_cita DESC
      `,
      [pacienteId]
    );

    return result.rows;

  } catch (error) {
    throw error;
  }
}

// Obtener todas las citas
async function obtenerTodasLasCitas() {
    try {
        const result = await db.query(
            `
            SELECT 
                c.*, 
                p.nombre AS paciente_nombre,
                p.documento,
                p.telefono,
                p.email,
                e.nombre AS entidad_nombre,
                t.id AS tipo_atencion_id,
                t.nombre AS tipo_atencion_nombre,
                t.requiere_audiometria,
                t.requiere_logoaudiometria,
                t.panel_html
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC
            `
        );
        return result.rows;
    } catch (error) {
        throw error;
    }
}

async function actualizarCitaCompleta(id, data) {
    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (data.fecha_cita !== undefined) {
            updates.push(`fecha_cita = $${paramIndex++}`);
            values.push(data.fecha_cita);
        }
        if (data.hora_cita !== undefined) {
            updates.push(`hora_cita = $${paramIndex++}`);
            values.push(data.hora_cita);
        }
        if (data.motivo !== undefined) {
            updates.push(`motivo = $${paramIndex++}`);
            values.push(data.motivo);
        }
        if (data.tipo_atencion_id !== undefined) {  // ← CAMBIADO
            updates.push(`tipo_atencion_id = $${paramIndex++}`);
            values.push(data.tipo_atencion_id);
        }
        if (data.estado !== undefined) {
            updates.push(`estado = $${paramIndex++}`);
            values.push(data.estado);
        }
        if (data.prioridad !== undefined) {
            updates.push(`prioridad = $${paramIndex++}`);
            values.push(data.prioridad);
        }
        if (data.entidad_id !== undefined) {
            updates.push(`entidad_id = $${paramIndex++}`);
            values.push(data.entidad_id);
        }
        if (data.paciente_id !== undefined) {
            updates.push(`paciente_id = $${paramIndex++}`);
            values.push(data.paciente_id);
        }

        if (updates.length === 0) {
            return { updated: false };
        }

        values.push(id);
        const query = `UPDATE citas SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id`;

        const result = await db.query(query, values);
        return { updated: result.rowCount > 0, id: result.rows[0]?.id };
    } catch (error) {
        throw error;
    }
}

// ELIMINAR cita (borrado físico)
async function eliminarCita(id) {
    try {
        const result = await db.query('DELETE FROM citas WHERE id = $1 RETURNING id', [id]);
        return { deleted: result.rowCount > 0 };
    } catch (error) {
        throw error;
    }
}


/*
async function obtenerCitasConEstadoExamen() {
    const result = await db.query(`
        SELECT 
            c.*,
            p.nombre as paciente_nombre,
            p.documento as paciente_documento,
            p.telefono as paciente_telefono,
            p.email as paciente_email,
            p.fecha_nacimiento as paciente_fecha_nacimiento,
            ent.nombre as entidad_nombre,
            CASE 
                WHEN e.id IS NOT NULL THEN true 
                ELSE false 
            END as tiene_examen,
            e.id as examen_id,
            e.tipo_examen as examen_tipo,
            e.fecha_registro as examen_fecha
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        LEFT JOIN entidades ent ON c.entidad_id = ent.id
        LEFT JOIN examenes_audiologicos e ON c.id = e.cita_id
        ORDER BY c.fecha_cita DESC, c.hora_cita DESC
    `);
    
    return result.rows;
}

*/

// ============================================
// OBTENER CITAS CON ESTADO DE EXAMEN (VERIFICA TODAS LAS TABLAS)
// ============================================





async function obtenerCitasConEstadoExamen() {
    console.log('\n🔍 [citas.js] obtenerCitasConEstadoExamen - Iniciando...');

    try {
        const citasResult = await db.query(`
            SELECT 
                c.id,
                c.paciente_id,
                c.fecha_cita,
                c.hora_cita,
                c.motivo,
                c.estado,
                c.prioridad,
                c.tipo_atencion_id,
                t.nombre AS tipo_atencion_nombre,
                t.requiere_audiometria,
                t.requiere_logoaudiometria,
                t.panel_html,
                p.nombre as paciente_nombre,
                p.documento as paciente_documento,
                p.telefono as paciente_telefono,
                p.email as paciente_email,
                p.fecha_nacimiento as paciente_fecha_nacimiento,
                e.nombre as entidad_nombre,
                e.id as entidad_id
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC
        `);

        const citas = citasResult.rows;
        console.log(`📊 Total citas encontradas: ${citas.length}`);

        for (let cita of citas) {
            let tieneExamen = false;

            const unifiedResult = await db.query(
                `SELECT id FROM examenes_audiologicos WHERE cita_id = $1`,
                [cita.id]
            );
            if (unifiedResult.rows.length > 0) {
                tieneExamen = true;
            }

            if (!tieneExamen) {
                const audioResult = await db.query(
                    `SELECT id FROM audiometrias WHERE cita_id = $1 LIMIT 1`,
                    [cita.id]
                );
                if (audioResult.rows.length > 0) {
                    tieneExamen = true;
                }
            }

            if (!tieneExamen) {
                const logoResult = await db.query(
                    `SELECT id FROM logoaudiometrias WHERE cita_id = $1 LIMIT 1`,
                    [cita.id]
                );
                if (logoResult.rows.length > 0) {
                    tieneExamen = true;
                }
            }

            cita.tiene_examen = tieneExamen;
        }

        console.log(`✅ Finalizado. ${citas.filter(c => c.tiene_examen).length} citas con examen`);
        return citas;

    } catch (error) {
        console.error('❌ Error en obtenerCitasConEstadoExamen:', error);
        throw error;
    }
}


/*
async function obtenerCitaConExamen(citaId) {
    console.log('🔍 Buscando cita con exámenes para ID:', citaId);
    
    // Primero obtener los datos de la cita y paciente
    const resultCita = await db.query(`
        SELECT 
            c.*,
            p.nombre as paciente_nombre,
            p.documento as paciente_documento,
            p.telefono as paciente_telefono,
            p.email as paciente_email,
            p.fecha_nacimiento as paciente_fecha_nacimiento,
            ent.nombre as entidad_nombre
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        LEFT JOIN entidades ent ON c.entidad_id = ent.id
        WHERE c.id = $1
    `, [citaId]);
    
    const cita = resultCita.rows[0] || null;
    
    if (!cita) {
        return null;
    }
    
    // Obtener TODOS los exámenes asociados a la cita
    const resultExamenes = await db.query(`
        SELECT 
            id,
            tipo_examen,
            diagnostico_od,
            diagnostico_oi,
            observaciones,
            otoscopia,
            grafica_base64,
            valores_od,
            valores_oi,
            diagnostico,
            urv_od,
            urv_oi,
            upalabra_od,
            upalabra_oi,
            udisc_od,
            udisc_oi,
            pmax_od,
            pmax_oi,
            pta_via_aerea_od,
            pta_via_osea_od,
            pta_via_aerea_oi,
            pta_via_osea_oi,
            fecha_registro
        FROM examenes_audiologicos
        WHERE cita_id = $1
        ORDER BY tipo_examen, fecha_registro DESC
    `, [citaId]);
    
    // Agrupar exámenes por tipo
    const examenes = {
        audiometria: null,
        logoaudiometria: null
    };
    
    for (const examen of resultExamenes.rows) {
        if (examen.tipo_examen === 'audiometria' && !examenes.audiometria) {
            examenes.audiometria = examen;
        } else if (examen.tipo_examen === 'logoaudiometria' && !examenes.logoaudiometria) {
            examenes.logoaudiometria = examen;
        }
    }
    // Devolver la cita con todos los exámenes
    return {
        ...cita,
        examenes: examenes,
        // Mantener compatibilidad con código existente
        examen_data: examenes.audiometria || examenes.logoaudiometria || null
    };
}
*/

async function obtenerCitaConExamen(citaId) {
    console.log(`\n🔍 [citas.js] obtenerCitaConExamen - Cita ID: ${citaId}`);

    try {
        // 1. Obtener datos de la cita
        const citaResult = await db.query(`
            SELECT 
                c.*,
                p.nombre as paciente_nombre,
                p.documento as paciente_documento,
                p.telefono as paciente_telefono,
                p.email as paciente_email,
                p.fecha_nacimiento as paciente_fecha_nacimiento,
                e.nombre as entidad_nombre,
                t.id AS tipo_atencion_id,
                t.nombre AS tipo_atencion_nombre,
                t.requiere_audiometria,
                t.requiere_logoaudiometria,
                t.panel_html
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
            WHERE c.id = $1
        `, [citaId]);

        if (citaResult.rows.length === 0) {
            console.log(`❌ Cita ${citaId} no encontrada`);
            return null;
        }

        const cita = citaResult.rows[0];
        console.log(`✅ Cita encontrada: ${cita.paciente_nombre}`);

        // 2. BUSCAR TODOS LOS EXÁMENES
        const examenes = {
            audiometria: null,
            logoaudiometria: null
        };

        // 🔥 PASO 1: Buscar en examenes_audiologicos
        const unifiedResult = await db.query(`
            SELECT * FROM examenes_audiologicos 
            WHERE cita_id = $1 
            ORDER BY fecha_registro DESC
        `, [citaId]);

        console.log(`📊 Encontrados ${unifiedResult.rows.length} exámenes en examenes_audiologicos`);



        for (const examen of unifiedResult.rows) {
    // ✅ Detectar por presencia de datos reales, NO por el nombre de tipo_examen
    const tieneAudiometria =
        examen.pta_via_aerea_od !== null || examen.pta_via_aerea_oi !== null ||
        examen.pta_via_osea_od  !== null || examen.pta_via_osea_oi  !== null ||
        examen.diagnostico_od   !== null || examen.diagnostico_oi   !== null;

    const tieneLogoaudiometria =
        examen.urv_od      !== null || examen.urv_oi      !== null ||
        examen.upalabra_od !== null || examen.upalabra_oi !== null ||
        examen.udisc_od    !== null || examen.udisc_oi    !== null ||
        examen.pmax_od     !== null || examen.pmax_oi     !== null ||
        examen.diagnostico !== null;

    if (tieneAudiometria && !examenes.audiometria) {
        examenes.audiometria = examen;
        console.log(`   ✅ Audiometría encontrada (por datos) en registro ${examen.id}`);
    }
    if (tieneLogoaudiometria && !examenes.logoaudiometria) {
        examenes.logoaudiometria = examen;
        console.log(`   ✅ Logoaudiometría encontrada (por datos) en registro ${examen.id}`);
    }
}

        // 🔥 PASO 2: Si no se encontró Audiometría, buscar en audiometrias
        if (!examenes.audiometria) {
            const audioResult = await db.query(`
                SELECT * FROM audiometrias 
                WHERE cita_id = $1 
                ORDER BY fecha_registro DESC 
                LIMIT 1
            `, [citaId]);
            
            if (audioResult.rows.length > 0) {
                examenes.audiometria = audioResult.rows[0];
                console.log(`   ✅ Audiometría encontrada en tabla audiometrias (ID: ${examenes.audiometria.id})`);
            }
        }

        // 🔥 PASO 3: Si no se encontró Logoaudiometría, buscar en logoaudiometrias
        if (!examenes.logoaudiometria) {
            const logoResult = await db.query(`
                SELECT * FROM logoaudiometrias 
                WHERE cita_id = $1 
                ORDER BY fecha_registro DESC 
                LIMIT 1
            `, [citaId]);
            
            if (logoResult.rows.length > 0) {
                examenes.logoaudiometria = logoResult.rows[0];
                console.log(`   ✅ Logoaudiometría encontrada en tabla logoaudiometrias (ID: ${examenes.logoaudiometria.id})`);
            }
        }

        // 3. Asignar exámenes a la cita
        cita.examenes = examenes;
        cita.tiene_examen = !!(examenes.audiometria || examenes.logoaudiometria);

        console.log(`📊 Resumen FINAL: Audiometría=${!!examenes.audiometria}, Logoaudiometría=${!!examenes.logoaudiometria}`);
        console.log(`✅ [citas.js] Finalizado.`);
        
        return cita;

    } catch (error) {
        console.error('❌ Error en obtenerCitaConExamen:', error);
        throw error;
    }
}
// Exportar las nuevas funciones
module.exports = {
  crearCita,
  obtenerCitasPendientes,
  obtenerCitaPorId,
  actualizarEstadoCita,
  obtenerCitasPorPaciente,
  obtenerTodasLasCitas,
  actualizarCitaCompleta,  // ← NUEVA
  eliminarCita,
  obtenerCitasConEstadoExamen,  // NUEVO
  obtenerCitaConExamen        // NUEVO        // ← NUEVA

};