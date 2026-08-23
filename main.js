const { app, BrowserWindow, ipcMain } = require('electron');

const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

require('dotenv').config();
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

ipcMain.handle('download-update', async () => {
  console.log('⬇️ Forzando descarga manual...');
  
  // ✅ FORZAR descarga (incluso si autoDownload es false)
  if (autoUpdater.downloadPromise) {
    console.log('⚠️ Ya hay una descarga en progreso.');
    return { ok: true, alreadyDownloading: true };
  }
  
  // ✅ Iniciar descarga con logs de progreso
  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`⬇️ Progreso: ${progressObj.percent.toFixed(1)}%`);
    // Enviar progreso al renderer
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', progressObj);
    }
  });
  
  autoUpdater.downloadUpdate();
  return { ok: true };
});

// Handler para reiniciar e instalar
ipcMain.handle('quit-and-install', async () => {
  console.log('🔄 Reiniciando para instalar...');
  autoUpdater.quitAndInstall();
  return { ok: true };
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

ipcMain.handle('check-for-updates', async () => {
  console.log('🔍 Verificación forzada desde el renderer');
  try {
    // 1. Forzar la verificación
    const result = await autoUpdater.checkForUpdatesAndNotify();
    console.log('✅ Resultado de verificación:', result);
    
    // 2. Si hay actualización, FORZAR la descarga MANUALMENTE
    if (result && result.updateInfo) {
      console.log('🆕 Actualización detectada:', result.updateInfo.version);
      
  
      
      // ✅ Notificar al renderer que hay actualización
      mainWindow.webContents.send('update-available', result.updateInfo.version);
      
      return { 
        ok: true, 
        result: {
          isUpdateAvailable: true,
          versionInfo: result.updateInfo
        }
      };
    }
    
    return { ok: true, result: { isUpdateAvailable: false } };
  } catch (error) {
    console.error('❌ Error al verificar:', error);
    return { ok: false, error: error.message };
  }
});

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
ipcMain.handle('actualizar-examen', async (event, citaId, data) => {
    try {
        const { actualizarExamen } = require('./db/examenes_unificados');
        const resultado = await actualizarExamen(citaId, data);
        return { ok: true, ...resultado };
    } catch (error) {
        console.error('❌ Error actualizando examen:', error);
        return { ok: false, error: error.message };
    }
});


// ============================================================
// HANDLER: abrir-ventana-detalles (CON CONVERSIÓN DE IMÁGENES)
// ============================================================
ipcMain.on('abrir-ventana-detalles', async (event, datosExamen) => {
    const cita = datosExamen.cita || {};
    const tipoId = cita.tipo_atencion_id;

    if (!tipoId) {
        console.error('❌ La cita no tiene tipo_atencion_id');
        return;
    }

    try {
        const tipo = await ServicioTiposAtencion.obtenerPorId(tipoId);

        if (!tipo) {
            console.error(`❌ No se encontró el tipo de atención con ID: ${tipoId}`);
            return;
        }

        console.log(`📄 [ROUTING] tipo_id=${tipoId} (${tipo.nombre}) → ${tipo.panel_html}`);

        // 🔥 OBTENER EL EXAMEN Y CONVERTIR IMÁGENES
        const examenes = datosExamen.cita?.examenes || {};
        let audiometria = examenes.audiometria || null;
        let logoaudiometria = examenes.logoaudiometria || null;

        // 🔥 CONVERTIR IMÁGENES DE AUDIOMETRÍA
        if (audiometria) {
            if (audiometria.grafica_tonal_url && !audiometria.grafica_tonal_base64) {
                console.log('🔄 Convirtiendo grafica_tonal_url a base64...');
                audiometria.grafica_tonal_base64 = await urlToBase64(audiometria.grafica_tonal_url);
            }
            // Si tiene grafica_base64 (campo antiguo) pero no grafica_tonal_base64
            if (audiometria.grafica_base64 && !audiometria.grafica_tonal_base64) {
                audiometria.grafica_tonal_base64 = audiometria.grafica_base64;
            }
        }

        // 🔥 CONVERTIR IMÁGENES DE LOGOAUDIOMETRÍA
        if (logoaudiometria) {
            if (logoaudiometria.grafica_logo_url && !logoaudiometria.grafica_logo_base64) {
                console.log('🔄 Convirtiendo grafica_logo_url a base64...');
                logoaudiometria.grafica_logo_base64 = await urlToBase64(logoaudiometria.grafica_logo_url);
            }
            // Si tiene grafica_base64 (campo antiguo) pero no grafica_logo_base64
            if (logoaudiometria.grafica_base64 && !logoaudiometria.grafica_logo_base64) {
                logoaudiometria.grafica_logo_base64 = logoaudiometria.grafica_base64;
            }
        }

        // 🔥 ACTUALIZAR los datos con las imágenes convertidas
        datosExamen.cita.examenes = { audiometria, logoaudiometria };
        if (audiometria) datosExamen.cita.examenes.audiometria = audiometria;
        if (logoaudiometria) datosExamen.cita.examenes.logoaudiometria = logoaudiometria;

        const ventanaDetalles = new BrowserWindow({
            width: 1100,
            height: 850,
            fullscreen: true,
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

        ventanaDetalles.setTitle(tipo.nombre);
        ventanaDetalles.loadFile(`renderer/${tipo.panel_html}`);

        ventanaDetalles.once('ready-to-show', () => {
            ventanaDetalles.show();
            ventanaDetalles.webContents.send('cargar-detalles', datosExamen);
        });

    } catch (error) {
        console.error('❌ Error al abrir ventana de detalles:', error);
    }
});


/* main.js - REEMPLAZAR el handler existente por este

ipcMain.on('abrir-ventana-detalles', async (event, datosExamen) => {
    const cita = datosExamen.cita || {};
    const tipoId = cita.tipo_atencion_id;  // ← AHORA USA EL ID

    if (!tipoId) {
        console.error('❌ La cita no tiene tipo_atencion_id');
        return;
    }

    try {
        const tipo = await ServicioTiposAtencion.obtenerPorId(tipoId);

        if (!tipo) {
            console.error(`❌ No se encontró el tipo de atención con ID: ${tipoId}`);
            return;
        }

        console.log(`📄 [ROUTING] tipo_id=${tipoId} (${tipo.nombre}) → ${tipo.panel_html}`);

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

        ventanaDetalles.setTitle(tipo.nombre);
        ventanaDetalles.loadFile(`renderer/${tipo.panel_html}`);

        ventanaDetalles.once('ready-to-show', () => {
            ventanaDetalles.show();
            ventanaDetalles.webContents.send('cargar-detalles', datosExamen);
        });

    } catch (error) {
        console.error('❌ Error al abrir ventana de detalles:', error);
    }
});


*/

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


const initDB = require('./db/init');
const { crearUsuario, loginUsuario, obtenerUsuarios, actualizarRol } = require('./db/usuarios');
const { crearPaciente, obtenerPacientes } = require('./db/pacientes');
const { crearCita, obtenerCitasPendientes, obtenerCitaPorId, actualizarEstadoCita, obtenerCitasPorPaciente, obtenerTodasLasCitas } = require('./db/citas');

const { obtenerCitasConDetalles, obtenerCitasPorMes, obtenerEstadisticasPorEntidad } = require('./db/reportes');
const { obtenerCitasConEstadoExamen, obtenerCitaConExamen } = require('./db/citas');
const { existeExamenPorCitaId } = require('./db/examenes_unificados');
const pdfRegeneratorService = require('./services/pdfRegeneratorService');
const cloudinaryService = require('./services/cloudinaryService');

const EnvioService = require('./services/EnvioService');
const ServicioTiposAtencion = require('./services/ServicioTiposAtencion');
const EstadisticasService = require('./services/EstadisticasService');



//const pdfViewerService = require('./services/pdfViewerService');
//const qrService = require('./services/qrService');
const pdfService = require('./services/pdfService');
const excelService = require('./services/excelService');

let mainWindow;
let usuarioActual = null;
let ventanaCitas = null;

//NUEVO---
// ============================================
// 🚀 CONFIGURACIÓN DEL AUTO-UPDATER
// ============================================

// Configurar logging para debugging
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'info';

// NO descargar automáticamente - queremos mostrar un modal primero
autoUpdater.autoDownload = false;

// Configurar el feed de actualizaciones (GitHub)
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'proyectosroserojuan',  // 🔴 REEMPLAZA con tu usuario de GitHub
  repo: 'suda-desktop-app',      // 🔴 REEMPLAZA con el nombre de tu repositorio
  private: false                // Cambia a true si tu repo es privado
});

// ============================================
// 🎯 EVENTOS DEL AUTO-UPDATER
// ============================================

// REEMPLAZA el evento update-available por esto:
autoUpdater.on('update-available', (info) => {
  console.log('🆕 Actualización disponible:', info.version);
  
  // ✅ Mostrar notificación NO BLOQUEANTE
  // (opcional: puedes mostrar un mensaje en la UI en lugar de un modal)
  
  // ✅ Descarga automática (sin preguntar)
  autoUpdater.downloadUpdate();
});

// Progreso de descarga
autoUpdater.on('download-progress', (progressObj) => {
  console.log(`⬇️ Descargando: ${progressObj.percent.toFixed(2)}%`);
});


autoUpdater.on('update-downloaded', (info) => {
  console.log('✅ Actualización descargada:', info.version);

  // ✅ Avisar al renderer que la descarga terminó de verdad
  if (mainWindow) {
    mainWindow.webContents.send('update-downloaded', info.version);
  }

  dialog.showMessageBox({
    type: 'info',
    title: '🔄 Actualización lista',
    message: 'La actualización se ha descargado correctamente.',
    detail: 'La aplicación se cerrará para instalar la actualización.',
    buttons: ['✅ Instalar ahora', '⏰ Más tarde'],
    defaultId: 0,
    cancelId: 1
  }).then((result) => {
    if (result.response === 0) {
      autoUpdater.quitAndInstall();  // ← CORRECTO (antes era app.quit())
    } else {
      console.log('⏰ Usuario eligió instalar después');
    }
  });
});


// Manejo de errores
autoUpdater.on('error', (err) => {
  console.error('❌ Error en auto-updater:', err);
});

// Función para verificar actualizaciones
function checkForUpdates() {
  console.log('🔍 Verificando actualizaciones...');
  autoUpdater.checkForUpdatesAndNotify();
}


//AQUI TERMINA



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

// ============================================
// 🔥 FUNCIÓN PARA CONVERTIR URL A BASE64
// ============================================
async function urlToBase64(url) {
    if (!url) return null;
    try {
        const https = require('https');
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Error HTTP: ${response.statusCode}`));
                    return;
                }
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    resolve(`data:image/png;base64,${buffer.toString('base64')}`);
                });
                response.on('error', reject);
            }).on('error', reject);
        });
    } catch (error) {
        console.error('⚠️ Error convirtiendo URL a base64:', error);
        return null;
    }
}

ipcMain.handle('obtener-reporte-estadisticas', async (event, mes, anio) => {
    try {
        const reporte = await EstadisticasService.obtenerReporteCompleto(mes, anio);
        return { ok: true, reporte };
    } catch (error) {
        console.error('❌ Error obteniendo reporte de estadísticas:', error);
        return { ok: false, error: error.message };
    }
});

// Obtener todos los tipos para selects
ipcMain.handle('obtener-tipos-atencion', async () => {
    try {
        const tipos = await ServicioTiposAtencion.obtenerParaSelect();
        return { ok: true, tipos };
    } catch (error) {
        console.error('❌ Error obteniendo tipos:', error);
        return { ok: false, error: error.message };
    }
});

// main.js - REEMPLAZAR COMPLETAMENTE ambos handlers

// REEMPLAZA el handler regenerar-pdf por este:

ipcMain.handle('regenerar-pdf', async (event, citaId) => {
    try {
        console.log('🔄 Regenerando PDF para cita:', citaId);

        const citasDB = require('./db/citas');
        const examenesDB = require('./db/examenes_unificados');
        
        const cita = await citasDB.obtenerCitaPorId(citaId);
        if (!cita) {
            throw new Error('No se encontró la cita');
        }

        console.log('📋 Cita:', cita.paciente_nombre, '| Tipo ID:', cita.tipo_atencion_id);

        // BUSCAR SOLO EN examenes_audiologicos
        const examen = await examenesDB.obtenerExamenPorCitaId(citaId);
        
        if (!examen) {
            throw new Error('No se encontró ningún examen guardado para esta cita');
        }

        let examenAudiometria = null;
        let examenLogoaudiometria = null;

  // ✅ Usar los flags clínicos de tipos_atencion, no el texto de tipo_examen
if (cita.requiere_audiometria) {
    examenAudiometria = examen;
}
if (cita.requiere_logoaudiometria) {
    examenLogoaudiometria = examen;
}

        const pdfRegeneratorService = require('./services/pdfRegeneratorService');
        const pdfPath = await pdfRegeneratorService.regenerarPDF(cita, examenAudiometria, examenLogoaudiometria);

        console.log('✅ PDF regenerado:', pdfPath);
        return { ok: true, pdfPath };

    } catch (error) {
        console.error('❌ Error regenerando PDF:', error);
        return { ok: false, error: error.message };
    }
});


// ============================================================
// HANDLER: generar-y-mostrar-pdf-sin-descargar (VERSIÓN CORREGIDA)
// ============================================================
ipcMain.handle('generar-y-mostrar-pdf-sin-descargar', async (event, citaId) => {
    try {
        console.log('🔄 Generando PDF para vista previa - Cita:', citaId);

        const citasDB = require('./db/citas');
        const examenesDB = require('./db/examenes_unificados');
        
        // 1️⃣ OBTENER LA CITA
        const cita = await citasDB.obtenerCitaPorId(citaId);
        if (!cita) {
            throw new Error('No se encontró la cita');
        }

        console.log('📋 Cita:', cita.paciente_nombre, '| Tipo ID:', cita.tipo_atencion_id);

        // 2️⃣ BUSCAR SOLO EN examenes_audiologicos (TABLA UNIFICADA)
        const examen = await examenesDB.obtenerExamenPorCitaId(citaId);
        
        if (!examen) {
            throw new Error('No se encontraron exámenes para esta cita');
        }

        console.log('📊 Examen encontrado, tipo:', examen.tipo_examen);

        // 3️⃣ DETERMINAR QUÉ TIPO DE EXAMEN ES
        let examenAudiometria = null;
        let examenLogoaudiometria = null;
// ✅ Usar los flags clínicos de tipos_atencion, no el texto de tipo_examen
if (cita.requiere_audiometria) {
    examenAudiometria = examen;
}
if (cita.requiere_logoaudiometria) {
    examenLogoaudiometria = examen;
}

        // 4️⃣ GENERAR PDF
        const pdfRegeneratorService = require('./services/pdfRegeneratorService');
        const pdfPath = await pdfRegeneratorService.regenerarPDF(cita, examenAudiometria, examenLogoaudiometria);

        // 5️⃣ MOSTRAR EN VENTANA
        await pdfRegeneratorService.mostrarPDFEnVentana(pdfPath, `Resultados - ${cita.paciente_nombre}`);

        console.log('✅ PDF mostrado en ventana');
        return { ok: true, pdfPath };

    } catch (error) {
        console.error('❌ Error generando PDF:', error);
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



// REEMPLAZA el handler obtener-examen-por-cita-id por este:

ipcMain.handle('obtener-examen-por-cita-id', async (event, citaId) => {
    try {
        console.log('=== BUSCANDO EXAMEN PARA CITA (SOLO TABLA UNIFICADA):', citaId);
        
        const { obtenerExamenPorCitaId } = require('./db/examenes_unificados');
        const examen = await obtenerExamenPorCitaId(citaId);
        
        if (examen) {
            console.log('✅ Encontrado en examenes_audiologicos');
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
    show: false, 
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
    mainWindow.maximize();
    mainWindow.focus();
  });

  mainWindow.setTitle('BIENVENIDO A S.U.D.A SISTEMA CLINICO DE UNIDAD DIAGNOSTICA AUDITIVA');
  mainWindow.loadFile('renderer/login.html');
}


  // ✅ Verificar actualizaciones al iniciar (3 segundos después)
  setTimeout(() => {
    checkForUpdates();
  }, 3000);

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

ipcMain.handle('borrar-resultados-examen', async (event, citaId) => {
    try {
        const examenesDB = require('./db/examenes_unificados');
        const citasDB = require('./db/citas');

        const resultado = await examenesDB.eliminarExamenPorCitaId(citaId);
        if (!resultado.deleted) {
            return { ok: false, error: 'No se encontró ningún examen para esta cita' };
        }

        // La cita vuelve a quedar pendiente
        await citasDB.actualizarEstadoCita(citaId, 'pendiente');

        return { ok: true };
    } catch (error) {
        console.error('❌ Error borrando resultados de examen:', error);
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

// ✅ Evento para forzar descarga desde el renderer
ipcMain.on('force-download-update', () => {
  console.log('⬇️ Forzando descarga desde el renderer...');
  autoUpdater.downloadUpdate();
});

setInterval(() => {
  checkForUpdates();
}, 10 * 1000); // ← 30 segundos

