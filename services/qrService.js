/* qrService.js - VERSIÓN OPTIMIZADA
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { BrowserWindow } = require('electron');

class QRService {
  constructor() {
    this.qrWindow = null;
    this.server = null;
    this.currentPdfPath = null;
    this.isServerReady = false;
    this.serverStartPromise = null;
    // NO iniciar el servidor automáticamente
  }

  // ✅ Iniciar servidor SOLO cuando se necesita
  async startServer() {
    if (this.server) {
      if (this.isServerReady) return;
      // Esperar si ya está iniciándose
      if (this.serverStartPromise) return this.serverStartPromise;
    }

    // Evitar iniciar múltiples veces
    if (this.serverStartPromise) {
      return this.serverStartPromise;
    }

    this.serverStartPromise = new Promise((resolve, reject) => {
      try {
        this.server = http.createServer((req, res) => {
          if (req.url === '/current.pdf' && this.currentPdfPath && fs.existsSync(this.currentPdfPath)) {
            try {
              const pdfBuffer = fs.readFileSync(this.currentPdfPath);
              res.writeHead(200, {
                'Content-Type': 'application/pdf',
                'Content-Length': pdfBuffer.length,
                'Access-Control-Allow-Origin': '*'
              });
              res.end(pdfBuffer);
            } catch (err) {
              res.writeHead(500);
              res.end('Error al leer PDF');
            }
          } else {
            res.writeHead(404);
            res.end('PDF no disponible');
          }
        });

        // ✅ Manejar errores del servidor
        this.server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.warn('⚠️ Puerto 4321 en uso, intentando con otro...');
            // Intentar con otro puerto
            this.server.listen(0, '0.0.0.0', () => {
              const port = this.server.address().port;
              console.log(`📄 Servidor QR iniciado en puerto ${port}`);
              this.isServerReady = true;
              resolve();
            });
          } else {
            console.error('❌ Error en servidor QR:', err);
            reject(err);
          }
        });

        // ✅ Timeout para no bloquear
        const timeout = setTimeout(() => {
          if (!this.isServerReady) {
            console.warn('⚠️ Timeout iniciando servidor QR');
            resolve(); // No fallar, solo continuar
          }
        }, 3000);

        this.server.listen(4321, '0.0.0.0', () => {
          clearTimeout(timeout);
          const port = this.server.address().port;
          console.log(`📄 Servidor QR iniciado en puerto ${port}`);
          this.isServerReady = true;
          resolve();
        });

      } catch (error) {
        console.warn('⚠️ No se pudo iniciar servidor QR:', error.message);
        this.serverStartPromise = null;
        resolve(); // No fallar la app
      }
    });

    return this.serverStartPromise;
  }

  getLocalIp() {
    try {
      const { networkInterfaces } = require('os');
      const nets = networkInterfaces();
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            return net.address;
          }
        }
      }
      return 'localhost';
    } catch (error) {
      return 'localhost';
    }
  }

  async generarYMostrarQR(datosCita, examenData, entidad, tipoExamen) {
    // ✅ Asegurar que el servidor está iniciado
    await this.startServer();
    
    try {
      console.log('\n========== QRService.generarYMostrarQR ==========');
      console.log('📌 datosCita recibido:', JSON.stringify(datosCita, null, 2));
      console.log('📌 examenData recibido:', examenData ? 'SÍ (objeto)' : 'NO');
      console.log('📌 entidad:', entidad);
      console.log('📌 tipoExamen:', tipoExamen);
      
      let pdfPath = null;
      
      const entidadNombre = (entidad || '').toLowerCase();
      const usarCoosalud = entidadNombre === 'coosalud' || entidadNombre.includes('coosalud');
      
      // ✅ DETECTAR SI ES EXAMEN COMBINADO
      const esCombinado = datosCita.motivo && 
          datosCita.motivo.includes('Audiometria Tonal y Logoadiometria');
      
      console.log('\n🔍 DETECCIÓN DE EXAMEN COMBINADO:', esCombinado);
      
      // ✅ Cargar generadores solo cuando se necesitan (lazy loading)
      if (esCombinado) {
        console.log('\n✅ ES EXAMEN COMBINADO - Buscando ambos exámenes...');
        
        try {
          // IMPORTAR DINÁMICAMENTE
          const { obtenerExamenesPorCitaYtipo } = require('./db/examenes_unificados');
          
          console.log(`   - Buscando audiometría para cita ID: ${datosCita.id}`);
          const audiometriaData = await obtenerExamenesPorCitaYtipo(datosCita.id, 'audiometria');
          
          console.log(`   - Buscando logoaudiometría para cita ID: ${datosCita.id}`);
          const logoaudiometriaData = await obtenerExamenesPorCitaYtipo(datosCita.id, 'logoaudiometria');
          
          if (audiometriaData && logoaudiometriaData) {
            console.log('\n🎉 AMBOS EXÁMENES ENCONTRADOS - Generando PDF combinado...');
            
            if (usarCoosalud) {
              const pdfGeneratorCoosaludUnified = require('./pdfGeneratorCoosaludUnified');
              pdfPath = await pdfGeneratorCoosaludUnified.generarPDFCombinadoCOO(
                audiometriaData, 
                logoaudiometriaData, 
                entidad
              );
            } else {
              const pdfGeneratorUnified = require('./pdfGeneratorUnified');
              pdfPath = await pdfGeneratorUnified.generarPDFCombinado(
                audiometriaData, 
                logoaudiometriaData, 
                entidad
              );
            }
          } else {
            console.warn('\n⚠️ No se encontraron ambos exámenes');
            // Fallback a examen individual
            if (audiometriaData) {
              if (usarCoosalud) {
                const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
                pdfPath = await pdfGeneratorCoosalud.generarPDFAudiometria(audiometriaData, entidad);
              } else {
                const pdfGenerator = require('./pdfGenerator');
                pdfPath = await pdfGenerator.generarPDFAudiometria(audiometriaData, entidad);
              }
            } else if (logoaudiometriaData) {
              if (usarCoosalud) {
                const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
                pdfPath = await pdfGeneratorCoosalud.generarPDF(logoaudiometriaData, entidad);
              } else {
                const pdfGenerator = require('./pdfGenerator');
                pdfPath = await pdfGenerator.generarPDF(logoaudiometriaData, entidad, 'logoaudiometria');
              }
            } else {
              throw new Error('No se encontró ningún examen para generar PDF');
            }
          }
        } catch (dbError) {
          console.error('❌ Error al buscar exámenes en BD:', dbError);
          throw dbError;
        }
      } else {
        console.log('\n📌 ES EXAMEN NORMAL (no combinado)');
        
        if (tipoExamen === 'logoaudiometria') {
          console.log('   - Generando LOGOAUDIOMETRÍA');
          if (usarCoosalud) {
            const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
            pdfPath = await pdfGeneratorCoosalud.generarPDF(examenData || datosCita, entidad);
          } else {
            const pdfGenerator = require('./pdfGenerator');
            pdfPath = await pdfGenerator.generarPDF(examenData || datosCita, entidad, 'logoaudiometria');
          }
        } else {
          console.log('   - Generando AUDIOMETRÍA');
          if (usarCoosalud) {
            const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
            pdfPath = await pdfGeneratorCoosalud.generarPDFAudiometria(examenData || datosCita, entidad);
          } else {
            const pdfGenerator = require('./pdfGenerator');
            pdfPath = await pdfGenerator.generarPDFAudiometria(examenData || datosCita, entidad);
          }
        }
      }
      
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        console.error('❌ PDF no generado o archivo no existe:', pdfPath);
        throw new Error('No se pudo generar el PDF');
      }
      
      console.log('\n✅ PDF generado exitosamente:', pdfPath);
      
      this.currentPdfPath = pdfPath;
      const localIp = this.getLocalIp();
      const port = this.server.address().port || 4321;
      const pdfUrl = `http://${localIp}:${port}/current.pdf`;
      
      console.log('🌐 URL del PDF:', pdfUrl);
      
      const qrDataURL = await QRCode.toDataURL(pdfUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 250
      });
      
      console.log('📱 QR generado, longitud:', qrDataURL.length);
      
      this.mostrarVentanaQR(qrDataURL, datosCita, pdfUrl);
      
      console.log('========== FIN QRService ==========\n');
      return { ok: true };
      
    } catch (error) {
      console.error('❌ ERROR en generarYMostrarQR:', error);
      console.error('Stack trace:', error.stack);
      throw error;
    }
  }

  mostrarVentanaQR(qrDataURL, datosCita, pdfUrl) {
    if (this.qrWindow && !this.qrWindow.isDestroyed()) {
      this.qrWindow.close();
    }

    this.qrWindow = new BrowserWindow({
      width: 450,
      height: 600,
      show: true,
      frame: true,
      resizable: false,
      modal: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const paciente = datosCita.paciente || datosCita;
    const fechaCita = datosCita.fecha_cita || new Date().toLocaleDateString('es-ES');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>QR - Certificado Médico</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            background: #f0f2f5;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
          }
          .qr-container {
            background: white;
            border-radius: 20px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            max-width: 400px;
            width: 100%;
          }
          .logo {
            font-size: 22px;
            font-weight: bold;
            color: #001e81;
            margin-bottom: 15px;
          }
          .logo span {
            font-size: 11px;
            color: #475569;
            display: block;
          }
          .qr-code {
            background: white;
            padding: 10px;
            border-radius: 16px;
            margin: 10px 0;
          }
          .qr-code img {
            width: 220px;
            height: 220px;
            display: block;
            margin: 0 auto;
          }
          .info {
            text-align: left;
            margin: 15px 0;
            padding: 12px;
            background: #f8fafc;
            border-radius: 12px;
          }
          .info p {
            margin: 8px 0;
            font-size: 13px;
          }
          .info strong {
            color: #1e3a8a;
            min-width: 70px;
            display: inline-block;
          }
          .note {
            font-size: 11px;
            color: #475569;
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
          }
          .url-box {
            background: #f1f5f9;
            padding: 8px;
            border-radius: 8px;
            font-size: 10px;
            word-break: break-all;
            margin-top: 10px;
            color: #334155;
          }
          .btn-cerrar {
            background: #1e3a8a;
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 30px;
            cursor: pointer;
            font-weight: 600;
            margin-top: 12px;
          }
          .btn-cerrar:hover {
            background: #0f2b4d;
          }
        </style>
      </head>
      <body>
        <div class="qr-container">
          <div class="logo">
             Resultado
            <span>Especialistas en Audición</span>
          </div>
          
          <div class="qr-code">
            <img src="${qrDataURL}" alt="Código QR">
          </div>
          
          <div class="info">
            <p><strong>Paciente:</strong> ${paciente.nombre || 'No especificado'}</p>
            <p><strong>Cédula:</strong> ${paciente.documento || 'No especificada'}</p>
            <p><strong>Fecha cita:</strong> ${fechaCita}</p>
          </div>
          
          <div class="note">
            📱 Escanea este código QR con tu teléfono<br>
            El certificado se abrirá automáticamente
          </div>
          
          <div class="url-box">
            🔗 ${pdfUrl}
          </div>
          
          <button class="btn-cerrar" onclick="window.close()">Cerrar</button>
        </div>
      </html>
    `;

    this.qrWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    
    this.qrWindow.on('closed', () => {
      this.qrWindow = null;
    });
  }

  cerrarVentanaQR() {
    if (this.qrWindow && !this.qrWindow.isDestroyed()) {
      this.qrWindow.close();
      this.qrWindow = null;
    }
  }

  // ✅ Cerrar servidor al salir
  close() {
    if (this.server) {
      this.server.close(() => {
        console.log('📄 Servidor QR cerrado');
      });
      this.server = null;
      this.isServerReady = false;
      this.serverStartPromise = null;
    }
  }
}

// ✅ Exportar una instancia única
module.exports = new QRService();

*/