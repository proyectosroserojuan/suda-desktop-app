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

// REEMPLAZA la función obtenerCitasConEstadoExamen por esta:

async function obtenerCitasConEstadoExamen() {
    console.log('\n🔍 [citas.js] obtenerCitasConEstadoExamen - Iniciando...');

    try {
        // ✅ UNA SOLA CONSULTA CON LEFT JOIN A examenes_audiologicos
        const result = await db.query(`
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
                e.id as entidad_id,
                CASE WHEN ex.id IS NOT NULL THEN true ELSE false END as tiene_examen
            FROM citas c
            JOIN pacientes p ON c.paciente_id = p.id
            LEFT JOIN entidades e ON c.entidad_id = e.id
            LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
            LEFT JOIN examenes_audiologicos ex ON c.id = ex.cita_id
            ORDER BY c.fecha_cita DESC, c.hora_cita DESC
        `);

        console.log(`✅ Finalizado. ${result.rows.filter(c => c.tiene_examen).length} citas con examen`);
        return result.rows;

    } catch (error) {
        console.error('❌ Error en obtenerCitasConEstadoExamen:', error);
        throw error;
    }
}


// REEMPLAZA la función obtenerCitaConExamen por esta:

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

        // 2. BUSCAR EN LA TABLA UNIFICADA (SOLO UNA)
        const examenesUnificados = require('./examenes_unificados');
        const examen = await examenesUnificados.obtenerExamenPorCitaId(citaId);

        // 3. Asignar exámenes a la cita
        cita.examenes = {
            audiometria: null,
            logoaudiometria: null
        };

   if (examen) {
    // ✅ Usar los flags de tipos_atencion (fuente de verdad clínica),
    //    no el texto libre de tipo_examen
    if (cita.requiere_audiometria) {
        cita.examenes.audiometria = examen;
    }
    if (cita.requiere_logoaudiometria) {
        cita.examenes.logoaudiometria = examen;
    }
    cita.tiene_examen = true;
} else {
            cita.tiene_examen = false;
        }

        console.log(`📊 Resumen FINAL: Audiometría=${!!cita.examenes.audiometria}, Logoaudiometría=${!!cita.examenes.logoaudiometria}`);
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