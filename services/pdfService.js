// services/pdfService.js - VERSIÓN COMPLETA CORREGIDA

const { BrowserWindow, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const PDFDocument = require('pdfkit');

class PDFService {
  constructor() {
    this.pdfWindow = null;
    
    // ✅ USAR CARPETA TEMPORAL DE WINDOWS
    const tempFolder = process.env.TEMP || process.env.TMP || os.tmpdir();
    this.tempDir = path.join(tempFolder, 'audiometria_pdfs');
    
    // ✅ CREAR DIRECTORIO SEGURO
    this.crearDirectorioSeguro();
    
    console.log('✅ PDFService inicializado');
    console.log('📁 Directorio temporal:', this.tempDir);
  }

  crearDirectorioSeguro() {
    try {
      // Verificar si existe la carpeta
      if (fs.existsSync(this.tempDir)) {
        const stats = fs.statSync(this.tempDir);
        if (!stats.isDirectory()) {
          // Si es un archivo, renombrarlo
          const backupPath = `${this.tempDir}.backup_${Date.now()}`;
          fs.renameSync(this.tempDir, backupPath);
          console.log(`⚠️ Archivo renombrado a: ${backupPath}`);
        }
      }
      
      // Crear el directorio
      if (!fs.existsSync(this.tempDir)) {
        fs.mkdirSync(this.tempDir, { recursive: true });
        console.log(`✅ Directorio creado: ${this.tempDir}`);
      }
      
    } catch (error) {
      console.error('❌ Error creando directorio:', error);
      // Fallback a carpeta del usuario
      this.tempDir = path.join(os.homedir(), 'audiometria_pdfs');
      try {
        if (!fs.existsSync(this.tempDir)) {
          fs.mkdirSync(this.tempDir, { recursive: true });
        }
        console.log(`📁 Usando directorio alternativo: ${this.tempDir}`);
      } catch (e) {
        console.error('❌ Error crítico:', e);
        this.tempDir = process.cwd();
      }
    }
  }

  // ============================================
  // MÉTODO PRINCIPAL - GENERAR Y MOSTRAR PDF
  // ============================================
  async generarYMostrarPDF(datos, entidad = null, tipo = 'logoaudiometria') {
    try {
      console.log('\n========== PDFService.generarYMostrarPDF ==========');
      console.log('📌 Tipo:', tipo);
      console.log('📌 Entidad:', entidad);
      console.log('📌 Datos recibidos:', datos ? 'SÍ' : 'NO');
      
      let pdfPath = null;

      // ✅ DETERMINAR QUÉ TIPO DE PDF GENERAR
      if (tipo === 'reporte_citas') {
        console.log('📊 Generando REPORTE DE CITAS...');
        pdfPath = await this.generarReporteCitasPDF(datos);
      } else if (tipo === 'combinado' || (datos && datos.audiometria && datos.logoaudiometria)) {
        console.log('📄 Generando PDF COMBINADO...');
        pdfPath = await this.generarPDFCombinado(datos, entidad);
      } else if (tipo === 'logoaudiometria') {
        console.log('📄 Generando LOGOAUDIOMETRÍA...');
        pdfPath = await this.generarPDFLogoaudiometria(datos, entidad);
      } else {
        console.log('📄 Generando AUDIOMETRÍA...');
        pdfPath = await this.generarPDFAudiometria(datos, entidad);
      }

      // ✅ VERIFICAR QUE EL PDF SE GENERÓ
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw new Error('No se pudo generar el PDF');
      }

      console.log('✅ PDF generado exitosamente:', pdfPath);
      console.log('📄 Tamaño:', fs.statSync(pdfPath).size, 'bytes');

      // ✅ ABRIR EL PDF EN EL VISOR DEL SISTEMA
      await shell.openPath(pdfPath);
      
      return { ok: true, pdfPath };

    } catch (error) {
      console.error('❌ Error en generarYMostrarPDF:', error);
      return { ok: false, error: error.message };
    }
  }

  // ============================================
  // GENERAR REPORTE DE CITAS
  // ============================================
// ============================================
// GENERAR REPORTE DE CITAS - CON CABEZAL Y FOOTER
// ============================================
async generarReporteCitasPDF(datos) {
  return new Promise((resolve, reject) => {
    try {
      // ==========================================
      // 1. RUTA Y CONFIGURACIÓN BÁSICA
      // ==========================================
      const filename = `reporte_citas_${Date.now()}.pdf`;
      const filepath = path.join(this.tempDir, filename);
      
      // ==========================================
      // 2. CARGAR IMÁGENES DEL CABEZAL Y FOOTER
      // ==========================================
      const imagesPath = path.join(__dirname, '../assets/images');
      let headerBase64 = null;
      let footerBase64 = null;
      
      // Probar imágenes del cabezal
      const headerFiles = ['header_uda.jpeg', 'header_uda.jpg', 'header_uda.png'];
      for (const file of headerFiles) {
        const testPath = path.join(imagesPath, file);
        if (fs.existsSync(testPath)) {
          try {
            const buffer = fs.readFileSync(testPath);
            const ext = path.extname(file).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            headerBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
            console.log('✅ Cabezal cargado:', file);
            break;
          } catch (e) { console.warn('⚠️ Error cargando cabezal:', e.message); }
        }
      }
      
      // Probar imágenes del footer
      const footerFiles = ['footer_uda.jpeg', 'footer_uda.jpg', 'footer_uda.png'];
      for (const file of footerFiles) {
        const testPath = path.join(imagesPath, file);
        if (fs.existsSync(testPath)) {
          try {
            const buffer = fs.readFileSync(testPath);
            const ext = path.extname(file).toLowerCase();
            const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
            footerBase64 = `data:${mimeType};base64,${buffer.toString('base64')}`;
            console.log('✅ Footer cargado:', file);
            break;
          } catch (e) { console.warn('⚠️ Error cargando footer:', e.message); }
        }
      }

      // ==========================================
      // 3. GENERAR HTML CON CABEZAL Y FOOTER
      // ==========================================
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const nombreMes = meses[datos.mes] || '';
      
      // CONSTANTES DE ESTADOS (sin emojis para evitar símbolos extraños)
      const estadoLabels = {
        pendiente: 'Pendiente',
        atendida: 'Atendida',
        cancelada: 'Cancelada',
        no_asistio: 'No asistio'
      };
      
      const estadoColors = {
        pendiente: '#d97706',
        atendida: '#bbff00',
        cancelada: '#dc2626',
        no_asistio: '#000000'
      };
      
      // Estado icons (con HTML entities seguros)
      const estadoIcons = {
        pendiente: '&#9202;',  // 
        atendida: '&#9989;',   // 
        cancelada: '&#10060;', // 
        no_asistio: '&#128683;' // 
      };

      // ==========================================
      // 4. CONSTRUIR HTML COMPLETO
      // ==========================================
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte de Citas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: white;
      padding: 0;
      margin: 0;
      font-size: 12px;
      color: #1f2937;
    }
    
    /* ===== CABEZAL ===== */
    .header {
      width: 100%;
      text-align: center;
      margin-bottom: 10px;
    }
    .header img {
      width: 100%;
      max-height: 100px;
      object-fit: contain;
    }
    
    /* ===== CONTENIDO PRINCIPAL ===== */
    .contenido {
      padding: 20px 40px 80px 40px;
      min-height: 700px;
    }
    
    /* ===== TÍTULOS ===== */
    .titulo-principal {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      color: #001e81;
      margin-bottom: 2px;
      letter-spacing: 1px;
    }
    .subtitulo-mes {
      text-align: center;
      font-size: 14px;
      color: #475569;
      margin-bottom: 15px;
    }
    .total-citas {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 20px;
      background: #f0f4ff;
      padding: 8px;
      border-radius: 8px;
    }
    
    /* ===== SECCIÓN ===== */
    .seccion {
      margin-bottom: 20px;
    }
    .seccion-titulo {
      font-size: 14px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 4px;
    }
    
    /* ===== TABLA DE ENTIDADES ===== */
    .tabla-entidades {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 4px;
    }
    .tabla-entidades th {
      background: #2563eb;
      color: white;
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
    }
    .tabla-entidades td {
      padding: 6px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .tabla-entidades tr:nth-child(even) {
      background: #f8fafc;
    }
    .tabla-entidades tr:hover {
      background: #f1f5f9;
    }
    .tabla-entidades .col-cantidad {
      text-align: center;
      font-weight: 600;
    }
    
    /* ===== ESTADOS (GRID) ===== */
    .estados-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-top: 6px;
    }
    .estado-card {
      background: #f8fafc;
      border-radius: 8px;
      padding: 12px 8px;
      text-align: center;
      border: 1px solid #e5e7eb;
    }
    .estado-card .cantidad {
      font-size: 22px;
      font-weight: 700;
    }
    .estado-card .label {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }
    .estado-card .icono {
      font-size: 18px;
    }
    
    /* Colores por estado */
    .estado-pendiente .cantidad { color: #d97706; }
    .estado-pendiente { border-left: 4px solid #d97706; }
    .estado-atendida .cantidad { color: #059669; }
    .estado-atendida { border-left: 4px solid #059669; }
    .estado-cancelada .cantidad { color: #dc2626; }
    .estado-cancelada { border-left: 4px solid #dc2626; }
    .estado-no_asistio .cantidad { color: #6b7280; }
    .estado-no_asistio { border-left: 4px solid #6b7280; }
    
    /* ===== FOOTER FIJO ===== */
    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      width: 100%;
      text-align: center;
      z-index: 1000;
    }
    .footer img {
      width: 100%;
      max-height: 80px;
      object-fit: contain;
    }
    .footer-texto {
      position: fixed;
      bottom: 8px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8px;
      color: #94a3b8;
      z-index: 1001;
      background: white;
      padding: 2px 0;
    }
    
    /* ===== RESPONSIVE ===== */
    @media print {
      body { margin: 0; padding: 0; }
      .footer { position: fixed; bottom: 0; }
      .footer-texto { position: fixed; bottom: 5px; }
      .contenido { padding-bottom: 70px; }
    }
    
    /* ===== SIN DATOS ===== */
    .sin-datos {
      text-align: center;
      color: #6b7280;
      padding: 20px;
      font-size: 13px;
    }
  </style>
</head>
<body>

  <!-- ===== CABEZAL ===== -->
  ${headerBase64 ? `<div class="header"><img src="${headerBase64}" alt="Cabezal"></div>` : ''}

  <!-- ===== CONTENIDO ===== -->
  <div class="contenido">
    
    <div class="titulo-principal">REPORTE DE CITAS</div>
    <div class="subtitulo-mes">${nombreMes} ${datos.año}</div>
    <div class="total-citas">Total de citas: ${datos.total}</div>
    
    <!-- SECCIÓN: ESTADOS -->
    <div class="seccion">
      <div class="seccion-titulo">&#128203; Citas por Estado</div>
      <div class="estados-grid">
        ${Object.entries(datos.porEstado || {}).map(([estado, cantidad]) => `
          <div class="estado-card estado-${estado}">
            <div class="icono">${estadoIcons[estado] || ''}</div>
            <div class="cantidad">${cantidad}</div>
            <div class="label">${estadoLabels[estado] || estado}</div>
          </div>
        `).join('')}
      </div>
    </div>
    
    <!-- SECCIÓN: ENTIDADES -->
    <div class="seccion">
      <div class="seccion-titulo">&#127970; Citas por Entidad</div>
      ${datos.porEntidad && datos.porEntidad.length > 0 ? `
        <table class="tabla-entidades">
          <thead>
            <tr>
              <th>Entidad</th>
              <th style="text-align:center; width:100px;">Cantidad</th>
            </tr>
          </thead>
          <tbody>
            ${datos.porEntidad.map(item => `
              <tr>
                <td>${item.nombre || 'Sin entidad'}</td>
                <td class="col-cantidad">${item.cantidad || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : `
        <div class="sin-datos">No hay citas registradas en este mes</div>
      `}
    </div>
    
    <!-- FECHA DE GENERACIÓN -->
    <div style="text-align:center; margin-top:30px; font-size:9px; color:#94a3b8;">
      Reporte generado automáticamente por S.U.D.A Sistema Clinico
      <br>
      Fecha de generacion: ${new Date().toLocaleDateString('es-ES')}
    </div>
    
  </div>

  <!-- ===== FOOTER ===== -->
  ${footerBase64 ? `<div class="footer"><img src="${footerBase64}" alt="Footer"></div>` : ''}
  <div class="footer-texto">Sistema U.D.A - Clinica Auditiva</div>

</body>
</html>
      `;

      // ==========================================
      // 5. GENERAR PDF CON ELECTRON
      // ==========================================
      const { BrowserWindow } = require('electron');
      
      const win = new BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      console.log('📄 Generando PDF con HTML...');
      
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      setTimeout(async () => {
        try {
          const pdfData = await win.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            landscape: false,
            margins: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0
            }
          });
          
          fs.writeFileSync(filepath, pdfData);
          win.close();
          
          console.log('✅ Reporte PDF generado con cabezal y footer:', filepath);
          resolve(filepath);
          
        } catch (error) {
          console.error('❌ Error generando PDF:', error);
          win.close();
          reject(error);
        }
      }, 2000);

    } catch (error) {
      console.error('❌ Error en generarReporteCitasPDF:', error);
      reject(error);
    }
  });
}
  // ============================================
  // GENERAR PDF DE AUDIOMETRÍA
  // ============================================
  async generarPDFAudiometria(datos, entidad) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `audiometria_${Date.now()}.pdf`;
        const filepath = path.join(this.tempDir, filename);
        
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        doc.fontSize(18)
           .font('Helvetica-Bold')
           .fillColor('#001e81')
           .text('RESULTADO DE AUDIOMETRÍA', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#475569')
           .text(`Paciente: ${datos.paciente_nombre || 'No especificado'}`, { align: 'center' });
        doc.text(`Documento: ${datos.documento || 'No especificado'}`, { align: 'center' });
        doc.text(`Entidad: ${entidad || 'No especificada'}`, { align: 'center' });
        
        doc.moveDown(1);

        doc.strokeColor('#e2e8f0')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(1);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Resultados:');
        
        doc.moveDown(0.5);

        const startX = 50;
        let yPos = doc.y;
        
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#ffffff')
           .rect(startX, yPos, 250, 22)
           .fill('#2563eb');
        doc.fillColor('#ffffff')
           .text('OD (Oído Derecho)', startX + 10, yPos + 5);
        
        doc.fillColor('#ffffff')
           .rect(startX + 250, yPos, 250, 22)
           .fill('#3b82f6');
        doc.text('OI (Oído Izquierdo)', startX + 260, yPos + 5);
        
        yPos += 22;

        const valoresOD = datos.valores_od || [];
        const valoresOI = datos.valores_oi || [];
        const maxRows = Math.max(valoresOD.length, valoresOI.length, 5);

        for (let i = 0; i < maxRows; i++) {
          const bgColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
          
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor('#1f2937')
             .rect(startX, yPos, 250, 20)
             .fill(bgColor);
          doc.text(valoresOD[i] || '-', startX + 10, yPos + 3);
          
          doc.rect(startX + 250, yPos, 250, 20)
             .fill(bgColor);
          doc.text(valoresOI[i] || '-', startX + 260, yPos + 3);
          
          yPos += 20;
        }

        if (datos.diagnostico) {
          doc.moveDown(1);
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#1f2937')
             .text('Diagnóstico:');
          
          doc.font('Helvetica')
             .fontSize(11)
             .fillColor('#475569')
             .text(datos.diagnostico);
        }

        doc.moveDown(2);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#94a3b8')
           .text('Documento generado automáticamente por S.U.D.A Sistema Clínico', { align: 'center' });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log('✅ Audiometría PDF generada:', filepath);
          resolve(filepath);
        });

        stream.on('error', (error) => {
          console.error('❌ Error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error:', error);
        reject(error);
      }
    });
  }

  // ============================================
  // GENERAR PDF DE LOGOAUDIOMETRÍA
  // ============================================
  async generarPDFLogoaudiometria(datos, entidad) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `logoaudiometria_${Date.now()}.pdf`;
        const filepath = path.join(this.tempDir, filename);
        
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        doc.fontSize(18)
           .font('Helvetica-Bold')
           .fillColor('#001e81')
           .text('RESULTADO DE LOGOAUDIOMETRÍA', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#475569')
           .text(`Paciente: ${datos.paciente_nombre || 'No especificado'}`, { align: 'center' });
        doc.text(`Documento: ${datos.documento || 'No especificado'}`, { align: 'center' });
        doc.text(`Entidad: ${entidad || 'No especificada'}`, { align: 'center' });
        
        doc.moveDown(1);

        doc.strokeColor('#e2e8f0')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(1);

        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Resultados:');
        
        doc.moveDown(0.5);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('Porcentaje de Discriminación:');
        
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#1f2937');
        
        if (datos.porcentaje_discriminacion_od !== undefined) {
          doc.text(`OD (Oído Derecho): ${datos.porcentaje_discriminacion_od}%`);
        }
        if (datos.porcentaje_discriminacion_oi !== undefined) {
          doc.text(`OI (Oído Izquierdo): ${datos.porcentaje_discriminacion_oi}%`);
        }

        doc.moveDown(1);

        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('Umbrales de Recepción:');
        
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#1f2937');
        
        if (datos.umbral_recepcion_od !== undefined) {
          doc.text(`OD: ${datos.umbral_recepcion_od} dB`);
        }
        if (datos.umbral_recepcion_oi !== undefined) {
          doc.text(`OI: ${datos.umbral_recepcion_oi} dB`);
        }

        doc.moveDown(1);

        if (datos.diagnostico_od || datos.diagnostico_oi) {
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .fillColor('#1f2937')
             .text('Diagnóstico:');
          
          doc.font('Helvetica')
             .fontSize(11)
             .fillColor('#475569');
          
          if (datos.diagnostico_od) {
            doc.text(`OD: ${datos.diagnostico_od}`);
          }
          if (datos.diagnostico_oi) {
            doc.text(`OI: ${datos.diagnostico_oi}`);
          }
        }

        doc.moveDown(2);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#94a3b8')
           .text('Documento generado automáticamente por S.U.D.A Sistema Clínico', { align: 'center' });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log('✅ Logoaudiometría PDF generada:', filepath);
          resolve(filepath);
        });

        stream.on('error', (error) => {
          console.error('❌ Error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error:', error);
        reject(error);
      }
    });
  }

  // ============================================
  // GENERAR PDF COMBINADO
  // ============================================
  async generarPDFCombinado(datos, entidad) {
    return new Promise((resolve, reject) => {
      try {
        const filename = `combinado_${Date.now()}.pdf`;
        const filepath = path.join(this.tempDir, filename);
        
        const doc = new PDFDocument({ 
          margin: 50,
          size: 'A4'
        });
        
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        doc.fontSize(20)
           .font('Helvetica-Bold')
           .fillColor('#001e81')
           .text('EXAMEN AUDIOLÓGICO COMPLETO', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(12)
           .font('Helvetica')
           .fillColor('#475569')
           .text(`Paciente: ${datos.paciente_nombre || 'No especificado'}`, { align: 'center' });
        doc.text(`Documento: ${datos.documento || 'No especificado'}`, { align: 'center' });
        doc.text(`Entidad: ${entidad || 'No especificada'}`, { align: 'center' });
        
        doc.moveDown(1);

        doc.strokeColor('#e2e8f0')
           .lineWidth(1)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(1);

        // SECCIÓN AUDIOMETRÍA
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('AUDIOMETRÍA', { align: 'center' });
        
        doc.moveDown(0.5);

        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Resultados:');
        
        const startX = 50;
        let yPos = doc.y;
        
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .fillColor('#ffffff')
           .rect(startX, yPos, 250, 20)
           .fill('#3b82f6');
        doc.fillColor('#ffffff')
           .text('OD (Oído Derecho)', startX + 10, yPos + 4);
        
        doc.fillColor('#ffffff')
           .rect(startX + 250, yPos, 250, 20)
           .fill('#60a5fa');
        doc.text('OI (Oído Izquierdo)', startX + 260, yPos + 4);
        
        yPos += 20;

        const audiometria = datos.audiometria || datos;
        const valoresOD = audiometria.valores_od || [];
        const valoresOI = audiometria.valores_oi || [];
        const maxRows = Math.max(valoresOD.length, valoresOI.length, 5);

        for (let i = 0; i < maxRows; i++) {
          const bgColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
          
          doc.font('Helvetica')
             .fontSize(10)
             .fillColor('#1f2937')
             .rect(startX, yPos, 250, 18)
             .fill(bgColor);
          doc.text(valoresOD[i] || '-', startX + 10, yPos + 3);
          
          doc.rect(startX + 250, yPos, 250, 18)
             .fill(bgColor);
          doc.text(valoresOI[i] || '-', startX + 260, yPos + 3);
          
          yPos += 18;
        }

        // SECCIÓN LOGOAUDIOMETRÍA
        doc.moveDown(1);
        doc.fontSize(14)
           .font('Helvetica-Bold')
           .fillColor('#2563eb')
           .text('LOGOAUDIOMETRÍA', { align: 'center' });
        
        doc.moveDown(0.5);

        const logoaudiometria = datos.logoaudiometria || datos;
        
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Porcentaje de Discriminación:');
        
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#475569');
        
        if (logoaudiometria.porcentaje_discriminacion_od !== undefined) {
          doc.text(`OD: ${logoaudiometria.porcentaje_discriminacion_od}%`);
        }
        if (logoaudiometria.porcentaje_discriminacion_oi !== undefined) {
          doc.text(`OI: ${logoaudiometria.porcentaje_discriminacion_oi}%`);
        }

        doc.moveDown(0.5);
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Umbrales de Recepción:');
        
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor('#475569');
        
        if (logoaudiometria.umbral_recepcion_od !== undefined) {
          doc.text(`OD: ${logoaudiometria.umbral_recepcion_od} dB`);
        }
        if (logoaudiometria.umbral_recepcion_oi !== undefined) {
          doc.text(`OI: ${logoaudiometria.umbral_recepcion_oi} dB`);
        }

        doc.moveDown(1);
        doc.fontSize(12)
           .font('Helvetica-Bold')
           .fillColor('#1f2937')
           .text('Diagnóstico:');
        
        doc.font('Helvetica')
           .fontSize(11)
           .fillColor('#475569');
        
        if (audiometria.diagnostico) {
          doc.text(`Audiometría: ${audiometria.diagnostico}`);
        }
        if (logoaudiometria.diagnostico_od || logoaudiometria.diagnostico_oi) {
          doc.text(`Logoaudiometría: ${logoaudiometria.diagnostico_od || ''} ${logoaudiometria.diagnostico_oi || ''}`);
        }

        doc.moveDown(2);
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor('#94a3b8')
           .text('Documento generado automáticamente por S.U.D.A Sistema Clínico', { align: 'center' });
        doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log('✅ PDF Combinado generado:', filepath);
          resolve(filepath);
        });

        stream.on('error', (error) => {
          console.error('❌ Error:', error);
          reject(error);
        });

      } catch (error) {
        console.error('❌ Error:', error);
        reject(error);
      }
    });
  }

  // ============================================
  // LIMPIAR ARCHIVOS TEMPORALES
  // ============================================
  limpiarTemp() {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      
      const files = fs.readdirSync(this.tempDir);
      const now = Date.now();
      let deleted = 0;

      files.forEach(file => {
        const filepath = path.join(this.tempDir, file);
        try {
          const stats = fs.statSync(filepath);
          if (stats.isFile() && now - stats.mtimeMs > 3600000) {
            fs.unlinkSync(filepath);
            deleted++;
          }
        } catch (e) {
          // Ignorar errores de archivos individuales
        }
      });

      if (deleted > 0) {
        console.log(`🧹 Limpiados ${deleted} archivos temporales`);
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando archivos temporales:', error.message);
    }
  }

  // ============================================
  // CERRAR SERVICIO
  // ============================================
  cerrar() {
    if (this.pdfWindow && !this.pdfWindow.isDestroyed()) {
      this.pdfWindow.close();
      this.pdfWindow = null;
    }
    this.limpiarTemp();
    console.log('🧹 PDFService cerrado');
  }
}

// ✅ EXPORTAR INSTANCIA ÚNICA
const pdfService = new PDFService();

// ✅ LIMPIAR TEMPORALES CADA 10 MINUTOS
setInterval(() => {
  pdfService.limpiarTemp();
}, 600000);

module.exports = pdfService;