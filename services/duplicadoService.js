// services/duplicadoService.js
// ============================================================
// 🛡️ SERVICIO ANTI-DUPLICADOS - PREVIENE REGISTROS MÚLTIPLES
// ============================================================

class DuplicadoService {
    constructor() {
        // Almacenar temporalmente las citas en proceso
        this.citasEnProceso = new Map();
        // Tiempo de bloqueo en milisegundos (5 segundos)
        this.tiempoBloqueo = 5000;
        // Limpiar la memoria cada 10 minutos
        setInterval(() => this.limpiarMemoria(), 600000);
    }

    /**
     * 🔒 Verificar si una cita ya está siendo procesada
     * @param {number} citaId - ID de la cita
     * @param {string} tipoExamen - 'audiometria', 'logoaudiometria', o 'combinado'
     * @returns {boolean} - true si ya está en proceso, false si está libre
     */
    estaEnProceso(citaId, tipoExamen = 'combinado') {
        const clave = `${citaId}_${tipoExamen}`;
        if (this.citasEnProceso.has(clave)) {
            const timestamp = this.citasEnProceso.get(clave);
            // Si pasó el tiempo de bloqueo, liberar automáticamente
            if (Date.now() - timestamp > this.tiempoBloqueo) {
                this.citasEnProceso.delete(clave);
                return false;
            }
            return true;
        }
        return false;
    }

    /**
     * 🔒 Bloquear una cita para evitar duplicados
     * @param {number} citaId - ID de la cita
     * @param {string} tipoExamen - 'audiometria', 'logoaudiometria', o 'combinado'
     * @returns {boolean} - true si se bloqueó, false si ya estaba bloqueada
     */
    bloquear(citaId, tipoExamen = 'combinado') {
        const clave = `${citaId}_${tipoExamen}`;
        
        if (this.estaEnProceso(citaId, tipoExamen)) {
            console.warn(`⚠️ La cita ${citaId} ya está siendo procesada (${tipoExamen})`);
            return false;
        }
        
        this.citasEnProceso.set(clave, Date.now());
        console.log(`🔒 Cita ${citaId} bloqueada (${tipoExamen})`);
        return true;
    }

    /**
     * 🔓 Liberar una cita después de procesar
     * @param {number} citaId - ID de la cita
     * @param {string} tipoExamen - 'audiometria', 'logoaudiometria', o 'combinado'
     */
    liberar(citaId, tipoExamen = 'combinado') {
        const clave = `${citaId}_${tipoExamen}`;
        this.citasEnProceso.delete(clave);
        console.log(`🔓 Cita ${citaId} liberada (${tipoExamen})`);
    }

    /**
     * 🧹 Limpiar bloqueos antiguos automáticamente
     */
    limpiarMemoria() {
        const ahora = Date.now();
        let limpiados = 0;
        
        for (const [clave, timestamp] of this.citasEnProceso) {
            if (ahora - timestamp > this.tiempoBloqueo) {
                this.citasEnProceso.delete(clave);
                limpiados++;
            }
        }
        
        if (limpiados > 0) {
            console.log(`🧹 ${limpiados} bloqueos antiguos eliminados`);
        }
    }

    /**
     * 📋 Verificar si el estado de la cita permite registrar nuevo examen
     * @param {object} cita - Objeto de la cita
     * @returns {object} { permitido: boolean, mensaje: string }
     */
    verificarEstadoCita(cita) {
        if (!cita) {
            return { permitido: false, mensaje: 'No se encontró la cita' };
        }

        // Si la cita ya está atendida, no permitir nuevo registro
        if (cita.estado === 'atendida' || cita.estado === 'completada') {
            return { 
                permitido: false, 
                mensaje: `⚠️ Esta cita ya fue registrada como "${cita.estado}". No se pueden guardar nuevos resultados.` 
            };
        }

        // Si la cita está cancelada, no permitir
        if (cita.estado === 'cancelada') {
            return { 
                permitido: false, 
                mensaje: `⚠️ Esta cita está cancelada. No se pueden guardar resultados.` 
            };
        }

        // Verificar si ya existe un examen para esta cita
        if (cita.tiene_examen === true) {
            return { 
                permitido: false, 
                mensaje: `⚠️ Esta cita ya tiene un examen registrado. No se pueden guardar resultados duplicados.` 
            };
        }

        return { permitido: true, mensaje: 'Cita disponible para registrar' };
    }

    /**
     * 📋 Verificar si el estado de la cita permite registrar (versión para usar directamente)
     * @param {number} citaId - ID de la cita a verificar
     * @param {function} obtenerCitaFn - Función para obtener la cita (async)
     * @returns {Promise<object>} - { permitido: boolean, mensaje: string, cita: object|null }
     */
    async verificarCitaParaRegistro(citaId, obtenerCitaFn) {
        try {
            // Obtener la cita con todos los datos
            const cita = await obtenerCitaFn(citaId);
            
            if (!cita) {
                return { 
                    permitido: false, 
                    mensaje: '❌ No se encontró la cita en la base de datos',
                    cita: null 
                };
            }

            // Verificar el estado
            const resultado = this.verificarEstadoCita(cita);
            
            return {
                ...resultado,
                cita: cita
            };

        } catch (error) {
            console.error('❌ Error verificando cita:', error);
            return {
                permitido: false,
                mensaje: `❌ Error al verificar la cita: ${error.message}`,
                cita: null
            };
        }
    }

    /**
     * 🔄 Crear un wrapper para funciones de guardado con protección anti-duplicados
     * @param {Function} guardarFn - Función original que guarda el examen
     * @param {string} tipoExamen - 'audiometria', 'logoaudiometria', o 'combinado'
     * @returns {Function} - Función envuelta con protección
     */
    proteger(guardarFn, tipoExamen = 'combinado') {
        return async (citaId, ...args) => {
            // Verificar si ya está en proceso
            if (this.estaEnProceso(citaId, tipoExamen)) {
                console.warn(`⚠️ Operación en curso para cita ${citaId} (${tipoExamen})`);
                return { 
                    ok: false, 
                    error: 'La cita ya está siendo procesada. Espere un momento.' 
                };
            }

            // Bloquear
            if (!this.bloquear(citaId, tipoExamen)) {
                return { 
                    ok: false, 
                    error: 'No se pudo bloquear la cita para procesar.' 
                };
            }

            try {
                // Ejecutar la función original
                const resultado = await guardarFn(...args);
                
                // Si fue exitoso, marcar como liberado
                this.liberar(citaId, tipoExamen);
                return resultado;
                
            } catch (error) {
                // En caso de error, liberar también
                this.liberar(citaId, tipoExamen);
                throw error;
            }
        };
    }
}

// Exportar una única instancia
module.exports = new DuplicadoService();