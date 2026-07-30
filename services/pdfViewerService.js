
/*
const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PDFViewerService {
  constructor() {
    this.pdfWindow = null;
  }

  async generarYMostrarPDF(datos, entidad, tipo = 'logoaudiometria') {
    try {
      console.log(`\n========== generarYMostrarPDF ==========`);
          console.log('Datos recibidos:', JSON.stringify(datos, null, 2));
    console.log('Entidad:', entidad);
    console.log('Tipo:', tipo);
    console.log('valores_od:', datos.valores_od);
    console.log('valores_oi:', datos.valores_oi);
    console.log('grafica_base64 presente?', !!datos.grafica_base64);
      
      let pdfPath = null;
      const entidadNombre = (entidad || '').toLowerCase();
      const usarCoosalud = entidadNombre === 'coosalud' || entidadNombre.includes('coosalud');
      
      const pdfGenerator = require('./pdfGenerator');
      const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
      
      if (tipo === 'logoaudiometria') {
        if (usarCoosalud) {
          pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad);
        } else {
          pdfPath = await pdfGenerator.generarPDF(datos, entidad, 'logoaudiometria');
        }
      } else {
        if (usarCoosalud) {
          pdfPath = await pdfGeneratorCoosalud.generarPDFAudiometria(datos, entidad);
        } else {
          pdfPath = await pdfGenerator.generarPDFAudiometria(datos, entidad);
        }
      }
      
      if (!pdfPath || !fs.existsSync(pdfPath)) {
        throw new Error('No se pudo generar el PDF');
      }
      
      console.log('✅ PDF generado:', pdfPath);
      
      // SIMPLE: Abrir el PDF en el visor predeterminado del sistema
      await shell.openPath(pdfPath);
      
      return { ok: true, pdfPath };

    } catch (error) {
      console.error('❌ Error:', error);
      throw error;
    }
  }

  cerrarVentana() {
    // No es necesario porque no creamos ventana
  }
}

module.exports = new PDFViewerService();

*/