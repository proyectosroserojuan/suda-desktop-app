const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PDFGeneratorUnified {
  constructor() {
    this.imagesPath = path.join(__dirname, '../assets/images');
    
    console.log('\n========== PDFGeneratorUnified INICIALIZADO ==========');
    console.log('Ruta de imágenes:', this.imagesPath);
    console.log('¿Existe la carpeta?', fs.existsSync(this.imagesPath));
    
    if (fs.existsSync(this.imagesPath)) {
      const files = fs.readdirSync(this.imagesPath);
      console.log('Archivos encontrados:', files);
    }
    console.log('=======================================================\n');
  }

  getDownloadsPath() {
    const homeDir = os.homedir();
    return path.join(homeDir, 'Downloads');
  }

  probarImagen(imageName) {
    const imagePath = path.join(this.imagesPath, imageName);
    return fs.existsSync(imagePath);
  }

  imageToBase64(imageName) {
    const extensiones = ['.jpeg', '.jpg', '.png', '.svg'];
    let imagePath = null;
    
    for (const ext of extensiones) {
      const testName = imageName.includes(ext) ? imageName : imageName.replace(/\.[^/.]+$/, '') + ext;
      const testPath = path.join(this.imagesPath, testName);
      if (fs.existsSync(testPath)) {
        imagePath = testPath;
        break;
      }
    }
    
    if (!imagePath) {
      console.log(`❌ No se encontró la imagen: ${imageName}`);
      return null;
    }
    
    try {
      const imageBuffer = fs.readFileSync(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      let mimeType = 'image/jpeg';
      if (ext === '.png') mimeType = 'image/png';
      if (ext === '.svg') mimeType = 'image/svg+xml';
      
      console.log(`✅ Imagen cargada: ${imageName} (${(imageBuffer.length / 1024).toFixed(2)} KB)`);
      return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
      console.error(`Error: ${error.message}`);
      return null;
    }
  }

  /**
   * GENERAR PDF DE AUDIOMETRÍA
   */
  async generarPDFAudiometria(datos, entidad) {
    try {
      const tieneValores = this.verificarDatosAudiometria(datos);
      if (!tieneValores) {
        console.log('⚠️ No hay datos de audiometría para generar PDF');
        return null;
      }
      
      console.log(`\n========== generarPDFAudiometria ==========`);
      console.log(`Entidad: ${entidad}`);
      
      // 🔥 LOG PARA VERIFICAR OTOSCOPIA 🔥
      console.log('🔍🔍🔍 VERIFICANDO OTOSCOPIA 🔍🔍🔍');
      console.log('📌 datos.otoscopia existe:', datos.hasOwnProperty('otoscopia'));
      console.log('📌 Valor de otoscopia:', datos.otoscopia);
      console.log('📌 Tipo de otoscopia:', typeof datos.otoscopia);
      console.log('📌 Longitud de otoscopia:', datos.otoscopia?.length);
      console.log('📌 Contenido completo:', JSON.stringify(datos.otoscopia));
      
      const imagenes = await this.cargarImagenes();
      const html = this.generarAudiometriaHTML(datos, entidad, imagenes);
      
      return await this.generarPDFDesdeHTML(html, datos.paciente?.nombre || 'paciente', 'Audiometria');
    } catch (error) {
      console.error('❌ Error en generarPDFAudiometria:', error);
      throw error;
    }
  }

  /**
   * GENERAR PDF DE LOGOAUDIOMETRÍA
   */
  async generarPDFLogoaudiometria(datos, entidad) {
    try {
      const tieneValores = this.verificarDatosLogoaudiometria(datos);
      if (!tieneValores) {
        console.log('⚠️ No hay datos de logoaudiometría para generar PDF');
        return null;
      }
      
      console.log(`\n========== generarPDFLogoaudiometria ==========`);
      console.log(`Entidad: ${entidad}`);
      
      // 🔥 LOG PARA VERIFICAR OTOSCOPIA 🔥
      console.log('🔍🔍🔍 VERIFICANDO OTOSCOPIA 🔍🔍🔍');
      console.log('📌 datos.otoscopia existe:', datos.hasOwnProperty('otoscopia'));
      console.log('📌 Valor de otoscopia:', datos.otoscopia);
      console.log('📌 Tipo de otoscopia:', typeof datos.otoscopia);
      console.log('📌 Longitud de otoscopia:', datos.otoscopia?.length);
      console.log('📌 Contenido completo:', JSON.stringify(datos.otoscopia));
      
      const imagenes = await this.cargarImagenes();
      const html = this.generarLogoaudiometriaHTML(datos, entidad, imagenes);
      
      return await this.generarPDFDesdeHTML(html, datos.paciente?.nombre || 'paciente', 'Logoaudiometria');
    } catch (error) {
      console.error('❌ Error en generarPDFLogoaudiometria:', error);
      throw error;
    }
  }

  /**
   * GENERAR PDF COMBINADO (ambos exámenes en un solo PDF)
   */
  async generarPDFCombinado(datosAudiometria, datosLogoaudiometria, entidad) {
    try {
      console.log(`\n========== generarPDFCombinado ==========`);
      console.log(`Entidad: ${entidad}`);
      
      // 🔥 LOG PARA VERIFICAR OTOSCOPIA 🔥
      console.log('🔍🔍🔍 VERIFICANDO OTOSCOPIA 🔍🔍🔍');
      console.log('📌 datosAudiometria.otoscopia existe:', datosAudiometria.hasOwnProperty('otoscopia'));
      console.log('📌 Valor de otoscopia:', datosAudiometria.otoscopia);
      console.log('📌 Tipo de otoscopia:', typeof datosAudiometria.otoscopia);
      console.log('📌 Longitud de otoscopia:', datosAudiometria.otoscopia?.length);
      console.log('📌 Contenido completo:', JSON.stringify(datosAudiometria.otoscopia));
      
      const imagenes = await this.cargarImagenes();
      const html = this.generarCombinadoHTML(datosAudiometria, datosLogoaudiometria, entidad, imagenes);
      
      return await this.generarPDFDesdeHTML(html, datosAudiometria.paciente?.nombre || 'paciente', 'Examen_Audiologico_Completo');
    } catch (error) {
      console.error('❌ Error en generarPDFCombinado:', error);
      throw error;
    }
  }

  verificarDatosAudiometria(datos) {
    const valoresOD = datos.valores_od || {};
    const valoresOI = datos.valores_oi || {};
    
    const tieneValoresOD = Object.values(valoresOD).some(v => v && v !== '');
    const tieneValoresOI = Object.values(valoresOI).some(v => v && v !== '');
    const tieneGrafica = datos.grafica_tonal_base64 && datos.grafica_tonal_base64.length > 100;
    
    return tieneValoresOD || tieneValoresOI || tieneGrafica;
  }

  verificarDatosLogoaudiometria(datos) {
    const valoresOD = datos.valores_od || {};
    const valoresOI = datos.valores_oi || {};
    
    const tieneValoresOD = valoresOD.urv || valoresOD.upalabra || valoresOD.udisc || valoresOD.pmax;
    const tieneValoresOI = valoresOI.urv || valoresOI.upalabra || valoresOI.udisc || valoresOI.pmax;
    const tieneGrafica = datos.grafica_logo_base64 && datos.grafica_logo_base64.length > 100;
    
    return tieneValoresOD || tieneValoresOI || tieneGrafica;
  }

  async cargarImagenes() {
    let headerBase64 = null;
    let footerBase64 = null;
    let oidoLogoBase64 = null;
    let qrBase64 = null;      // ← AGREGAR
    let selloBase64 = null;   // ← AGREGAR
    
    const testHeader = this.probarImagen('header_uda.jpeg');
    const testFooter = this.probarImagen('footer_uda.jpeg');
    const testOidoLogo = this.probarImagen('oido_logo.jpeg');
    const testQR = this.probarImagen('qr.jpeg') || this.probarImagen('qr.png');  // ← AGREGAR
    const testSello = this.probarImagen('sello.png') || this.probarImagen('sello.jpeg') || this.probarImagen('sello.jpg');  // ← AGREGAR
    
    if (testHeader) headerBase64 = this.imageToBase64('header_uda.jpeg');
    if (testFooter) footerBase64 = this.imageToBase64('footer_uda.jpeg');
    if (testOidoLogo) oidoLogoBase64 = this.imageToBase64('oido_logo.jpeg');

        if (testQR) {
        const qrImageName = fs.existsSync(path.join(this.imagesPath, 'qr.jpeg')) ? 'qr.jpeg' : 'qr.png';
        qrBase64 = this.imageToBase64(qrImageName);
    }
    
    if (testSello) {
        const selloImageName = fs.existsSync(path.join(this.imagesPath, 'sello.png')) ? 'sello.png' :
                               fs.existsSync(path.join(this.imagesPath, 'sello.jpeg')) ? 'sello.jpeg' : 'sello.jpg';
        selloBase64 = this.imageToBase64(selloImageName);
    }
    
    return { headerBase64, footerBase64, oidoLogoBase64, qrBase64, selloBase64 };
  }

async generarPDFDesdeHTML(html, nombrePaciente, tipoExamen) {
  const debugPath = path.join(this.getDownloadsPath(), `debug_${tipoExamen}.html`);
  fs.writeFileSync(debugPath, html);
  console.log(`💾 HTML guardado en: ${debugPath}`);
  
  // 🔥 CONFIGURACIÓN FIJA - SIEMPRE IGUAL EN CUALQUIER PANTALLA
  const win = new BrowserWindow({
    width: 1200,        // <-- FIJO
    height: 900,        // <-- FIJO
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      zoomFactor: 1.0
    }
  });
  
  // Cargar el HTML
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // Esperar a que se cargue completamente
  await new Promise(resolve => setTimeout(resolve, 2500));
  
  const downloadsPath = this.getDownloadsPath();
  const fecha = new Date();
  const fechaStr = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}_${fecha.getHours()}-${fecha.getMinutes()}-${fecha.getSeconds()}`;
  const pdfPath = path.join(downloadsPath, `${nombrePaciente.replace(/\s+/g, '_')}_${tipoExamen}_${fechaStr}.pdf`);
  
  // 🔥 GENERAR PDF CON CONFIGURACIÓN FIJA
  const pdfData = await win.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    landscape: false,
    margins: {
      top: 0.1,
      bottom: 0.1,
      left: 0.1,
      right: 0.1
    },
    scale: 1.0,
    displayHeaderFooter: false
  });
  
  fs.writeFileSync(pdfPath, pdfData);
  win.close();
  
  console.log(`\n✅ PDF generado: ${pdfPath}`);
  console.log(`📏 Tamaño del PDF: ${(pdfData.length / 1024).toFixed(2)} KB`);
  return pdfPath;
}
/**
 * MÉTODO DE DEBUG - Genera un HTML de vista previa con el mismo viewport fijo
 * que se usará para el PDF, para verificar sin compilar
 */
async generarVistaPrevia(datosAudiometria, datosLogoaudiometria, entidad) {
  console.log('\n========== GENERANDO VISTA PREVIA ==========');
  
  // Generar el HTML combinado (igual que en PDF)
  const imagenes = await this.cargarImagenes();
  const html = this.generarCombinadoHTML(datosAudiometria, datosLogoaudiometria, entidad, imagenes);
  
  // Crear una ventana del mismo tamaño que se usará para el PDF
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: true,  // <-- Mostrar la ventana para ver la vista previa
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      zoomFactor: 1.0
    }
  });
  
  // Cargar el HTML
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // Forzar el mismo viewport fijo
  await win.webContents.executeJavaScript(`
    document.documentElement.style.width = '1200px';
    document.body.style.width = '1200px';
    document.body.style.margin = '0 auto';
  `);
  
  console.log('✅ Ventana de vista previa abierta');
  console.log('📐 Tamaño fijo: 1200x900');
  console.log('💡 Cierra la ventana para continuar');
  
  // Esperar a que el usuario cierre la ventana
  return new Promise((resolve) => {
    win.on('closed', () => {
      console.log('✅ Vista previa cerrada');
      resolve();
    });
  });
}

  /**
   * GENERAR HTML COMBINADO (AMBOS EXÁMENES EN UNA SOLA HOJA)
   */
/**
 * GENERAR HTML COMBINADO (AMBOS EXÁMENES EN UNA SOLA HOJA)
 */
generarCombinadoHTML(datosAudiometria, datosLogoaudiometria, entidad, imagenes) {
  
    const nrFlags = datosLogoaudiometria.nr_flags || { od: {}, oi: {} };

  function getValorConNR(ear, campo, valor) {
    if (nrFlags[ear] && nrFlags[ear][campo] === true) {
      return '↓';
    }
    return valor || '—';
  }

  function getUnidad(ear, campo, unidad) {
    if (nrFlags[ear] && nrFlags[ear][campo] === true) {
      return '';
    }
    return unidad;
  }
  
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const fechaActual = new Date();
  const ciudad = 'Cúcuta';
  const mesActual = meses[fechaActual.getMonth()];
  const añoActual = fechaActual.getFullYear();
  const fechaTexto = `${ciudad}, ${mesActual} ${añoActual}`;

  // Datos de AUDIOMETRÍA
  const odAudiometria = datosAudiometria.valores_od || {};
  const oiAudiometria = datosAudiometria.valores_oi || {};
  const freqs = datosAudiometria.freqs || ['250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

  // OTOSCOPIA
  const otoscopia = datosAudiometria.otoscopia || '';
  console.log('🔍 Dibujando OTOSCOPIA en HTML, valor:', otoscopia);

  // Datos de LOGOAUDIOMETRÍA
  const odLogoaudiometria = datosLogoaudiometria.valores_od || {};
  const oiLogoaudiometria = datosLogoaudiometria.valores_oi || {};

  const headerHTML = imagenes.headerBase64 ? 
    `<div class="header"><img src="${imagenes.headerBase64}" alt="Header"></div>` : 
    `<div class="header"><h1 style="color:#1e3a8a; margin:0;">AUDIOLOGÍA CLÍNICA</h1></div>`;

  const footerHTML = imagenes.footerBase64 ?
    `<div class="footer"><img src="${imagenes.footerBase64}" alt="Footer"></div>` : 
    `<div class="footer"><p>Sistema de Gestión Audiológica</p></div>`;

  const oidoLogoHTML = imagenes.oidoLogoBase64 ? 
    `<img src="${imagenes.oidoLogoBase64}" alt="Oído" class="oido-img">` : 
    `<svg width="80" height="80" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#333" stroke-width="2" fill="none"/></svg>`;

// Calcular PTA (igual que en PDFGenerator funcionando)
const pta = datosAudiometria.pta || {};

// Tabla PTA CON BORDES NEGROS (exactamente como en la foto)
const tablaPTA = `
<div style="position: fixed; right: 4px; top: 29%; margin: 0; z-index: 1000; width: 420px; height: 300px; background: white; padding: 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
  <div style="font-weight: bold; font-size: 13px; margin-bottom: 6px;">PROMEDIO TONAL (PTA)</div>
  <table style="border-collapse: collapse; font-size: 11px; width: 100%;">  <!-- CAMBIADO: width: 100% -->
    <thead>
      <tr style="border: 1px solid black;">
        <th style="border: 1px solid black; padding: 6px 10px; font-size: 11px;"></th>
        <th style="border: 1px solid black; padding: 6px 10px; font-size: 11px;">Vía Aérea</th>
        <th style="border: 1px solid black; padding: 6px 10px; font-size: 11px;">Vía Ósea</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border: 1px solid black;">
        <td style="border: 1px solid black; padding: 6px 10px; font-weight: bold; font-size: 11px;">Oido Derecho</td>
        <td style="border: 1px solid black; padding: 6px 10px; color: #e74c3c; font-weight: bold; font-size: 13px;">${pta.od_air || '--'} dB</td>
        <td style="border: 1px solid black; padding: 6px 10px; color: #e74c3c; font-weight: bold; font-size: 13px;">${pta.od_bone || '--'} dB</td>
      </tr>
      <tr style="border: 1px solid black;">
        <td style="border: 1px solid black; padding: 6px 10px; font-weight: bold; font-size: 11px;">Oido Izquierdo</td>
        <td style="border: 1px solid black; padding: 6px 10px; color: #3498db; font-weight: bold; font-size: 13px;">${pta.oi_air || '--'} dB</td>
        <td style="border: 1px solid black; padding: 6px 10px; color: #3498db; font-weight: bold; font-size: 13px;">${pta.oi_bone || '--'} dB</td>
      </tr>
    </tbody>
  </table>



  <!-- DIAGNÓSTICOS UNO DEBAJO DEL OTRO -->
  <div style="margin-top: 10px;">
    <div style="font-weight: bold; font-size: 11px; margin-top: 8px; margin-bottom: 3px; border-bottom: 1px solid #ddd; padding-bottom: 3px;">DIAGNÓSTICO AUDIOMETRIA TONAL</div>
    <div style="font-size: 11px; padding: 3px 0; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;">${datosAudiometria.diagnostico_od || ''}</div>
    <div style="font-weight: bold; font-size: 11px; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #ddd; padding-bottom: 3px;">DIAGNÓSTICO LOGOAUDIOMETRÍA</div>
    <div style="font-size: 10px; color: #555; padding: 2px 0;">Oido Derecho:</div>
    <div style="font-size: 11px; padding: 2px 0 4px 0; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;">${datosLogoaudiometria.diagnostico_od || ''}</div>
    <div style="font-size: 10px; color: #555; padding: 2px 0;">Oido Izquierdo:</div>
    <div style="font-size: 11px; padding: 2px 0 4px 0; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;">${datosLogoaudiometria.diagnostico_oi || ''}</div>
 <!--   <div style="font-weight: bold; font-size: 11px; margin-top: 10px; margin-bottom: 3px; border-bottom: 1px solid #ddd; padding-bottom: 3px;">OBSERVACIONES</div> -->
  <!--    <div style="font-size: 11px; padding: 3px 0; line-height: 1.4; word-wrap: break-word; white-space: pre-wrap;">${datosLogoaudiometria.diagnostico || ''}</div>   -->
  </div>



</div>`;


 

  /* Tabla de AUDIOMETRÍA (compacta)
  let tablaAudiometriaRows = '';
  freqs.forEach(f => {
    tablaAudiometriaRows += `
      <tr>
        <td style="font-weight: bold; font-size: 9px;">${f} Hz</td>
        <td class="valor-od" style="font-size: 9px;">${odAudiometria[f] || '—'} <span class="unidad">dB</span></td>
        <td class="valor-oi" style="font-size: 9px;">${oiAudiometria[f] || '—'} <span class="unidad">dB</span></td>
      </tr>
    `;
  });

  */

  let tablaAudiometriaRows = '';
const freqsConDatos = freqs.filter(f => {
    // Filtrar frecuencias que NO tienen valor en OD ni OI
    const tieneOD = odAudiometria[f] && odAudiometria[f] !== '' && odAudiometria[f] !== null;
    const tieneOI = oiAudiometria[f] && oiAudiometria[f] !== '' && oiAudiometria[f] !== null;
    return tieneOD || tieneOI;
});

freqsConDatos.forEach(f => {
    tablaAudiometriaRows += `
      <tr>
        <td style="font-weight: bold; font-size: 9px;">${f} Hz</td>
        <td class="valor-od" style="font-size: 9px;">${odAudiometria[f] || '—'} <span class="unidad">dB</span></td>
        <td class="valor-oi" style="font-size: 9px;">${oiAudiometria[f] || '—'} <span class="unidad">dB</span></td>
      </tr>
    `;
});

  // Tabla de LOGOAUDIOMETRÍA (compacta)
// Tabla de LOGOAUDIOMETRÍA (compacta) - CORREGIDA
const tablaLogoaudiometriaRows = `
    <tr>
        <td style="font-weight: bold; font-size: 9px;">U. Voz</td>
        <td class="${nrFlags.od?.urv ? 'valor-nr-od' : 'valor-od'}" style="font-size: 9px;">
            ${getValorConNR('od', 'urv', odLogoaudiometria.urv)} 
            <span class="unidad">${getUnidad('od', 'urv', 'dB')}</span>
        </td>
        <td class="${nrFlags.oi?.urv ? 'valor-nr-oi' : 'valor-oi'}" style="font-size: 9px;">
            ${getValorConNR('oi', 'urv', oiLogoaudiometria.urv)} 
            <span class="unidad">${getUnidad('oi', 'urv', 'dB')}</span>
        </td>
    </tr>
    <tr>
        <td style="font-weight: bold; font-size: 9px;">U. Palabras</td>
        <td class="${nrFlags.od?.upalabra ? 'valor-nr-od' : 'valor-od'}" style="font-size: 9px;">
            ${getValorConNR('od', 'upalabra', odLogoaudiometria.upalabra)} 
            <span class="unidad">${getUnidad('od', 'upalabra', 'dB')}</span>
        </td>
        <td class="${nrFlags.oi?.upalabra ? 'valor-nr-oi' : 'valor-oi'}" style="font-size: 9px;">
            ${getValorConNR('oi', 'upalabra', oiLogoaudiometria.upalabra)} 
            <span class="unidad">${getUnidad('oi', 'upalabra', 'dB')}</span>
        </td>
    </tr>
    <tr>
        <td style="font-weight: bold; font-size: 9px;">U. Discriminación</td>
        <td class="${nrFlags.od?.udisc ? 'valor-nr-od' : 'valor-od'}" style="font-size: 9px;">
            ${getValorConNR('od', 'udisc', odLogoaudiometria.udisc)} 
            <span class="unidad">${getUnidad('od', 'udisc', 'dB')}</span>
        </td>
        <td class="${nrFlags.oi?.udisc ? 'valor-nr-oi' : 'valor-oi'}" style="font-size: 9px;">
            ${getValorConNR('oi', 'udisc', oiLogoaudiometria.udisc)} 
            <span class="unidad">${getUnidad('oi', 'udisc', 'dB')}</span>
        </td>
    </tr>
    <tr>
        <td style="font-weight: bold; font-size: 9px;">% Discriminación</td>
        <td class="${nrFlags.od?.pmax ? 'valor-nr-od' : 'valor-od'}" style="font-size: 9px;">
            ${getValorConNR('od', 'pmax', odLogoaudiometria.pmax)} 
            <span class="unidad">${getUnidad('od', 'pmax', '%')}</span>
        </td>
        <td class="${nrFlags.oi?.pmax ? 'valor-nr-oi' : 'valor-oi'}" style="font-size: 9px;">
            ${getValorConNR('oi', 'pmax', oiLogoaudiometria.pmax)} 
            <span class="unidad">${getUnidad('oi', 'pmax', '%')}</span>
        </td>
    </tr>
`;
  // Verificar gráficas
  const graficaAudiometriaHTML = datosAudiometria.grafica_tonal_base64 && datosAudiometria.grafica_tonal_base64.length > 100 ?
    `<img src="${datosAudiometria.grafica_tonal_base64}" alt="Audiometría Tonal" style="width:100%; max-height: 320px;  object-fit: contain; margin-left: -70px; display: block;">` :
    `<div class="sin-grafica" style="padding:20px; font-size:10px;">⚠️ No se pudo generar la gráfica de Audiometría</div>`;

  const graficaLogoaudiometriaHTML = datosLogoaudiometria.grafica_logo_base64 && datosLogoaudiometria.grafica_logo_base64.length > 100 ?
    `<img src="${datosLogoaudiometria.grafica_logo_base64}" alt="Logoaudiometría" style="width:80%; max-height: 180px; object-fit: contain;   ">` :
    `<div class="sin-grafica" style="padding:20px; font-size:10px;">⚠️ No se pudo generar la gráfica de Logoaudiometría</div>`;

  // OTOSCOPIA HTML
  const otoscopiaHTML = (otoscopia && otoscopia.trim() !== '') 
    ? `<div class="otoscopia-container"><strong>OTOSCOPIA:</strong> ${otoscopia}</div>`
    : `<div class="otoscopia-container"><strong>OTOSCOPIA:</strong>''</div>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Examen Audiológico Completo - ${entidad}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          padding: 10px 15px;
          font-size: 10px;
          background: white;
        }
        .header { text-align: center; margin-bottom: 10px; width: 100%; }
        .header img { width: 100%; max-height: 140px; object-fit: contain; }
        .fecha { text-align: left; font-size: 15px; margin-bottom: 10px; padding-left: 18px;  /* ← AGREGAR ESTO */
          padding-right: 15px; /* ← Y ESTO PARA SIMETRÍA */  }


        .datos-paciente {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          padding-left: 18px;  /* ← AGREGAR ESTO */
          padding-right: 15px; /* ← Y ESTO PARA SIMETRÍA */
        }

        
      .info-paciente { 
  flex: 2; 
  padding-left: 5px; /* ← OPCIONAL: para separar del borde interno */
    position: relative;       /* ← AÑADIR */
  top: -25px;  
}


        .info-paciente p { margin: 3px 0; font-size: 14px; }
        .info-paciente strong { min-width: 60px; display: inline-block; font-size: 14px; }



.oido-imagen { 
  flex: 1; 
  text-align: center;  /* ← CAMBIAR de 'right' a 'center' o 'left' */
   position: relative; 
  top: -35px;  
  margin-left: -20px;  /* ← MUEVE MÁS A LA IZQUIERDA (valor negativo) */
}
.oido-img { 
  max-width: 150px;    /* ← AUMENTAR (100→180) */
  max-height: 150px;   /* ← AUMENTAR (100→180) */
  object-fit: contain; 
}


    
        
        /* OTOSCOPIA */


     .otoscopia-container {
  margin: 5px 0 5px 18px;
  padding: 4px 15px;  /* ← UNIFICADO: 4px arriba/abajo, 15px izquierda/derecha */
  font-size: 9px;
  background: #f9f9f9;
  border-left: 3px solid #1e3a8a;
    position: absolute;    /* ← ABSOLUTO FIJO */
  top: 250px;            /* ← AJUSTA: más pequeño = más arriba */
}
        

  
        .grafica-titulo {
          background: #ffffff;
          padding: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 5px;
        }

        .sin-grafica { color: #e74c3c; text-align: center; border: 1px dashed #ccc; border-radius: 4px; }
        
        

        .tabla-titulo {
          background: #ffffff;
          padding: 4px;
          text-align: center;
          font-weight: bold;
          font-size: 10px;
          margin-bottom: 5px;
        }
        .tabla-valores {
          width: 100%;
          border-collapse: collapse;
          font-size: 9px;
        }
        .tabla-valores th, .tabla-valores td {
          border: 1px solid #7a7a7a;
          padding: 4px 4px;
          text-align: center;
        }
        .tabla-valores th { background: white; font-weight: bold; font-size: 9px; }
        .tabla-valores td:first-child { text-align: left; font-weight: bold; }
        .valor-od { color: #e74c3c; font-weight: bold; }
        .valor-oi { color: #3498db; font-weight: bold; }

        /* Agregar estas líneas en el CSS de generarCombinadoHTML */
.valor-nr-od { 
    color: #e74c3c !important; 
    font-weight: bold; 
    font-size: 14px; 
}
.valor-nr-oi { 
    color: #3498db !important; 
    font-weight: bold; 
    font-size: 14px; 
}
        .unidad { font-size: 7px; color: #555; font-weight: normal; }
        
        /* Diagnóstico en dos columnas */


        


        /* QR y SELLO en la misma posición que el código original */


.qr-central {
    position: absolute;
    top: 115px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
}

.tablas-container {
  transform: translateY(-30px);   /* ← SOLO ESTA LÍNEA */
}


.qr-central img {
    width: 90px;
    height: 90px;
    object-fit: contain;
}
.sello-central {
    position: fixed;
    bottom: -60px;
    right: -60px;
    z-index: 9999;
    pointer-events: none;
}
.sello-central img {
    width: 500px;
    height: auto;
    opacity: 0.9;
    object-fit: contain;
}



.graficas-container {
 transform: translateY(-20px); 
}

/* ========================================= */
/* OBSERVACIONES - CON BORDES Y AUTO SALTO */
/* ========================================= */
.observaciones-container {
  border: 2px solid #ebebeb;        /* Borde azul */
  border-radius: 6px;               /* Esquinas redondeadas */
  padding: 8px 12px;
  margin-top: 8px;
  background: #ffffff;
  max-height: 120px;                /* Altura máxima antes del scroll/salto */
  overflow: auto;                   /* Scroll si es necesario */
  page-break-inside: avoid;         /* Evita que se corte a la mitad */
  break-inside: avoid;              /* Para navegadores modernos */
}

.observaciones-titulo {
  font-weight: bold;
  font-size: 11px;
  color: #000000;
  margin-bottom: 4px;
  border-bottom: 1px solid #ddd;
  padding-bottom: 4px;
}




        
        .footer {
          position: fixed;
          bottom: 5px;
          left: 0;
          right: 0;
          text-align: center;
          width: 100%;
          font-size: 8px;
        }
        .footer img { width: 100%; max-height: 140px; object-fit: contain; }
        
        @media print {
          body { padding: 0; margin: 0; }
          .footer { position: fixed; bottom: 0; }
        }
      </style>
    </head>
    <body>
      ${headerHTML}


${imagenes.qrBase64 ? `<div class="qr-central"><img src="${imagenes.qrBase64}" alt="QR"></div>` : ''}




      <div class="fecha">${fechaTexto}</div>
      
      <div class="datos-paciente">
        <div class="info-paciente">
          <p><strong>Nombre:</strong> ${datosAudiometria.paciente?.nombre || ''}</p>
          <p><strong>C.C.:</strong> ${datosAudiometria.paciente?.documento || ''}</p>
          <p><strong>Entidad:</strong> ${entidad || ''}</p>
        </div>
        <div class="oido-imagen">${oidoLogoHTML}</div>
      </div>
      
      <!-- OTOSCOPIA -->
      ${otoscopiaHTML}
      
      <!-- GRÁFICAS: UNA AL LADO DE LA OTRA -->
      
<!-- GRÁFICAS: UNA ARRIBA DE LA OTRA -->
<div class="graficas-container">
  <div class="grafica-columna">
    <div class="grafica-titulo">AUDIOMETRÍA TONAL</div>
    <div class="grafica-img">${graficaAudiometriaHTML}</div>
  </div>
  <div class="grafica-columna">
    <div class="grafica-titulo">LOGOAUDIOMETRÍA</div>
    <div class="grafica-img">${graficaLogoaudiometriaHTML}</div>

    
  </div>
    <div class="observaciones-container">
    <div class="observaciones-titulo">OBSERVACIONES</div>
    <div class="observaciones-texto">${datosAudiometria.observaciones || ''}</div>
  </div>
</div>
      
<!-- TABLAS: UNA ARRIBA DE LA OTRA -->



<div class="tablas-container" style="position: fixed; right: -5px; top: 64%; background: white; padding: 5px; max-width: 380px;">
  
<!--
  <table class="tabla-valores">
    <thead><tr><th>Frecuencia</th><th>OD</th><th>OI</th></tr></thead>
    <tbody>${tablaAudiometriaRows}</tbody>
  </table>
  -->

  <br> <!-- Espacio entre tablas -->

  <table class="tabla-valores">
    <thead><tr><th>Parámetro</th><th>OD</th><th>OI</th></tr></thead>
    <tbody>${tablaLogoaudiometriaRows}</tbody>
  </table>

</div>

      
  
     

     
           ${tablaPTA}
   


        <!--
        <div class="diagnostico-columna">
          <div class="diagnostico-titulo-sec">DIAGNÓSTICO LOGOAUDIOMETRÍA</div>
          <div class="diagnostico-subtitulo">O.D.</div>
          <div class="diagnostico-texto">${datosLogoaudiometria.diagnostico_od || '_________________________'}</div>
          <div class="diagnostico-subtitulo">O.I.</div>
          <div class="diagnostico-texto">${datosLogoaudiometria.diagnostico_oi || '_________________________'}</div>
          <div class="diagnostico-titulo-sec" style="margin-top:8px;">OBSERVACIONES</div>
          <div class="diagnostico-texto">${datosLogoaudiometria.diagnostico || '_________________________'}</div>
        </div>

        -->

      </div>
      ${imagenes.selloBase64 ? `<div class="sello-central"><img src="${imagenes.selloBase64}" alt="Sello"></div>` : ''}


      ${footerHTML}
    </body>
    </html>
  `;
}

  /**
   * Generar HTML para AUDIOMETRÍA
   */
  generarAudiometriaHTML(datos, entidad, imagenes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaActual = new Date();
    const ciudad = 'Cúcuta';
    const mesActual = meses[fechaActual.getMonth()];
    const añoActual = fechaActual.getFullYear();
    const fechaTexto = `${ciudad}, ${mesActual} ${añoActual}`;

    const od = datos.valores_od || {};
    const oi = datos.valores_oi || {};
    const freqs = datos.freqs || ['250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
    
    // OTOSCOPIA
    const otoscopia = datos.otoscopia || '';
    console.log('🔍 Dibujando OTOSCOPIA en HTML Audiometría, valor:', otoscopia);

    const headerHTML = imagenes.headerBase64 ? 
      `<div class="header"><img src="${imagenes.headerBase64}" alt="Header"></div>` : 
      `<div class="header"><h1 style="color:#1e3a8a;">AUDIOLOGÍA CLÍNICA</h1></div>`;

    const footerHTML = imagenes.footerBase64 ?
      `<div class="footer"><img src="${imagenes.footerBase64}" alt="Footer"></div>` : 
      `<div class="footer"><p>Sistema de Gestión Audiológica</p></div>`;

    const oidoLogoHTML = imagenes.oidoLogoBase64 ? 
      `<img src="${imagenes.oidoLogoBase64}" alt="Oído" class="oido-img">` : 
      `<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#333" stroke-width="2" fill="none"/></svg>`;

      /*
    let tablaRows = '';
    freqs.forEach(f => {
      tablaRows += `
        <tr>
          <td style="font-weight: bold;">${f} Hz</td>
          <td class="valor-od">${od[f] || '—'} <span class="unidad">dB</span></td>
          <td class="valor-oi">${oi[f] || '—'} <span class="unidad">dB</span></td>
        </tr>
      `;
    });
    */
   let tablaRows = '';
const freqsConDatos = freqs.filter(f => {
    const tieneOD = od[f] && od[f] !== '' && od[f] !== null;
    const tieneOI = oi[f] && oi[f] !== '' && oi[f] !== null;
    return tieneOD || tieneOI;
});

freqsConDatos.forEach(f => {
    tablaRows += `
        <tr>
          <td style="font-weight: bold;">${f} Hz</td>
          <td class="valor-od">${od[f] || '—'} <span class="unidad">dB</span></td>
          <td class="valor-oi">${oi[f] || '—'} <span class="unidad">dB</span></td>
        </tr>
    `;
});

    const graficaHTML = datos.grafica_tonal_base64 && datos.grafica_tonal_base64.length > 100 ?
      `<img src="${datos.grafica_tonal_base64}" alt="Audiometría Tonal">` :
      `<div class="sin-grafica">⚠️ No se pudo generar la gráfica</div>`;

    // OTOSCOPIA HTML
    const otoscopiaHTML = (otoscopia && otoscopia.trim() !== '') 
      ? `<div class="otoscopia-box"><strong>OTOSCOPIA:</strong> ${otoscopia}</div>`
      : `<div class="otoscopia-box"><strong>OTOSCOPIA:</strong></div>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Audiometría Tonal - ${entidad}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px 30px;
            font-size: 12px;
            background: white;
          }
          .header { text-align: center; margin-bottom: 10px; width: 100%; }
          .header img { width: 100%; max-height: 140px; object-fit: contain; }
          .fecha { text-align: left; font-size: 11px; margin-bottom: 20px; }


.datos-paciente {
  display: flex;
  justify-content: flex-start;  /* Alinea los hijos a la izquierda */
  align-items: center;
  margin-bottom: 10px;
  margin-left: auto;  /* Empuja el contenedor a la derecha */
  margin-right: 60px; /* 🔥 AJUSTA ESTO: qué tan lejos del borde derecho */
  width: auto;  /* Que ocupe solo su contenido */
}


          .info-paciente { flex: 2; }
          .info-paciente p { margin: 5px 0; font-size: 12px; }
          .info-paciente strong { min-width: 70px; display: inline-block; }
          .oido-imagen { flex: 1; text-align: right; }
          .oido-img { max-width: 160px; max-height: 160px; object-fit: contain; }
          
          /* OTOSCOPIA */
          .otoscopia-box {
            margin: 10px 0 15px 0;
            padding: 8px;
            font-size: 11px;
            background: #f9f9f9;
            border-left: 4px solid #1e3a8a;
          }
          
          .titulo-principal { text-align: center; margin: 15px 0; }
          .titulo-principal h2 { color: #1e3a8a; font-size: 18px; }
          .grafica-container { text-align: center; margin: 20px 0; }
          .grafica-container img { width: 100%; max-height: 350px; object-fit: contain; }
          .sin-grafica { color: #e74c3c; padding: 50px; text-align: center; border: 1px dashed #ccc; }
          .two-columns { display: flex; gap: 40px; margin: 20px 0; }
          .columna-derecha { flex: 1; }
          .columna-izquierda { flex: 1; }
          .tabla-valores {
            width: 100%;
            border-collapse: collapse;
            font-size: 8px;
          }
          .tabla-valores th, .tabla-valores td {
            border: 1px solid #7a7a7a;
            padding: 8px 6px;
            text-align: center;
          }
          .tabla-valores th { background: white; font-weight: bold; }
          .tabla-valores td:first-child { text-align: left; font-weight: bold; }
          .valor-od { color: #e74c3c; font-weight: bold; }
          .valor-oi { color: #3498db; font-weight: bold; }
          .unidad { font-size: 9px; color: #555; font-weight: normal; }
          .diagnostico-box { margin-bottom: 20px; }
          .diagnostico-titulo { font-weight: bold; font-size: 12px; margin-bottom: 10px; }
          .diagnostico-subtitulo { font-weight: bold; font-size: 11px; margin-top: 12px; margin-bottom: 5px; }
          .diagnostico-texto { font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
          .footer {
            position: fixed;
            bottom: 10px;
            left: 0;
            right: 0;
            text-align: center;
            width: 100%;
          }
          .footer img { width: 100%; max-height: 140px; object-fit: contain; }
          @media print {
            body { padding: 0; margin: 0; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        ${headerHTML}
        <div class="fecha">${fechaTexto}</div>
        
        <div class="datos-paciente">
          <div class="info-paciente">
            <p><strong>Nombre:</strong> ${datos.paciente?.nombre || '_________________________'}</p>
            <p><strong>C.C.:</strong> ${datos.paciente?.documento || '_________________________'}</p>
            <p><strong>Entidad:</strong> ${entidad || '_________________________'}</p>
          </div>
          <div class="oido-imagen">${oidoLogoHTML}</div>
        </div>
        
        <!-- OTOSCOPIA -->
        ${otoscopiaHTML}
        
        <div class="titulo-principal">
          <h2></h2>
        </div>
        
        <div class="grafica-container">
          ${graficaHTML}
        </div>
        
        <div class="two-columns">
          <div class="columna-izquierda">
            <div class="diagnostico-box">
              <div class="diagnostico-titulo">DIAGNÓSTICO AUDITIVO</div>
              <div class="diagnostico-subtitulo">O.D.</div>
              <div class="diagnostico-texto">${datos.diagnostico_od || '_________________________'}</div>
              <div class="diagnostico-subtitulo">O.I.</div>
              <div class="diagnostico-texto">${datos.diagnostico_oi || '_________________________'}</div>
            </div>
            <div class="diagnostico-box">
              <div class="diagnostico-titulo">OBSERVACIONES</div>
              <div class="diagnostico-texto">${datos.observaciones || '_________________________'}</div>
            </div>
          </div>
          <div class="columna-derecha">
            <table class="tabla-valores">
              <thead><tr><th>Frecuencia</th><th>OD</th><th>OI</th></tr></thead>
              <tbody>${tablaRows}</tbody>
            </table>
          </div>
        </div>
        
        ${footerHTML}
      </body>
      </html>
    `;
  }

  /**
   * Generar HTML para LOGOAUDIOMETRÍA
   */
  generarLogoaudiometriaHTML(datos, entidad, imagenes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaActual = new Date();
    const ciudad = 'Cúcuta';
    const mesActual = meses[fechaActual.getMonth()];
    const añoActual = fechaActual.getFullYear();
    const fechaTexto = `${ciudad}, ${mesActual} ${añoActual}`;

    const od = datos.valores_od || {};
    const oi = datos.valores_oi || {};

        // 🔥 Obtener flags de NR desde los datos
    const nrFlags = datos.nr_flags || { od: {}, oi: {} };
    
    // 🔥 FUNCIÓN para obtener el valor o la flecha según el flag NR
    function getValorConNR(ear, campo, valor) {
        if (nrFlags[ear] && nrFlags[ear][campo] === true) {
            return '↓';
        }
        return valor || '—';
    }
    
    // 🔥 FUNCIÓN para obtener la unidad (solo si NO es NR)
    function getUnidad(ear, campo, unidad) {
        if (nrFlags[ear] && nrFlags[ear][campo] === true) {
            return ''; // Sin unidad si es NR
        }
        return unidad;
    }
    
    // OTOSCOPIA
    const otoscopia = datos.otoscopia || '';
    console.log('🔍 Dibujando OTOSCOPIA en HTML Logoaudiometría, valor:', otoscopia);

    const headerHTML = imagenes.headerBase64 ? 
      `<div class="header"><img src="${imagenes.headerBase64}" alt="Header"></div>` : 
      `<div class="header"><h1 style="color:#1e3a8a;">AUDIOLOGÍA CLÍNICA</h1></div>`;

    const footerHTML = imagenes.footerBase64 ?
      `<div class="footer"><img src="${imagenes.footerBase64}" alt="Footer"></div>` : 
      `<div class="footer"><p>Sistema de Gestión Audiológica</p></div>`;

    const oidoLogoHTML = imagenes.oidoLogoBase64 ? 
      `<img src="${imagenes.oidoLogoBase64}" alt="Oído" class="oido-img">` : 
      `<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#333" stroke-width="2" fill="none"/></svg>`;

    const graficaHTML = datos.grafica_logo_base64 && datos.grafica_logo_base64 > 100 ?
      `<img src="${datos.grafica_logo_base64}" alt="Logoaudiometría">` :
      `<div class="sin-grafica">⚠️ No se pudo generar la gráfica</div>`;

    // OTOSCOPIA HTML
    const otoscopiaHTML = (otoscopia && otoscopia.trim() !== '') 
      ? `<div class="otoscopia-box"><strong>OTOSCOPIA:</strong> ${otoscopia}</div>`
      : `<div class="otoscopia-box"><strong>OTOSCOPIA:</strong></div>`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Logoaudiometría - ${entidad}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px 30px;
            font-size: 12px;
            background: white;
          }
          .header { text-align: center; margin-bottom: 20px; width: 100%; }
          .header img { width: 100%; max-height: 140px; object-fit: contain; }
          .fecha { text-align: left; font-size: 11px; margin-bottom: 20px; }


          .datos-paciente {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
          }

                    /* 🔥 Estilo para la flecha NR */
          .valor-nr {
            color: #e74c3c;
            font-weight: bold;
            font-size: 14px;
          }
          .info-paciente { flex: 2; }
          .info-paciente p { margin: 5px 0; font-size: 12px; }
          .info-paciente strong { min-width: 70px; display: inline-block; }
          .oido-imagen { flex: 1; text-align: right; }
          .oido-img { max-width: 120px; max-height: 120px; object-fit: contain; }
          
          /* OTOSCOPIA */
          .otoscopia-box {
            margin: 10px 0 15px 0;
            padding: 8px;
            font-size: 11px;
            background: #f9f9f9;
            border-left: 4px solid #1e3a8a;
          }
          
          .titulo-principal { text-align: center; margin: 15px 0; }
          .titulo-principal h2 { color: #1e3a8a; font-size: 18px; }
          .grafica-container { text-align: center; margin: 20px 0; }
          .grafica-container img { width: 100%; max-height: 350px; object-fit: contain; }
          .sin-grafica { color: #e74c3c; padding: 50px; text-align: center; border: 1px dashed #ccc; }
          .two-columns { display: flex; gap: 40px; margin: 20px 0; }
          .columna-derecha { flex: 1; }
          .columna-izquierda { flex: 1; }
          .tabla-valores {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
          }
          .tabla-valores th, .tabla-valores td {
            border: border: 1px solid #7a7a7a;
            padding: 8px 6px;
            text-align: center;
          }
          .tabla-valores th { background: white; font-weight: bold; }
          .tabla-valores td:first-child { text-align: left; font-weight: bold; }
          .valor-od { color: #e74c3c; font-weight: bold; }
          .valor-oi { color: #3498db; font-weight: bold; }

          /* Reemplazar .valor-nr con estas dos clases */
.valor-nr-od { 
    color: #e74c3c !important; 
    font-weight: bold; 
    font-size: 14px; 
}
.valor-nr-oi { 
    color: #3498db !important; 
    font-weight: bold; 
    font-size: 14px; 
}


          .unidad { font-size: 9px; color: #555; font-weight: normal; }
          .diagnostico-box { margin-bottom: 20px; }
          .diagnostico-titulo { font-weight: bold; font-size: 12px; margin-bottom: 10px; }
          .diagnostico-subtitulo { font-weight: bold; font-size: 11px; margin-top: 12px; margin-bottom: 5px; }
          .diagnostico-texto { font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
          .footer {
            position: fixed;
            bottom: 10px;
            left: 0;
            right: 0;
            text-align: center;
            width: 100%;
          }
          .footer img { width: 100%; max-height: 140px; object-fit: contain; }
          @media print {
            body { padding: 0; margin: 0; }
            .footer { position: fixed; bottom: 0; }
          }
        </style>
      </head>
      <body>
        ${headerHTML}
        <div class="fecha">${fechaTexto}</div>
        
        <div class="datos-paciente">
          <div class="info-paciente">
            <p><strong>Nombre:</strong> ${datos.paciente?.nombre || ''}</p>
            <p><strong>C.C.:</strong> ${datos.paciente?.documento || ''}</p>
            <p><strong>Entidad:</strong> ${entidad || ''}</p>
          </div>
          <div class="oido-imagen">${oidoLogoHTML}</div>
        </div>
        
        <!-- OTOSCOPIA -->
        ${otoscopiaHTML}
        
        <div class="titulo-principal">
          <h2>LOGOAUDIOMETRÍA</h2>
        </div>
        
        <div class="grafica-container">
          ${graficaHTML}
        </div>
        
        <div class="two-columns">
          <div class="columna-izquierda">
            <div class="diagnostico-box">
              <div class="diagnostico-titulo">DIAGNÓSTICO AUDITIVO</div>
              <div class="diagnostico-subtitulo">O.D.</div>
              <div class="diagnostico-texto">${datos.diagnostico_od || '_________________________'}</div>
              <div class="diagnostico-subtitulo">O.I.</div>
              <div class="diagnostico-texto">${datos.diagnostico_oi || '_________________________'}</div>
            </div>
            <div class="diagnostico-box">
              <div class="diagnostico-titulo">OBSERVACIONES</div>
              <div class="diagnostico-texto">${datos.diagnostico || '_________________________'}</div>
            </div>
          </div>



<div class="columna-derecha">
    <table class="tabla-valores">
        <thead>
            <tr>
                <th>Parámetro</th>
                <th>OD</th>
                <th>OI</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td style="font-weight: bold;">U. Voz</td>
                <td class="${nrFlags.od?.urv ? 'valor-nr-od' : 'valor-od'}">
                    ${getValorConNR('od', 'urv', od.urv)} 
                    <span class="unidad">${getUnidad('od', 'urv', 'dB')}</span>
                </td>
                <td class="${nrFlags.oi?.urv ? 'valor-nr-oi' : 'valor-oi'}">
                    ${getValorConNR('oi', 'urv', oi.urv)} 
                    <span class="unidad">${getUnidad('oi', 'urv', 'dB')}</span>
                </td>
            </tr>
            <tr>
                <td style="font-weight: bold;">U. Palabras</td>
                <td class="${nrFlags.od?.upalabra ? 'valor-nr-od' : 'valor-od'}">
                    ${getValorConNR('od', 'upalabra', od.upalabra)} 
                    <span class="unidad">${getUnidad('od', 'upalabra', 'dB')}</span>
                </td>
                <td class="${nrFlags.oi?.upalabra ? 'valor-nr-oi' : 'valor-oi'}">
                    ${getValorConNR('oi', 'upalabra', oi.upalabra)} 
                    <span class="unidad">${getUnidad('oi', 'upalabra', 'dB')}</span>
                </td>
            </tr>
            <tr>
                <td style="font-weight: bold;">U. Discriminación</td>
                <td class="${nrFlags.od?.udisc ? 'valor-nr-od' : 'valor-od'}">
                    ${getValorConNR('od', 'udisc', od.udisc)} 
                    <span class="unidad">${getUnidad('od', 'udisc', 'dB')}</span>
                </td>
                <td class="${nrFlags.oi?.udisc ? 'valor-nr-oi' : 'valor-oi'}">
                    ${getValorConNR('oi', 'udisc', oi.udisc)} 
                    <span class="unidad">${getUnidad('oi', 'udisc', 'dB')}</span>
                </td>
            </tr>
            <tr>
                <td style="font-weight: bold;">% Discriminación</td>
                <td class="${nrFlags.od?.pmax ? 'valor-nr-od' : 'valor-od'}">
                    ${getValorConNR('od', 'pmax', od.pmax)} 
                    <span class="unidad">${getUnidad('od', 'pmax', '%')}</span>
                </td>
                <td class="${nrFlags.oi?.pmax ? 'valor-nr-oi' : 'valor-oi'}">
                    ${getValorConNR('oi', 'pmax', oi.pmax)} 
                    <span class="unidad">${getUnidad('oi', 'pmax', '%')}</span>
                </td>
            </tr>
        </tbody>
    </table>
</div>


        </div>
        
        ${footerHTML}
      </body>
      </html>
    `;
  }

  /**
 * MÉTODO DE PRUEBA - Simula el PDF en diferentes tamaños de pantalla
 * SIN compilar la app
 */
async probarPDFEnDiferentesPantallas(datosAudiometria, datosLogoaudiometria, entidad) {
  console.log('\n========== PRUEBA DE PDF EN DIFERENTES PANTALLAS ==========');
  
  const imagenes = await this.cargarImagenes();
  const html = this.generarCombinadoHTML(datosAudiometria, datosLogoaudiometria, entidad, imagenes);
  
  // Guardar HTML para revisar
  const debugPath = path.join(this.getDownloadsPath(), 'debug_prueba_pantallas.html');
  fs.writeFileSync(debugPath, html);
  console.log(`💾 HTML guardado en: ${debugPath}`);
  console.log('📂 Abre este archivo en Chrome para ver cómo se verá el PDF');
  console.log('🔍 Presiona F12 y selecciona "Toggle device toolbar" (ícono de teléfono)');
  console.log('📱 Puedes cambiar el tamaño de pantalla para simular diferentes monitores');
  console.log('');
  console.log('✅ Si el HTML se ve bien en cualquier tamaño, el PDF se verá igual');
  console.log('===============================================================\n');
  
  // Abrir el HTML en el navegador predeterminado
  const { exec } = require('child_process');
  if (process.platform === 'win32') {
    exec(`start ${debugPath}`);
  } else if (process.platform === 'darwin') {
    exec(`open ${debugPath}`);
  } else {
    exec(`xdg-open ${debugPath}`);
  }
  
  return debugPath;
}


/**
 * VERIFICACIÓN EN CONSOLA DEL NAVEGADOR
 * Expone datos para que puedas inspeccionarlos desde F12
 */
async verificarEnConsola(datosAudiometria, datosLogoaudiometria, entidad) {
  console.log('\n========== VERIFICACIÓN EN CONSOLA ==========');
  
  // Generar el HTML combinado
  const imagenes = await this.cargarImagenes();
  const html = this.generarCombinadoHTML(datosAudiometria, datosLogoaudiometria, entidad, imagenes);
  
  // Guardar HTML
  const debugPath = path.join(this.getDownloadsPath(), 'verificacion_consola.html');
  fs.writeFileSync(debugPath, html);
  
  // Crear ventana con DevTools abiertos
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      zoomFactor: 1.0,
      devTools: true  // <-- FORZAR DEVTOOLS
    }
  });
  
  // Cargar el HTML
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  
  // ABRIR DEVTOOLS AUTOMÁTICAMENTE
  win.webContents.openDevTools({ mode: 'detach' });
  
  // Inyectar datos en la consola del navegador
  await win.webContents.executeJavaScript(`
    // Exponer datos para inspeccionar en consola
    window.__datosPrueba = {
      anchoVentana: window.innerWidth,
      altoVentana: window.innerHeight,
      fecha: new Date().toLocaleString(),
      elementos: {
        header: document.querySelector('.header') ? '✅ OK' : '❌ No encontrado',
        fecha: document.querySelector('.fecha') ? '✅ OK' : '❌ No encontrado',
        paciente: document.querySelector('.datos-paciente') ? '✅ OK' : '❌ No encontrado',
        otoscopia: document.querySelector('.otoscopia-container') ? '✅ OK' : '❌ No encontrado',
        graficas: document.querySelectorAll('.grafica-img').length,
        diagnosticos: document.querySelectorAll('.diagnostico-texto').length
      }
    };
    
    console.log('✅ VERIFICACIÓN EN CONSOLA');
    console.log('📐 Tamaño de ventana:', window.innerWidth, 'x', window.innerHeight);
    console.log('📊 Elementos encontrados:', window.__datosPrueba.elementos);
    console.log('');
    console.log('💡 Para probar diferentes tamaños, usa:');
    console.log('   - document.documentElement.style.width = "1920px"');
    console.log('   - document.documentElement.style.width = "1366px"');
    console.log('   - document.documentElement.style.width = "2560px"');
    console.log('');
    console.log('📱 O cambia el tamaño desde el "Toggle device toolbar" (ícono 📱)');
  `);
  
  console.log('✅ Ventana abierta con DevTools');
  console.log('📐 Tamaño fijo: 1200x900');
  console.log('🔍 Revisa la consola del navegador (F12)');
  console.log('💡 Cierra la ventana cuando termines');
  
  return new Promise((resolve) => {
    win.on('closed', () => {
      console.log('✅ Verificación completada');
      resolve();
    });
  });
}


}

module.exports = new PDFGeneratorUnified();