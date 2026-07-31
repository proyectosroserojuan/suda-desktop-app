const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Autenticación
  login: (data) => ipcRenderer.invoke('login', data),
  crearUsuario: (data) => ipcRenderer.invoke('crear-usuario', data),
  getUsuarioActual: () => ipcRenderer.invoke('get-usuario-actual'),
  
  // Usuarios y roles
  obtenerUsuarios: () => ipcRenderer.invoke('obtener-usuarios'),
  actualizarRol: (id, rol) => ipcRenderer.invoke('actualizar-rol', id, rol),

  // En preload.js, dentro del objeto api, agrega:
onCargarDetalles: (callback) => {
    ipcRenderer.on('cargar-detalles', (event, datos) => {
        callback(datos);
    });
},


    // NUEVAS FUNCIONES PARA REGENERAR PDF
    regenerarPDF: async (citaId) => {
        return await ipcRenderer.invoke('regenerar-pdf', citaId);
    },
    
    obtenerExamenPorCitaYtipo: async (citaId, tipoExamen) => {
        return await ipcRenderer.invoke('obtener-examen-por-cita-tipo', citaId, tipoExamen);
    },
    
    abrirPDFEnVentana: async (pdfPath) => {
        return await ipcRenderer.invoke('abrir-pdf-ventana', pdfPath);
    },


    // Funciones para WhatsApp
abrirWhatsApp: (telefono, mensaje) => ipcRenderer.invoke('abrir-whatsapp', telefono, mensaje),
generarMensajeResultados: (paciente, tipoExamen) => ipcRenderer.invoke('generar-mensaje-resultados', paciente, tipoExamen),
// En preload.js - Agregar al objeto api
verificarArchivo: (filePath) => ipcRenderer.invoke('verificar-archivo', filePath),

  // Agregar estos métodos al objeto api
obtenerCitasConEstadoExamen: () => ipcRenderer.invoke('obtener-citas-con-estado-examen'),
obtenerCitaConExamen: (citaId) => ipcRenderer.invoke('obtener-cita-con-examen', citaId),
verificarExamenPorCita: (citaId) => ipcRenderer.invoke('verificar-examen-por-cita', citaId),
// En preload.js, dentro del objeto api, agrega esta línea:
abrirVentanaDetalles: (datosExamen) => ipcRenderer.send('abrir-ventana-detalles', datosExamen),
  
  // Pacientes
  crearPaciente: (data) => ipcRenderer.invoke('crear-paciente', data),
  obtenerPacientes: () => ipcRenderer.invoke('obtener-pacientes'),

    guardarExamen: (data) => ipcRenderer.invoke('guardar-examen', data),
  obtenerExamenes: () => ipcRenderer.invoke('obtener-examenes'),
  obtenerExamenesPorTipo: (tipo) => ipcRenderer.invoke('obtener-examenes-por-tipo', tipo),

  // Agregar dentro del objeto api
actualizarPaciente: (id, data) => ipcRenderer.invoke('actualizar-paciente', id, data),
eliminarPaciente: (id) => ipcRenderer.invoke('eliminar-paciente', id),
obtenerPacientePorId: (id) => ipcRenderer.invoke('obtener-paciente-por-id', id),

    guardarLogoaudiometria: (data) => ipcRenderer.invoke('guardar-logoaudiometria', data),
  obtenerLogoaudiometrias: () => ipcRenderer.invoke('obtener-logoaudiometrias'),
  obtenerLogoaudiometriaPorId: (id) => ipcRenderer.invoke('obtener-logoaudiometria-por-id', id),
  
// Agregar en el objeto api de preload.js:
generarPDFAudiometria: (datos, entidad) => ipcRenderer.invoke('generar-pdf-audiometria', datos, entidad),
generarPDFLogoaudiometria: (datos, entidad) => ipcRenderer.invoke('generar-pdf-logoaudiometria', datos, entidad),
generarPDFCombinado: (datosAudiometria, datosLogoaudiometria, entidad) => ipcRenderer.invoke('generar-pdf-combinado', datosAudiometria, datosLogoaudiometria, entidad),
// Agregar junto a los otros métodos
generarPDFCombinadoCoosalud: (datosAudiometria, datosLogoaudiometria, entidad) => ipcRenderer.invoke('generar-pdf-combinado-coosalud', datosAudiometria, datosLogoaudiometria, entidad),
  guardarExamen: (data) => ipcRenderer.invoke('guardar-examen', data),
  // Audiometrías
  guardarAudiometria: (data) => ipcRenderer.invoke('guardar-audiometria', data),
  obtenerAudiometrias: () => ipcRenderer.invoke('obtener-audiometrias'),
  // Agregar junto a los otros métodos de citas
