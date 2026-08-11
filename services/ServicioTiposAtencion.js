// services/ServicioTiposAtencion.js
const db = require('../db/connection');

class ServicioTiposAtencion {
    // Obtener un tipo por ID
    async obtenerPorId(id) {
        try {
            const result = await db.query(
                `SELECT 
                    id, 
                    nombre, 
                    descripcion, 
                    requiere_audiometria, 
                    requiere_logoaudiometria, 
                    panel_html 
                FROM tipos_atencion 
                WHERE id = $1`,
                [id]
            );
            return result.rows[0] || null;
        } catch (error) {
            console.error('❌ Error en obtenerPorId:', error);
            throw error;
        }
    }

    // Obtener todos los tipos para selects
    async obtenerParaSelect() {
        try {
            const result = await db.query(
                `SELECT id, nombre FROM tipos_atencion ORDER BY nombre`
            );
            return result.rows;
        } catch (error) {
            console.error('❌ Error en obtenerParaSelect:', error);
            throw error;
        }
    }

    // Obtener todos los tipos con detalles
    async obtenerTodos() {
        try {
            const result = await db.query(
                `SELECT * FROM tipos_atencion ORDER BY id`
            );
            return result.rows;
        } catch (error) {
            console.error('❌ Error en obtenerTodos:', error);
            throw error;
        }
    }
}

module.exports = new ServicioTiposAtencion();