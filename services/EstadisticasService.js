// ================================================================
// EstadisticasService.js - Reportes e informes de citas
// ================================================================

const db = require('../db/connection');

class EstadisticasService {

    /**
     * Resumen general de estados de citas en un mes/año
     * (pendiente, atendida, cancelada, etc.)
     */
    async obtenerResumenGeneral(mes, anio) {
        const result = await db.query(
            `SELECT estado, COUNT(*)::int AS cantidad
             FROM citas
             WHERE EXTRACT(MONTH FROM fecha_cita) = $1
               AND EXTRACT(YEAR FROM fecha_cita) = $2
             GROUP BY estado`,
            [mes, anio]
        );

        const resumen = {
            pendiente: 0,
            confirmada: 0,
            atendida: 0,
            cancelada: 0,
            no_asistio: 0
        };

        result.rows.forEach(r => {
            resumen[r.estado] = r.cantidad;
        });

        const total = Object.values(resumen).reduce((a, b) => a + b, 0);
        return { ...resumen, total };
    }

    /**
     * Citas ATENDIDAS agrupadas por tipo de atención, en un mes/año
     */
    async obtenerPorTipoAtencion(mes, anio) {
        const result = await db.query(
            `SELECT COALESCE(t.nombre, 'Sin especificar') AS tipo_atencion,
                    COUNT(*)::int AS cantidad
             FROM citas c
             LEFT JOIN tipos_atencion t ON c.tipo_atencion_id = t.id
             WHERE c.estado = 'atendida'
               AND EXTRACT(MONTH FROM c.fecha_cita) = $1
               AND EXTRACT(YEAR FROM c.fecha_cita) = $2
             GROUP BY t.nombre
             ORDER BY cantidad DESC`,
            [mes, anio]
        );
        return result.rows;
    }

    /**
     * Citas ATENDIDAS agrupadas por entidad, en un mes/año
     */
    async obtenerPorEntidad(mes, anio) {
        const result = await db.query(
            `SELECT COALESCE(e.nombre, 'Sin entidad') AS entidad,
                    COUNT(*)::int AS cantidad
             FROM citas c
             LEFT JOIN entidades e ON c.entidad_id = e.id
             WHERE c.estado = 'atendida'
               AND EXTRACT(MONTH FROM c.fecha_cita) = $1
               AND EXTRACT(YEAR FROM c.fecha_cita) = $2
             GROUP BY e.nombre
             ORDER BY cantidad DESC`,
            [mes, anio]
        );
        return result.rows;
    }

    /**
     * Reporte completo: resumen + por tipo + por entidad, en un solo objeto
     */
    async obtenerReporteCompleto(mes, anio) {
        const [resumen, porTipo, porEntidad] = await Promise.all([
            this.obtenerResumenGeneral(mes, anio),
            this.obtenerPorTipoAtencion(mes, anio),
            this.obtenerPorEntidad(mes, anio)
        ]);

        return { resumen, porTipo, porEntidad, mes, anio };
    }
}

module.exports = new EstadisticasService();