obtenerTodasLasCitas: () => ipcRenderer.invoke('obtener-todas-las-citas'),
// Agregar al objeto api
//generarPDFAudiometria: (datos, entidad) => ipcRenderer.invoke('generar-pdf-audiometria', datos, entidad),

// Agregar dentro del objeto api
actualizarCitaCompleta: (id, data) => ipcRenderer.invoke('actualizar-cita-completa', id, data),
eliminarCita: (id) => ipcRenderer.invoke('eliminar-cita', id),
  // Citas
  crearCita: (data) => ipcRenderer.invoke('crear-cita', data),
  obtenerCitasPendientes: () => ipcRenderer.invoke('obtener-citas-pendientes'),
  obtenerCitaPorId: (id) => ipcRenderer.invoke('obtener-cita-por-id', id),
  actualizarEstadoCita: (id, estado) => ipcRenderer.invoke('actualizar-estado-cita', id, estado),
  obtenerCitasPorPaciente: (pacienteId) => ipcRenderer.invoke('obtener-citas-por-paciente', pacienteId),
  
  // Navegación
  navegar: (archivo) => ipcRenderer.send('navegar', archivo),
  volverDashboard: () => ipcRenderer.send('navegar', 'dashboard.html'),

  

  // Agregar estos métodos al objeto api en preload.js:

// Entidades y formatos
obtenerEntidades: () => ipcRenderer.invoke('obtener-entidades'),
obtenerFormatoEntidad: (entidadId) => ipcRenderer.invoke('obtener-formato-entidad', entidadId),
actualizarFormato: (data) => ipcRenderer.invoke('actualizar-formato', data),
generarPDF: (datos, entidad, tipo) => ipcRenderer.invoke('generar-pdf', datos, entidad, tipo),

// Agregar dentro del objeto api (junto a los otros métodos)
generarPDFUnificadoAudiometria: (datos, entidad) => ipcRenderer.invoke('generar-pdf-unificado-audiometria', datos, entidad),
generarPDFUnificadoLogoaudiometria: (datos, entidad) => ipcRenderer.invoke('generar-pdf-unificado-logoaudiometria', datos, entidad),

// Agregar al objeto api
  generarYMostrarPDF: (datos, entidad, tipo) => {
    console.log('🔍 preload: generarYMostrarPDF llamado', { tipo, entidad });
    return ipcRenderer.invoke('generar-y-mostrar-pdf', datos, entidad, tipo);
  },
generarYMostrarQR: (datosCita, examenData, entidad, tipoExamen) => ipcRenderer.invoke('generar-y-mostrar-qr', datosCita, examenData, entidad, tipoExamen),
closeQRWindow: () => ipcRenderer.invoke('close-qr-window'),
obtenerExamenPorCitaId: (citaId) => ipcRenderer.invoke('obtener-examen-por-cita-id', citaId),
generarYMostrarQRCombinado: (datosCita, entidad) => ipcRenderer.invoke('generar-y-mostrar-qr-combinado', datosCita, entidad),
generarExcel: (data) => ipcRenderer.invoke('generarExcel', data),

verificarPostgres: () => ipcRenderer.invoke('verificar-postgres'),
iniciarPostgres: () => ipcRenderer.invoke('iniciar-postgres'),

// Agregar dentro del objeto api en preload.js
obtenerCitasConDetalles: () => ipcRenderer.invoke('obtener-citas-con-detalles'),
obtenerCitasPorMes: (mes, año) => ipcRenderer.invoke('obtener-citas-por-mes', mes, año),
obtenerEstadisticasEntidad: (mes, año) => ipcRenderer.invoke('obtener-estadisticas-entidad', mes, año),

// preload.js - Agrega al final del objeto api

// ✅ NOTIFICACIÓN NO INTRUSIVA: Solo envía el evento, no bloquea nada
notificarNuevaCita: (citaData) => {
    ipcRenderer.send('cita-registrada', citaData);
},

// ✅ ESCUCHAR NUEVAS CITAS: Solo recibe, no afecta el rendimiento
onNuevaCita: (callback) => {
    // Remover listeners viejos para evitar duplicados
    ipcRenderer.removeAllListeners('nueva-cita');
    ipcRenderer.on('nueva-cita', (event, citaData) => {
        callback(citaData);
    });
},

// Agregar al objeto api en preload.js:

// Abrir PDF con aplicación nativa del sistema
abrirPDFNativo: (rutaPDF) => ipcRenderer.invoke('abrir-pdf-nativo', rutaPDF),

// Imprimir PDF
imprimirPDFNativo: (rutaPDF) => ipcRenderer.invoke('imprimir-pdf-nativo', rutaPDF),

// Escuchar comando de impresión desde main
onComandoImprimir: (callback) => {
  ipcRenderer.removeAllListeners('comando-imprimir');
  ipcRenderer.on('comando-imprimir', (event, rutaPDF) => {
    callback(rutaPDF);
  });
}
});