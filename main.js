const { app, BrowserWindow, ipcMain } = require('electron');

const { exec } = require('child_process');

const { shell } = require('electron');
const fs = require('fs');




// ============================================
// 🟢 HANDLERS PARA CONTROL DE POSTGRESQL
// ============================================

// Handler para abrir PDF con la aplicación nativa del sistema
ipcMain.handle('abrir-pdf-nativo', async (event, rutaPDF) => {
  try {
    if (fs.existsSync(rutaPDF)) {
      await shell.openPath(rutaPDF);
      return { ok: true };
    } else {
      console.error('El archivo PDF no existe:', rutaPDF);
      return { ok: false, error: 'El archivo PDF no existe' };
    }
  } catch (error) {
    console.error('Error al abrir PDF:', error);
    return { ok: false, error: error.message };
  }
});

// Handler para imprimir PDF (abre con app nativa y envía comando de impresión)
ipcMain.handle('imprimir-pdf-nativo', async (event, rutaPDF) => {
  try {
    if (fs.existsSync(rutaPDF)) {
      // Abrir el PDF con la app nativa
      await shell.openPath(rutaPDF);
      
      // Esperar un momento y luego enviar el comando de impresión
      setTimeout(() => {
        const ventanaPrincipal = BrowserWindow.getFocusedWindow();
        if (ventanaPrincipal) {
          ventanaPrincipal.webContents.send('comando-imprimir', rutaPDF);
        }
      }, 1500);
      
      return { ok: true };
    } else {
      return { ok: false, error: 'El archivo PDF no existe' };
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// ============================================
// 🟢 HANDLERS PARA VENTANA DE DETALLES Y MODAL
// ============================================

// Mostrar modal desde el renderer
ipcMain.on('mostrar-modal-resultados', (event, rutaPDF) => {
  const ventanaPrincipal = BrowserWindow.getFocusedWindow();
  if (ventanaPrincipal) {
    ventanaPrincipal.webContents.send('mostrar-modal', { rutaPDF, mostrar: true });
  }
});

// Cerrar modal
ipcMain.on('cerrar-modal', (event) => {
  const ventanaPrincipal = BrowserWindow.getFocusedWindow();
  if (ventanaPrincipal) {
    ventanaPrincipal.webContents.send('mostrar-modal', { mostrar: false });
  }
});

// Abrir ventana de detalles
// Abrir ventana de detalles
// En main.js, actualiza el handler
/*
ipcMain.on('abrir-ventana-detalles', (event, datosExamen) => {
    const ventanaDetalles = new BrowserWindow({
        width: 1100,
        height: 850,
        resizable: true,
        maximizable: true,
        minimizable: true,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // ✅ Cargar el nuevo archivo
    ventanaDetalles.loadFile('renderer/detalle_resultado.html');
    
    ventanaDetalles.once('ready-to-show', () => {
        ventanaDetalles.show();
        // Enviar los datos al renderer
        ventanaDetalles.webContents.send('cargar-detalles', datosExamen);
    });
});

*/

ipcMain.on('abrir-ventana-detalles', (event, datosExamen) => {
    const cita = datosExamen.cita || {};

    // Normaliza: sin tildes, minúsculas, sin espacios extra
    function normalizar(str) {
        return (str || '')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // ✅ Mapa ÚNICO, plano, todo en minúsculas garantizado por código (no a mano)
    const PANELES = {
        'audiometria': { archivo: 'detalle_audiometria.html', titulo: 'Audiometría Tonal' },
        'audiometria tonal': { archivo: 'detalle_audiometria.html', titulo: 'Audiometría Tonal' },
        'prepagada audiometria tonal': { archivo: 'detalle_audiometria.html', titulo: 'Audiometría Tonal' },

        'logoaudiometria': { archivo: 'detalle_logoaudiometria.html', titulo: 'Logoaudiometría' },
        'prepagada logoaudiometria': { archivo: 'detalle_logoaudiometria.html', titulo: 'Logoaudiometría' },

        'audiometria tonal y logoadiometria': { archivo: 'detalle_resultado.html', titulo: 'Exámenes Combinados' },
        'prepagada audiometria tonal y logoadiometria': { archivo: 'detalle_resultado.html', titulo: 'Exámenes Combinados' },
    };

    const tipoOriginal = cita.tipo_atencion || '';
    const tipoNormalizado = normalizar(tipoOriginal);
    const destino = PANELES[tipoNormalizado];

    let archivoDetalle, tituloVentana;

    if (destino) {
        archivoDetalle = destino.archivo;
        tituloVentana = destino.titulo;
    } else {
        console.error(`⚠️ tipo_atencion NO MAPEADO: "${tipoOriginal}" (normalizado: "${tipoNormalizado}")`);
        console.error('   Claves válidas:', Object.keys(PANELES));
        archivoDetalle = 'detalle_resultado.html';
        tituloVentana = '⚠️ Tipo no reconocido — revisar';
    }

    console.log(`📄 [ROUTING] tipo_atencion="${tipoOriginal}" → ${archivoDetalle}`);

    const ventanaDetalles = new BrowserWindow({
        width: 1100,
        height: 850,
        resizable: true,
        maximizable: true,
        minimizable: true,
        parent: BrowserWindow.getFocusedWindow(),
        modal: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    ventanaDetalles.setTitle(tituloVentana);
    ventanaDetalles.loadFile(`renderer/${archivoDetalle}`);

    ventanaDetalles.once('ready-to-show', () => {
        ventanaDetalles.show();
        ventanaDetalles.webContents.send('cargar-detalles', datosExamen);
    });
});
// Handler para verificar el estado de PostgreSQL
ipcMain.handle('verificar-postgres', async () => {
  return new Promise((resolve) => {
    exec('sc query postgresql', (error, stdout) => {
      if (stdout && stdout.includes('RUNNING')) {
        resolve({ running: true });
      } else {
        resolve({ running: false });
      }
    });
  });
});

// Handler para iniciar PostgreSQL
ipcMain.handle('iniciar-postgres', async () => {
  return new Promise((resolve) => {
    // Primero verificar si ya está corriendo
    exec('sc query postgresql-x64-16', (error, stdout) => {
      if (stdout && stdout.includes('RUNNING')) {
        // Ya está corriendo
        resolve({ success: true, message: 'PostgreSQL ya está activo', alreadyRunning: true });
      } else {
        // No está corriendo, iniciarlo
        exec('net start postgresql', (error2, stdout2) => {
          if (error2) {
            resolve({ success: false, message: error2.message });
          } else {
            resolve({ success: true, message: 'PostgreSQL iniciado correctamente' });
          }
        });
      }
    });
  });
});


ipcMain.handle('obtener-citas-con-detalles', async () => {
    try {
        const citas = await obtenerCitasConDetalles();
        return { ok: true, citas };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});

// Handler para obtener citas por mes
ipcMain.handle('obtener-citas-por-mes', async (event, mes, año) => {
    try {
        const citas = await obtenerCitasPorMes(mes, año);
        return { ok: true, citas };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});

// Handler para obtener estadísticas por entidad
ipcMain.handle('obtener-estadisticas-entidad', async (event, mes, año) => {
    try {
        const estadisticas = await obtenerEstadisticasPorEntidad(mes, año);
        return { ok: true, estadisticas };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});
const path = require('path');

const { guardarAudiometria, obtenerAudiometrias } = require('./db/audiometrias');
const initDB = require('./db/init');
const { crearUsuario, loginUsuario, obtenerUsuarios, actualizarRol } = require('./db/usuarios');
const { crearPaciente, obtenerPacientes } = require('./db/pacientes');
const { crearCita, obtenerCitasPendientes, obtenerCitaPorId, actualizarEstadoCita, obtenerCitasPorPaciente, obtenerTodasLasCitas } = require('./db/citas');
const { guardarLogoaudiometria, obtenerLogoaudiometrias, obtenerLogoaudiometriaPorId } = require('./db/logoaudiometrias');
const { obtenerCitasConDetalles, obtenerCitasPorMes, obtenerEstadisticasPorEntidad } = require('./db/reportes');
const { obtenerCitasConEstadoExamen, obtenerCitaConExamen } = require('./db/citas');
const { existeExamenPorCitaId } = require('./db/examenes_unificados');
const pdfRegeneratorService = require('./services/pdfRegeneratorService');
const EnvioService = require('./services/EnvioService');


//const pdfViewerService = require('./services/pdfViewerService');
//const qrService = require('./services/qrService');
const pdfService = require('./services/pdfService');
const excelService = require('./services/excelService');

let mainWindow;
let usuarioActual = null;
let ventanaCitas = null;



// Handler para obtener citas con estado de examen
ipcMain.handle('obtener-citas-con-estado-examen', async () => {
    try {
        const citas = await obtenerCitasConEstadoExamen();
        return { ok: true, citas };
    } catch (error) {
        console.error('Error:', error);
        return { ok: false, error: error.message };
    }
});

// ============================================================
// HANDLER PARA REGENERAR PDF DESDE BASE DE DATOS
// ============================================================

// En main.js - Asegurar que el handler usa el servicio correctamente
ipcMain.handle('regenerar-pdf', async (event, citaId) => {
    try {
        console.log('🔄 Regenerando PDF para cita:', citaId);
        
        // 1. Obtener datos de la cita
        const citasDB = require('./db/citas');
        const cita = await citasDB.obtenerCitaPorId(citaId);
        if (!cita) {
            throw new Error('No se encontró la cita');
        }

        
        
        console.log('📋 Datos de la cita obtenidos:', {
            id: cita.id,
            paciente: cita.paciente_nombre,
            entidad: cita.entidad_nombre
        });

        
        
// 2. Determinar según el MOTIVO de la cita qué tipo(s) de examen corresponden
// DESPUÉS — comparación exacta contra el campo dedicado, con respaldo temporal para citas viejas
const tipo = (cita.tipo_atencion || cita.motivo || '').trim();

const tiposConAudiometria = ['Audiometría', 'Audiometria Tonal y Logoadiometria', 'Prepagada Audiometria Tonal', 'Prepagada Audiometria Tonal y Logoadiometria'];
const tiposConLogoaudiometria = ['Logoaudiometria', 'Audiometria Tonal y Logoadiometria', 'Prepagada Logoaudiometria', 'Prepagada Audiometria Tonal y Logoadiometria'];

const requiereAudiometria = tiposConAudiometria.includes(tipo);
const requiereLogoaudiometria = tiposConLogoaudiometria.includes(tipo);

console.log('📋 tipo_atencion de la cita:', tipo);
console.log('📋 Requiere Audiometría:', requiereAudiometria, '| Requiere Logoaudiometría:', requiereLogoaudiometria);

if (!requiereAudiometria && !requiereLogoaudiometria) {
    throw new Error('Tipo de atención no reconocido: ' + tipo);
}
        
   
        
        const examenesDB = require('./db/examenes_unificados');
        const { obtenerAudiometriaPorCitaId } = require('./db/audiometrias');
        const { obtenerLogoaudiometriaPorCitaId } = require('./db/logoaudiometrias');
        
        // 3. Buscar SOLO lo que corresponde al tipo declarado en la cita, filtrado por cita_id exacto
        let examenAudiometria = null;
        let examenLogoaudiometria = null;
        
        if (requiereAudiometria) {
            examenAudiometria = await examenesDB.obtenerExamenesPorCitaYtipo(citaId, 'audiometria');
            if (!examenAudiometria) {
                examenAudiometria = await obtenerAudiometriaPorCitaId(citaId);
            }
            if (!examenAudiometria) {
                console.log('⚠️ La cita requiere Audiometría pero no se encontró el examen guardado');
            }
        }
        
        if (requiereLogoaudiometria) {
            examenLogoaudiometria = await examenesDB.obtenerExamenesPorCitaYtipo(citaId, 'logoaudiometria');
            if (!examenLogoaudiometria) {
                examenLogoaudiometria = await obtenerLogoaudiometriaPorCitaId(citaId);
            }
            if (!examenLogoaudiometria) {
                console.log('⚠️ La cita requiere Logoaudiometría pero no se encontró el examen guardado');
            }
        }
        
        if (!examenAudiometria && !examenLogoaudiometria) {
            throw new Error('No se encontró ningún examen guardado que coincida con el tipo de atención de esta cita');
        }
        
        console.log('📊 Examen Audiometría encontrado:', !!examenAudiometria);
        console.log('📊 Examen Logoaudiometría encontrado:', !!examenLogoaudiometria);
        
        // 4. IMPORTAR Y USAR EL SERVICIO
        const pdfRegeneratorService = require('./services/pdfRegeneratorService');
        
        // 5. REGENERAR PDF (ya no adivina nada, recibe exactamente lo que corresponde)
        const pdfPath = await pdfRegeneratorService.regenerarPDF(cita, examenAudiometria, examenLogoaudiometria);
        
        console.log('✅ PDF regenerado exitosamente:', pdfPath);
        return { ok: true, pdfPath };
        
    } catch (error) {
        console.error('❌ Error regenerando PDF:', error);
        return { ok: false, error: error.message };
    }
});



// Handler para abrir WhatsApp
ipcMain.handle('abrir-whatsapp', async (event, telefono, mensaje) => {
    try {
        // 🔥 USAR EnvioService en lugar de whatsappService
        const resultado = EnvioService.abrirWhatsApp(telefono, mensaje);
        return resultado;
    } catch (error) {
        console.error('❌ Error en abrir-whatsapp:', error);
        return { ok: false, error: error.message };
    }
});

// Handler para generar mensaje de resultados
ipcMain.handle('generar-mensaje-resultados', async (event, paciente, tipoExamen) => {
    try {
        // 🔥 USAR EnvioService en lugar de whatsappService
        const mensaje = EnvioService.generarMensajeResultados(paciente, tipoExamen);
        return { ok: true, mensaje };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});

// En main.js - Agregar este handler
ipcMain.handle('verificar-archivo', async (event, filePath) => {
    try {
        const fs = require('fs');
        const existe = fs.existsSync(filePath);
        return { ok: existe };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});


// Handler para abrir PDF en ventana
ipcMain.handle('abrir-pdf-ventana', async (event, pdfPath) => {
    try {
        const pdfRegeneratorService = require('./services/pdfRegeneratorService');
        await pdfRegeneratorService.mostrarPDFEnVentana(pdfPath);
        return { ok: true };
    } catch (error) {
        console.error('❌ Error abriendo PDF en ventana:', error);
        return { ok: false, error: error.message };
    }
});

// Handler para leer archivo como base64
ipcMain.handle('leer-archivo-base64', async (event, filePath) => {
    try {
        const fs = require('fs');
        if (!fs.existsSync(filePath)) {
            throw new Error('El archivo no existe');
        }
        const buffer = fs.readFileSync(filePath);
        const base64 = buffer.toString('base64');
        return { ok: true, base64 };
    } catch (error) {
        console.error('❌ Error leyendo archivo:', error);
        return { ok: false, error: error.message };
    }
});

// Handler para obtener cita específica con su examen
ipcMain.handle('obtener-cita-con-examen', async (event, citaId) => {
    try {
        const cita = await obtenerCitaConExamen(citaId);
        return { ok: true, cita };
    } catch (error) {
        console.error('Error:', error);
        return { ok: false, error: error.message };
    }
});

// Handler para verificar si cita tiene examen
ipcMain.handle('verificar-examen-por-cita', async (event, citaId) => {
    try {
        const existe = await existeExamenPorCitaId(citaId);
        return { ok: true, existe };
    } catch (error) {
        return { ok: false, error: error.message };
    }
});

ipcMain.handle('guardar-logoaudiometria', async (event, data) => {
  try {
    // Log para depuración
    console.log('Recibiendo datos para guardar:', {
      paciente_id: data.paciente_id,
      cita_id: data.cita_id,
      tiene_diagnostico_od: !!data.diagnostico_od,
      tiene_diagnostico_oi: !!data.diagnostico_oi
    });
    
    const resultado = await guardarLogoaudiometria(data);
    return { ok: true, id: resultado.id };
  } catch (error) {
    console.error('Error guardando logoaudiometría:', error);
    return { ok: false, error: error.message };
  }
});

// Handler para obtener examen por cita ID (USANDO TABLA UNIFICADA)
// Reemplazar el handler obtener-examen-por-cita-id
ipcMain.handle('obtener-examen-por-cita-id', async (event, citaId) => {
    try {
        console.log('=== BUSCANDO EXAMEN PARA CITA:', citaId);
        
        // 1. Buscar en examenes_audiologicos (tabla unificada)
        const { obtenerExamenPorCitaId } = require('./db/examenes_unificados');
        let examen = await obtenerExamenPorCitaId(citaId);
        if (examen) {
            console.log('✅ Encontrado en examenes_audiologicos');
            return { ok: true, examen };
        }
        
        // 2. Buscar en logoaudiometrias
        const { obtenerLogoaudiometriaPorCitaId } = require('./db/logoaudiometrias');
        examen = await obtenerLogoaudiometriaPorCitaId(citaId);
        if (examen) {
            console.log('✅ Encontrado en logoaudiometrias');
            examen.tipo_examen = 'logoaudiometria';
            return { ok: true, examen };
        }
        
        // 3. Buscar en audiometrias
        const { obtenerAudiometriaPorCitaId } = require('./db/audiometrias');
        examen = await obtenerAudiometriaPorCitaId(citaId);
        if (examen) {
            console.log('✅ Encontrado en audiometrias');
            examen.tipo_examen = 'audiometria';
            return { ok: true, examen };
        }
        
        console.log('❌ No se encontró examen para cita:', citaId);
        return { ok: true, examen: null };
        
    } catch (error) {
        console.error('Error:', error);
        return { ok: false, error: error.message };
    }
});

// Agregar handlers (después de los otros)
ipcMain.handle('generar-y-mostrar-pdf', async (event, datos, entidad, tipo) => {
  try {
    console.log('📄 Handler generar-y-mostrar-pdf llamado');
    console.log('   - Tipo:', tipo);
    console.log('   - Entidad:', entidad);
    
    const resultado = await pdfService.generarYMostrarPDF(datos, entidad, tipo);
    return resultado;
  } catch (error) {
    console.error('❌ Error en handler:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('generar-y-mostrar-qr-combinado', async (event, datosCita, entidad) => {
    try {
        // Buscar ambos exámenes
        const { obtenerExamenesPorCitaYtipo } = require('./db/examenes_unificados');
        
        const audiometriaData = await obtenerExamenesPorCitaYtipo(datosCita.id, 'audiometria');
        const logoaudiometriaData = await obtenerExamenesPorCitaYtipo(datosCita.id, 'logoaudiometria');
        
        console.log('QR Combinado - Audiometría:', !!audiometriaData);
        console.log('QR Combinado - Logoaudiometría:', !!logoaudiometriaData);
        
        if (!audiometriaData || !logoaudiometriaData) {
            throw new Error('No se encontraron ambos exámenes');
        }
        
        // Construir objeto combinado para el QR service
        const examenCombinado = {
            tipo_examen: 'combinado',
            audiometria: audiometriaData,
            logoaudiometria: logoaudiometriaData
        };
        
        // Llamar al QR service con el examen combinado
        const qrService = require('./services/qrService');
        return await qrService.generarYMostrarQR(datosCita, examenCombinado, entidad, 'combinado');
        
    } catch (error) {
        console.error('Error en QR combinado:', error);
        return { ok: false, error: error.message };
    }
});

ipcMain.handle('generar-y-mostrar-qr', async (event, datosCita, examenData, entidad, tipoExamen) => {
  try {
    return await qrService.generarYMostrarQR(datosCita, examenData, entidad, tipoExamen);
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('close-qr-window', () => {
  qrService.cerrarVentanaQR();
  return { ok: true };
});

// Manejador de navegación
ipcMain.on('navegar', (event, archivo) => {
  if (mainWindow) {
    const filePath = path.join(__dirname, 'renderer', archivo);
    mainWindow.loadFile(filePath).catch(err => {
      console.error('Error cargando:', archivo, err);
    });
  }
});

ipcMain.handle('generarExcel', async (event, data) => {
    try {
        const { citas, reporte, mes, año } = data;
        
        // Generar el Excel usando el servicio
        const rutaArchivo = excelService.generarReporteCitas(citas, reporte, mes, año);
        
        // Opcional: Abrir el archivo automáticamente
        const { shell } = require('electron');
        shell.openPath(rutaArchivo);
        
        return {
            ok: true,
            ruta: rutaArchivo
        };
    } catch (error) {
        console.error('Error generando Excel:', error);
        return {
            ok: false,
            error: error.message
        };
    }
});

// En main.js, agregar después de los otros manejadores:

const pdfGenerator = require('./services/pdfGenerator');
const { obtenerEntidades, obtenerFormatoPorEntidadId, actualizarFormato } = require('./db/entidades');
const pdfGeneratorUnified = require('./services/pdfGeneratorUnified');
const pdfGeneratorCoosaludUnified = require('./services/pdfGeneratorCoosaludUnified');


// Manejadores para entidades
ipcMain.handle('obtener-entidades', async () => {
  try {
    const entidades = await obtenerEntidades();
    return { ok: true, entidades };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});




ipcMain.handle('obtener-formato-entidad', async (event, entidadId) => {
  try {
    const formato = await obtenerFormatoPorEntidadId(entidadId);
    return { ok: true, formato };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('actualizar-formato', async (event, data) => {
  try {
    const formato = await actualizarFormato(
      data.entidadId,
      data.tipo_formato,
      data.header_image,
      data.footer_image,
      data.configuracion
    );
    return { ok: true, formato };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Manejador para generar PDF
// Manejador para generar PDF
ipcMain.handle('generar-pdf', async (event, datos, entidad, tipo) => {
  try {
    console.log('=== GENERAR PDF ===');
    console.log('Entidad recibida:', entidad);
    console.log('Tipo:', tipo);
    
    let pdfPath;
    
    // Determinar qué generador usar según la entidad
    if (entidad === 'COOSALUD' || entidad === 'PROGRESANDO EN SALUD') {
      console.log('📄 Usando generador de COOSALUD/PROGRESANDO');
      const pdfGeneratorCoosalud = require('./services/pdfGeneratorCoosalud');
      pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad, tipo);
    } else {
      console.log('📄 Usando generador estándar (U.D.A)');
      pdfPath = await pdfGenerator.generarPDF(datos, entidad, tipo);
    }
    
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error generando PDF:', error);
    return { ok: false, error: error.message };
  }
});
// Manejador para guardar audiometría
ipcMain.handle('guardar-audiometria', async (event, data) => {
  try {
    const resultado = await guardarAudiometria(data);
    return { ok: true, id: resultado.id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('obtener-audiometrias', async () => {
  try {
    const audiometrias = await obtenerAudiometrias();
    return { ok: true, audiometrias };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('generar-pdf-combinado', async (event, datosAudiometria, datosLogoaudiometria, entidad) => {
  try {
    console.log('=== generar-pdf-combinado ===');
    const pdfPath = await pdfGeneratorUnified.generarPDFCombinado(datosAudiometria, datosLogoaudiometria, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('generar-pdf-combinado-coosalud', async (event, datosAudiometria, datosLogoaudiometria, entidad) => {
  try {
    console.log('=== generar-pdf-combinado-coosalud ===');
    const pdfPath = await pdfGeneratorCoosaludUnified.generarPDFCombinadoCOO(datosAudiometria, datosLogoaudiometria, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});

// Manejadores de pacientes
ipcMain.handle('obtener-pacientes', async () => {
  try {
    const pacientes = await obtenerPacientes();
    return { ok: true, pacientes };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('crear-paciente', async (event, data) => {
  try {
    const resultado = await crearPaciente(data);
    return { ok: true, id: resultado.id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Agregar después de los otros manejadores de citas
ipcMain.handle('obtener-todas-las-citas', async () => {
  try {
    const citas = await obtenerTodasLasCitas();
    return { ok: true, citas };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Manejadores de citas
ipcMain.handle('crear-cita', async (event, data) => {
  try {
    const resultado = await crearCita(data);
    return { ok: true, id: resultado.id };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('obtener-citas-pendientes', async () => {
  try {
    const citas = await obtenerCitasPendientes();
    return { ok: true, citas };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('obtener-cita-por-id', async (event, id) => {
  try {
    const cita = await obtenerCitaPorId(id);
    return { ok: true, cita };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('actualizar-estado-cita', async (event, id, estado) => {
  try {
    await actualizarEstadoCita(id, estado);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('obtener-citas-por-paciente', async (event, pacienteId) => {
  try {
    const citas = await obtenerCitasPorPaciente(pacienteId);
    return { ok: true, citas };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Manejador EXCLUSIVO para generar PDF de AUDIOMETRÍA
// Manejador EXCLUSIVO para generar PDF de AUDIOMETRÍA
ipcMain.handle('generar-pdf-audiometria', async (event, datos, entidad) => {
  try {
    console.log('=== GENERAR PDF AUDIOMETRÍA ===');
    console.log('Entidad recibida:', entidad);
    
    let pdfPath;
    
    // Evaluar la entidad para elegir el generador correcto
    if (entidad === 'COOSALUD' || entidad === 'PROGRESANDO EN SALUD') {
      console.log('📄 Usando generador de COOSALUD/PROGRESANDO para AUDIOMETRÍA');
      const pdfGeneratorCoosalud = require('./services/pdfGeneratorCoosalud');
      // Necesitas crear generarPDFAudiometria en pdfGeneratorCoosalud
      pdfPath = await pdfGeneratorCoosalud.generarPDFAudiometria(datos, entidad);
    } else {
      console.log('📄 Usando generador estándar (U.D.A) para AUDIOMETRÍA');
      const pdfGenerator = require('./services/pdfGenerator');
      pdfPath = await pdfGenerator.generarPDFAudiometria(datos, entidad);
    }
    
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error generando PDF Audiometría:', error);
    return { ok: false, error: error.message };
  }
});

// Manejadores de usuarios
ipcMain.handle('obtener-usuarios', async () => {
  try {
    const usuarios = await obtenerUsuarios();
    return { ok: true, usuarios };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Reemplazar el manejador actualizar-cita por este:
const { actualizarCitaCompleta, eliminarCita } = require('./db/citas');

ipcMain.handle('actualizar-cita-completa', async (event, id, data) => {
  try {
    const resultado = await actualizarCitaCompleta(id, data);
    return { ok: true, resultado };
  } catch (error) {
    console.error('Error actualizando cita:', error);
    return { ok: false, error: error.message };
  }
});

// NUEVO: Manejador para eliminar cita
ipcMain.handle('eliminar-cita', async (event, id) => {
  try {
    const resultado = await eliminarCita(id);
    return { ok: true, deleted: resultado.deleted };
  } catch (error) {
    console.error('Error eliminando cita:', error);
    return { ok: false, error: error.message };
  }
});

const { actualizarCita } = require('./db/citas');



function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    focusable: true,  // ← NUEVO
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

    mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.setTitle('BIENVENIDO A S.U.D.A SISTEMA CLINICO DE UNIDAD DIAGNOSTICA AUDITIVA');
  mainWindow.loadFile('renderer/login.html');
}

// Agregar después de los otros manejadores de pacientes
const { actualizarPaciente, eliminarPaciente, obtenerPacientePorId } = require('./db/pacientes');

ipcMain.handle('actualizar-paciente', async (event, id, data) => {
  try {
    const resultado = await actualizarPaciente(id, data);
    return { ok: true, resultado };
  } catch (error) {
    console.error('Error actualizando paciente:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('eliminar-paciente', async (event, id) => {
  try {
    const resultado = await eliminarPaciente(id);
    return { ok: true, deleted: resultado.deleted };
  } catch (error) {
    console.error('Error eliminando paciente:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('obtener-paciente-por-id', async (event, id) => {
  try {
    const paciente = await obtenerPacientePorId(id);
    return { ok: true, paciente };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Importar el nuevo módulo unificado
const { guardarExamen, obtenerExamenes, obtenerExamenPorId, obtenerExamenesPorTipo } = require('./db/examenes_unificados');

// Manejador unificado para guardar cualquier tipo de examen
ipcMain.handle('guardar-examen', async (event, data) => {
  try {
    console.log('Guardando examen tipo:', data.tipo_examen);
    const resultado = await guardarExamen(data);
    return { ok: true, id: resultado.id };
  } catch (error) {
    console.error('Error guardando examen:', error);
    return { ok: false, error: error.message };
  }
});

// Manejador para obtener todos los exámenes
ipcMain.handle('obtener-examenes', async () => {
  try {
    const examenes = await obtenerExamenes();
    return { ok: true, examenes };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Manejador para obtener exámenes por tipo
ipcMain.handle('obtener-examenes-por-tipo', async (event, tipo) => {
  try {
    const examenes = await obtenerExamenesPorTipo(tipo);
    return { ok: true, examenes };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});


app.whenReady().then(async () => {
  await initDB();

  try {
    await crearUsuario({
      username: 'admin',
      nombre_completo: 'Administrador',
      password: '123456',
      rol: 'administrador'
    });
    console.log('Usuario admin creado');
  } catch {
    console.log('El usuario admin ya existe');
  }

  try {
    await crearUsuario({
      username: 'secretaria',
      nombre_completo: 'Secretaria',
      password: '123456',
      rol: 'secretaria'
    });
    console.log('Usuario secretaria creado');
  } catch {
    console.log('El usuario secretaria ya existe');
  }

  try {
    await crearUsuario({
      username: 'audiologo',
      nombre_completo: 'Audiologo',
      password: '123456',
      rol: 'audiologo'
    });
    console.log('Usuario audiologo creado');
  } catch {
    console.log('El usuario audiologo ya existe');
  }

  createWindow();
});

ipcMain.handle('login', async (event, data) => {
  try {
    const user = await loginUsuario(data.username, data.password);
    if (user) {
      usuarioActual = user;
      return { ok: true, user };
    } else {
      return { ok: false, error: 'Credenciales incorrectas' };
    }
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

// Importar el nuevo generador unificado


/* Manejador para generar PDF de AUDIOMETRÍA
ipcMain.handle('generar-pdf-audiometria', async (event, datos, entidad) => {
  try {
    console.log('=== generar-pdf-audiometria ===');
    const pdfPath = await pdfGeneratorUnified.generarPDFAudiometria(datos, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});


*/

// Manejador para generar PDF de LOGOAUDIOMETRÍA
ipcMain.handle('generar-pdf-logoaudiometria', async (event, datos, entidad) => {
  try {
    console.log('=== generar-pdf-logoaudiometria ===');
    const pdfPath = await pdfGeneratorUnified.generarPDFLogoaudiometria(datos, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});

// NUEVO MANEJADOR UNIFICADO PARA PDF (sin conflicto con los existentes)
ipcMain.handle('generar-pdf-unificado-audiometria', async (event, datos, entidad) => {
  try {
    console.log('=== generar-pdf-unificado-audiometria ===');
    const pdfPath = await pdfGeneratorUnified.generarPDFAudiometria(datos, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('generar-pdf-unificado-logoaudiometria', async (event, datos, entidad) => {
  try {
    console.log('=== generar-pdf-unificado-logoaudiometria ===');
    const pdfPath = await pdfGeneratorUnified.generarPDFLogoaudiometria(datos, entidad);
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('Error:', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('crear-usuario', async (event, data) => {
  try {
    await crearUsuario(data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('get-usuario-actual', async () => {
  return usuarioActual;
});

ipcMain.on('citas-window-opened', (event) => {
    ventanaCitas = BrowserWindow.fromWebContents(event.sender);
    if (ventanaCitas) {
        // Limpiar referencia cuando se cierre
        ventanaCitas.on('closed', () => {
            ventanaCitas = null;
        });
    }
});

// Cuando se registra una nueva cita
ipcMain.on('cita-registrada', (event, citaData) => {
    console.log('📢 Nueva cita:', citaData.paciente_nombre);
    
    // SOLO enviar a la ventana de citas si está abierta
    if (ventanaCitas && !ventanaCitas.isDestroyed()) {
        ventanaCitas.webContents.send('nueva-cita', citaData);
    }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});