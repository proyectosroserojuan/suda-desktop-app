// ============================================
// SERVICIO DE NOTICIAS / FRASE DEL DÍA
// ============================================

const noticiasService = {
    // Base de datos local de eventos históricos de Colombia
    datosHistoricos: [
        { fecha: '20 de julio de 1810', evento: 'Grito de Independencia de Colombia' },
        { fecha: '7 de agosto de 1819', evento: 'Batalla de Boyacá - Independencia definitiva' },
        { fecha: '9 de abril de 1948', evento: 'El Bogotazo - Asesinato de Jorge Eliécer Gaitán' },
        { fecha: '4 de julio de 1991', evento: 'Promulgación de la Constitución Política de Colombia' },
        { fecha: '10 de agosto de 1538', evento: 'Fundación de Santa Fe de Bogotá' },
        { fecha: '6 de agosto de 1825', evento: 'Creación de la República de Bolivia' },
        { fecha: '13 de junio de 1953', evento: 'Golpe de Estado a Gustavo Rojas Pinilla' },
        { fecha: '19 de abril de 1970', evento: 'Elecciones presidenciales - Frente Nacional' },
        { fecha: '24 de agosto de 2016', evento: 'Firma del Acuerdo de Paz con las FARC' }
    ],

    // Frases motivacionales
    frases: [
        'El conocimiento es poder. La audición es vida.',
        'Escuchar es el primer paso para entender.',
        'Un diagnóstico a tiempo cambia vidas.',
        'La salud auditiva es un derecho, no un privilegio.',
        'Cada paciente merece una oportunidad de escuchar mejor.'
    ],

    // Obtener un dato aleatorio
    obtenerDatoAleatorio: function() {
        // 70% probabilidad de mostrar evento histórico, 30% frase
        const esHistorico = Math.random() < 0.7;
        
        if (esHistorico) {
            const index = Math.floor(Math.random() * this.datosHistoricos.length);
            const evento = this.datosHistoricos[index];
            return {
                texto: `Tal día como hoy, ${evento.fecha}: ${evento.evento}`,
                tipo: 'historico'
            };
        } else {
            const index = Math.floor(Math.random() * this.frases.length);
            return {
                texto: `${this.frases[index]}`,
                tipo: 'motivacional'
            };
        }
    },

    // Obtener dato para el modal (función síncrona, sin async para evitar bloqueos)
    obtenerParaModal: function() {
        try {
            const dato = this.obtenerDatoAleatorio();
            return dato;
        } catch (error) {
            console.warn('Error al obtener dato:', error);
            // Fallback seguro
            return {
                texto: 'La salud auditiva es un derecho fundamental.',
                tipo: 'fallback'
            };
        }
    }
};

// Exportar para usar en otros archivos
if (typeof window !== 'undefined') {
    window.noticiasService = noticiasService;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = noticiasService;
}