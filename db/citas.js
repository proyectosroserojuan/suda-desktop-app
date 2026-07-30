const db = require('./connection');

// Crear cita
async function crearCita(data) {
  try {
    const result = await db.query(
      `
      INSERT INTO citas
      (paciente_id, entidad_id, fecha_cita, hora_cita, motivo, estado, prioridad)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        data.paciente_id,
        data.entidad_id || null,
        data.fecha_cita,
        data.hora_cita,
        data.motivo,
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

// Obtener cita por ID
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
        e.nombre AS entidad_nombre
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN entidades e ON c.entidad_id = e.id
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
        e.nombre AS entidad_nombre
      FROM citas c
      JOIN pacientes p ON c.paciente_id = p.id
      LEFT JOIN entidades e ON c.entidad_id = e.id
      ORDER BY c.fecha_cita DESC, c.hora_cita DESC
      `
    );

    return result.rows;

  } catch (error) {
    throw error;
  }
}

// Actualizar cita completa (para editar y postergar)
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
    obtenerCitaConExamen           // NUEVO        // ← NUEVA
};