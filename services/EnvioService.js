// services/EnvioService.js
const { shell } = require('electron');

class EnvioService {
    /**
     * Abre WhatsApp Web con el número del paciente
     */
    abrirWhatsApp(telefono, mensaje = '') {
        try {
            // Limpiar el número
            let numeroLimpio = telefono.replace(/[\s\-\(\)]/g, '');
            
            // Si el número no tiene código de país, asumir Colombia (+57)
            if (!numeroLimpio.startsWith('57') && !numeroLimpio.startsWith('+57')) {
                if (numeroLimpio.length === 10) {
                    numeroLimpio = '57' + numeroLimpio;
                } else if (numeroLimpio.length === 9) {
                    numeroLimpio = '573' + numeroLimpio;
                } else {
                    numeroLimpio = '57' + numeroLimpio;
                }
            }
            
            if (!numeroLimpio.startsWith('+')) {
                numeroLimpio = '+' + numeroLimpio;
            }
            
            const mensajeCodificado = encodeURIComponent(mensaje);
            let url = `https://wa.me/${numeroLimpio}`;
            if (mensaje) {
                url += `?text=${mensajeCodificado}`;
            }
            
            console.log('📱 Abriendo WhatsApp:', url);
            shell.openExternal(url);
            
            return { ok: true, url };
        } catch (error) {
            console.error('❌ Error abriendo WhatsApp:', error);
            return { ok: false, error: error.message };
        }
    }
    
    /**
     * Genera un mensaje para el paciente con los resultados
     */
    generarMensajeResultados(paciente, tipoExamen) {
        const nombreTipo = tipoExamen === 'logoaudiometria' ? 'Logoaudiometría' : 
                          tipoExamen === 'audiometria' ? 'Audiometría' : 
                          'Examen Audiológico';
        
        return `Hola ${paciente.nombre}, 👋

Le informamos que sus resultados del examen de ${nombreTipo} ya están disponibles.

Puede acercarse a nuestras instalaciones para recibir su reporte completo o solicitar más información.

¡Gracias por confiar en nosotros! 🏥

Unidad Diagnóstica Auditiva - U.D.A.`;
    }
}

module.exports = new EnvioService();