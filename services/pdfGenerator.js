
const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

class PDFGenerator {
  constructor() {
    this.imagesPath = path.join(__dirname, '../assets/images');
    
   this.configuracionQR = {
  habilitado: true  // Por defecto los PDFs llevarán QR
};



    console.log('\n========== PDFGenerator DIAGNÓSTICO ==========');
    console.log('1. Directorio actual:', __dirname);
    console.log('2. Ruta de imágenes:', this.imagesPath);
    console.log('3. ¿Existe la carpeta?', fs.existsSync(this.imagesPath));
    
    if (fs.existsSync(this.imagesPath)) {
      const files = fs.readdirSync(this.imagesPath);
      console.log('4. Archivos encontrados:', files);
    }
    console.log('===============================================\n');
  }

  ponerQR(habilitado) {
  if (typeof habilitado === 'boolean') {
    this.configuracionQR.habilitado = habilitado;
    console.log(`QR ${habilitado ? 'HABILITADO' : 'DESHABILITADO'}`);
    return true;
  }
  return false;
}

  getDownloadsPath() {
    const homeDir = os.homedir();
    return path.join(homeDir, 'Downloads');
  }

  probarImagen(imageName) {
    const imagePath = path.join(this.imagesPath, imageName);
    if (fs.existsSync(imagePath)) {
      return true;
    }
    return false;
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

async generarPDF(datos, entidad, tipo = 'logoaudiometria') {
    try {
        console.log(`\n========== generarPDF ==========`);
        console.log(`Entidad: ${entidad}`);
        console.log(`Tipo: ${tipo}`);
        console.log(`Datos recibidos - PTA:`, JSON.stringify(datos.pta, null, 2));
        console.log(`Datos recibidos - valores_od:`, datos.valores_od);
        console.log(`Datos recibidos - valores_oi:`, datos.valores_oi);
        
        let headerBase64 = null;
        let footerBase64 = null;
        let oidoLogoBase64 = null;

        let qrBase64 = null;
        const testQR = this.probarImagen('qr.jpeg') || this.probarImagen('qr.png');
        if (this.configuracionQR.habilitado && testQR) {
            const qrImageName = fs.existsSync(path.join(this.imagesPath, 'qr.jpeg')) ? 'qr.jpeg' : 'qr.png';
            qrBase64 = this.imageToBase64(qrImageName);
        }

        let selloBase64 = null;
        const testSello = this.probarImagen('sello.png') || this.probarImagen('sello.jpeg') || this.probarImagen('sello.jpg');
        if (testSello) {
            const selloImageName = fs.existsSync(path.join(this.imagesPath, 'sello.png')) ? 'sello.png' : fs.existsSync(path.join(this.imagesPath, 'sello.jpeg')) ? 'sello.jpeg' : 'sello.jpg';
            selloBase64 = this.imageToBase64(selloImageName);
        }

        // Obtener imágenes
        const testHeader = this.probarImagen('header_uda.jpeg');
        const testFooter = this.probarImagen('footer_uda.jpeg');
        const testOidoLogo = this.probarImagen('oido_logo.jpeg');
        
        if (testHeader) headerBase64 = this.imageToBase64('header_uda.jpeg');
        if (testFooter) footerBase64 = this.imageToBase64('footer_uda.jpeg');
        if (testOidoLogo) oidoLogoBase64 = this.imageToBase64('oido_logo.jpeg');
        
        console.log('Estado de imágenes:', {
            header: !!headerBase64,
            footer: !!footerBase64,
            oidoLogo: !!oidoLogoBase64
        });
        
        // ✅ GENERAR EL HTML CORRECTO SEGÚN EL TIPO
        let html;
        if (tipo === 'audiometria') {
            html = this.generarAudiometriaHTML(datos, entidad, {
                headerBase64,
                footerBase64,
                oidoLogoBase64,
                qrBase64,
                selloBase64,
                qrHabilitado: this.configuracionQR.habilitado
            });
        } else {
            html = this.generarLogoaudiometriaHTML(datos, entidad, {
                headerBase64,
                footerBase64,
                oidoLogoBase64,
                qrBase64,
                selloBase64,
                qrHabilitado: this.configuracionQR.habilitado
            });
        }
        
        // Guardar HTML para debug (solo si es logoaudiometria para no confundir)
        if (tipo !== 'audiometria') {
            const debugPath = path.join(this.getDownloadsPath(), 'debug_logoaudiometria.html');
            fs.writeFileSync(debugPath, html);
            console.log(`💾 HTML guardado en: ${debugPath}`);
        }
        
        // Crear ventana y generar PDF
        const win = new BrowserWindow({
            width: 1200,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const downloadsPath = this.getDownloadsPath();
        const fecha = new Date();
        const fechaStr = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}_${fecha.getHours()}-${fecha.getMinutes()}-${fecha.getSeconds()}`;
        
        // ✅ NOMBRE CORRECTO SEGÚN EL TIPO
        const nombreArchivo = tipo === 'audiometria' ? 'Audiometria' : 'Logoaudiometria';
        const pdfPath = path.join(downloadsPath, `${datos.paciente.nombre || 'paciente'}_${nombreArchivo}_${fechaStr}.pdf`);
        
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
        return pdfPath;
    } catch (error) {
        console.error('❌ Error en generarPDF:', error);
        throw error;
    }
}


  /*
  async generarPDF(datos, entidad, tipo = 'logoaudiometria') {
    try {
      console.log(`\n========== generarPDF ==========`);
      console.log(`Entidad: ${entidad}`);
      console.log(`Tipo: ${tipo}`);
      console.log(`Datos recibidos - PTA:`, JSON.stringify(datos.pta, null, 2));
      console.log(`Datos recibidos - valores_od:`, datos.valores_od);
      console.log(`Datos recibidos - valores_oi:`, datos.valores_oi);
      
      let headerBase64 = null;
      let footerBase64 = null;
      let oidoLogoBase64 = null;

      let qrBase64 = null;
const testQR = this.probarImagen('qr.jpeg') || this.probarImagen('qr.png');
if (this.configuracionQR.habilitado && testQR) {
  const qrImageName = fs.existsSync(path.join(this.imagesPath, 'qr.jpeg')) ? 'qr.jpeg' : 'qr.png';
  qrBase64 = this.imageToBase64(qrImageName);
}
      


let selloBase64 = null;

const testSello =
  this.probarImagen('sello.png') ||
  this.probarImagen('sello.jpeg') ||
  this.probarImagen('sello.jpg');

if (testSello) {
  const selloImageName =
    fs.existsSync(path.join(this.imagesPath, 'sello.png'))
      ? 'sello.png'
      : fs.existsSync(path.join(this.imagesPath, 'sello.jpeg'))
      ? 'sello.jpeg'
      : 'sello.jpg';

  selloBase64 = this.imageToBase64(selloImageName);
}
      // Obtener imágenes
      const testHeader = this.probarImagen('header_uda.jpeg');
      const testFooter = this.probarImagen('footer_uda.jpeg');
      const testOidoLogo = this.probarImagen('oido_logo.jpeg');
      
      if (testHeader) headerBase64 = this.imageToBase64('header_uda.jpeg');
      if (testFooter) footerBase64 = this.imageToBase64('footer_uda.jpeg');
      if (testOidoLogo) oidoLogoBase64 = this.imageToBase64('oido_logo.jpeg');
      
      console.log('Estado de imágenes:', {
        header: !!headerBase64,
        footer: !!footerBase64,
        oidoLogo: !!oidoLogoBase64
      });
      
      // Generar HTML
const html = this.generarLogoaudiometriaHTML(datos, entidad, {
  headerBase64,
  footerBase64,
  oidoLogoBase64,
  qrBase64,
  selloBase64,
  qrHabilitado: this.configuracionQR.habilitado
});
      
      // Guardar HTML para debug
      const debugPath = path.join(this.getDownloadsPath(), 'debug_logoaudiometria.html');
      fs.writeFileSync(debugPath, html);
      console.log(`💾 HTML guardado en: ${debugPath}`);
      console.log(`🔍 Revisa el archivo HTML para ver si el PTA aparece. Busca "PTA (dB)" en el archivo.`);
      
      // Crear ventana y generar PDF
      const win = new BrowserWindow({
        width: 1200,
        height: 900,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });
      
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const downloadsPath = this.getDownloadsPath();
      const fecha = new Date();
      const fechaStr = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}_${fecha.getHours()}-${fecha.getMinutes()}-${fecha.getSeconds()}`;
      const pdfPath = path.join(downloadsPath, `${datos.paciente.nombre || 'paciente'}_Logoaudiometria_${fechaStr}.pdf`);
      
      /*
      const pdfData = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        landscape: false
      }); 
     --
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
      return pdfPath;
    } catch (error) {
      console.error('❌ Error en generarPDF:', error);
      throw error;
    }
  }

  */

generarLogoaudiometriaHTML(datos, entidad, imagenes) {
    console.log('\n========== generarLogoaudiometriaHTML ==========');
    console.log('Datos.pta recibido en HTML:', datos.pta);
    
    // Obtener mes actual
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaActual = new Date();
    const ciudad = 'Cúcuta';
    const mesActual = meses[fechaActual.getMonth()];
    const añoActual = fechaActual.getFullYear();
    const fechaTexto = `${ciudad}, ${mesActual} ${añoActual}`;
    const otoscopia = datos.otoscopia || '';
    
    // Obtener valores
    const od = datos.valores_od || {};
    const oi = datos.valores_oi || {};
    const diagnostico = datos.diagnostico || '';
    const diagnostico_od = datos.diagnostico_od || '';
    const diagnostico_oi = datos.diagnostico_oi || '';

    // 🔥 Obtener flags de NR desde los datos (vienen del frontend)
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

    // Imagen del oído
    const oidoLogoHTML = imagenes.oidoLogoBase64 ? 
      `<img src="${imagenes.oidoLogoBase64}" alt="Oído" class="oido-img">` : 
      `<svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 10 C30 10 15 30 15 50 C15 70 30 85 45 85 C55 85 60 75 60 65 C60 55 50 50 45 50 C40 50 35 55 35 60" stroke="#333" stroke-width="2" fill="none"/>
        <circle cx="50" cy="30" r="5" fill="#333"/>
        <path d="M50 10 C70 10 85 30 85 50 C85 70 70 85 55 85 C45 85 40 75 40 65" stroke="#333" stroke-width="2" fill="none" stroke-dasharray="4,2"/>
      </svg>`;

    // Header HTML
    const headerHTML = imagenes.headerBase64 ? 
      `<div class="header"><img src="${imagenes.headerBase64}" alt="Header"></div>` : 
      `<div class="header"><h1 style="color:#1e3a8a; margin:0; font-family: Arial, sans-serif;">AUDIOLOGÍA CLÍNICA</h1></div>`;

    // Footer HTML
    const footerHTML = imagenes.footerBase64 ?
      `<div class="footer"><img src="${imagenes.footerBase64}" alt="Footer"></div>` : 
      `<div class="footer"><p style="margin:0; font-family: Arial, sans-serif; font-size: 10px;">Sistema de Gestión Audiológica</p></div>`;

    let qrHTML = '';
    if (imagenes.qrHabilitado && imagenes.qrBase64) {
      qrHTML = `
        <div class="qr-central">
          <img src="${imagenes.qrBase64}" alt="QR">
        </div>
      `;
    }

    let selloHTML = '';
    if (imagenes.selloBase64) {
      selloHTML = `
        <div class="sello-central">
          <img src="${imagenes.selloBase64}" alt="Sello">
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Logoaudiometría - ${entidad}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 20px 30px;
            font-size: 12px;
            line-height: 1.4;
            background: white;
            position: relative;
          }
          
          .header {
            position: relative;
            top: 0;
            left: 0;
            right: 0;
            text-align: center;
            width: 100%;
            margin-bottom: 20px;
          }

          /* 🔥 ESTILOS PARA NR POR OÍDO - CORREGIDO */
          .valor-nr-od { color: #e74c3c !important; font-weight: bold; font-size: 14px; }
          .valor-nr-oi { color: #3498db !important; font-weight: bold; font-size: 14px; }
          .valor-od { color: #e74c3c; font-weight: bold; }
          .valor-oi { color: #3498db; font-weight: bold; }

          .header img {
            width: 100%;
            max-height: 140px;
            object-fit: contain;
          }
          
          .fecha {
            text-align: left;
            font-size: 11px;
            margin-bottom: 20px;
            font-weight: normal;
            font-family: Arial, sans-serif;
          }
          
          .datos-paciente {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
          }
          
          .info-paciente {
            flex: 2;
          }
          
          .info-paciente p {
            margin: 5px 0;
            font-size: 16px;
            line-height: 1.5;
            font-family: Arial, sans-serif;
          }
          
          .info-paciente strong {
            font-weight: bold;
            min-width: 80px;
            display: inline-block;
            font-size: 16px;  
          }
          
          .oido-imagen {
            flex: 1;
            text-align: right;
          }
          
          .oido-img {
            max-width: 210px;
            max-height: 210px;
            width: auto;
            height: auto;
            object-fit: contain;
          }

          .qr-central {
            position: absolute;
            top: 150px;
            left: 47%;
            transform: translateX(-50%);
            z-index: 100;
          }

          .qr-central img {
            width: 90px;
            height: 90px;
          }
          
          .otoscopia-texto {
            margin-top: 10px;
            font-size: 9px;
            color: #555;
            text-align: center;
            max-width: 210px;
            line-height: 1.3;
          }
          
          .titulo-principal {
            text-align: center;
            margin: 5px 0;
            position: relative;
          }
          .titulo-principal h2 {
            color: #1e3a8a;
            font-size: 18px;
            font-weight: bold;
            font-family: Arial, sans-serif;
            letter-spacing: 1px;
            margin-bottom: 5px;
          }
          
          .grafica-container {
            text-align: center;
            margin: 8px 0;
            page-break-inside: avoid;
            width: 100%;
            padding: 0;
          }
          
          .grafica-container img {
            width: 100%;
            max-height: 280px;
            height: auto;
            border: none;
            object-fit: contain;
          }
          
          .two-columns {
            display: flex;
            gap: 30px;
            margin: 10px 0;
            page-break-inside: avoid;
          }
          
          .columna-derecha {
            flex: 1;
          }
          
          .columna-izquierda {
            flex: 1;
          }

          .tabla-valores {
            width: 100%;
            border-collapse: collapse;
            font-size: 9px;
            margin: 0;
          }
          
.tabla-valores th, 
.tabla-valores td {
    border: 1px solid #bababa;
    padding: 6px 4px;
    text-align: center;
}
          .tabla-valores th {
            background-color: white;
            font-weight: bold;
          }
          
          .tabla-valores td:first-child {
            text-align: left;
            font-weight: bold;
          }
          
          .unidad {
            font-size: 9px;
            color: #555;
          }
          
          .diagnostico-box {
            margin-bottom: 20px;
          }
          
          .diagnostico-titulo {
            font-weight: bold;
            font-size: 12px;
            margin-top: 0;
            margin-bottom: 10px;
            font-family: Arial, sans-serif;
          }
          
          .diagnostico-subtitulo {
            font-weight: bold;
            font-size: 11px;
            margin-top: 12px;
            margin-bottom: 5px;
            font-family: Arial, sans-serif;
          }
          
          .diagnostico-texto {
            font-size: 11px;
            line-height: 1.5;
            margin-left: 5px;
            white-space: pre-wrap;
            font-family: Arial, sans-serif;
          }
          
          .observaciones {
            margin-top: 20px;
          }
          
          .observaciones .diagnostico-titulo {
            margin-top: 0;
          }
          
          .sello-central {
            position: fixed;
            top: 630px;
            left: 50%;
            z-index: 99999;
          }

/* ============================================================
   DIAGNÓSTICO - ESTILO SOBRIO Y PROFESIONAL
   ============================================================ */
.diagnostico-container {
    margin: 20px 0 15px 0;
    padding: 12px 10px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: #fcfcfc;
}

.diagnostico-titulo {
    font-weight: 600;
    font-size: 12px;
    margin-bottom: 10px;
    color: #333333;
    font-family: Arial, sans-serif;
    text-align: center;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.tabla-diagnostico {
    width: 100%;
    border-collapse: collapse;
    margin: 0 auto;
}

.tabla-diagnostico td {
    padding: 6px 8px;
    text-align: left;
    font-size: 10.5px;
    font-family: Arial, sans-serif;
    border-bottom: 1px solid #e8e8e8;
}

.tabla-diagnostico tr:last-child td {
    border-bottom: none;
}

.label-diagnostico {
    font-weight: 600;
    width: 30%;
    color: #444444;
    padding-right: 12px;
}

.valor-diagnostico {
    width: 70%;
    color: #222222;
    white-space: pre-wrap;
    word-wrap: break-word;
    padding-left: 4px;
}

          .sello-central img {
            width: 400px;
            height: 500px;
            opacity: 1;
          }

          .diagnostico-container {
    margin: 20px 0 15px 0;
    padding: 12px 10px;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    background: #fcfcfc;
}
          
          .footer {
            position: fixed;
            bottom: 10px;
            left: 0;
            right: 0;
            text-align: center;
            width: 100%;
          }
          .footer img {
            width: 100%;
            max-height: 140px;
            object-fit: contain;
          }
          
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .footer {
              position: fixed;
              bottom: 0;
            }
          }
        </style>
      </head>
      <body>
        ${headerHTML}
        ${qrHTML}
        
        <div class="fecha">
          ${fechaTexto}
        </div>
        
        <div class="datos-paciente">
          <div class="info-paciente">
            <p><strong>Nombre:</strong> ${datos.paciente?.nombre || ''}</p>
            <p><strong>C.C.:</strong> ${datos.paciente?.documento || ''}</p>
            <p><strong>Entidad:</strong> ${entidad || ''}</p>
          </div>
          <div class="oido-imagen">
            ${oidoLogoHTML}
            ${otoscopia ? `<div class="otoscopia-texto"><strong>OBS. OTOSCOPIA:</strong><br>${otoscopia.substring(0, 80)}${otoscopia.length > 80 ? '...' : ''}</div>` : ''}
          </div>
        </div>
        
        <div class="titulo-principal">
          <h2>LOGOAUDIOMETRÍA</h2>
        </div>
        
        <div class="grafica-container">
          <img src="${datos.grafica_logo_base64 || ''}" alt="Gráfica de Logoaudiometría">
        </div>
        
        <div class="two-columns">
          <div class="columna-izquierda">

<div class="diagnostico-container">
  <div class="diagnostico-titulo">DIAGNÓSTICO</div>
  <table class="tabla-diagnostico">
    <tr>
      <td class="label-diagnostico">Oído Derecho:</td>
      <td class="valor-diagnostico">${diagnostico_od || ''}</td>
    </tr>
    <tr>
      <td class="label-diagnostico">Oído Izquierdo:</td>
      <td class="valor-diagnostico">${diagnostico_oi || ''}</td>
    </tr>
  </table>
</div>

     
  <div class="diagnostico-container observaciones">
  <div class="diagnostico-titulo">OBSERVACIONES</div>
  <div class="diagnostico-texto">${diagnostico || ''}</div>
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
                  <td>U. Voz</td>
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
                  <td>U. Palabras</td>
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
                  <td>U. Discriminación</td>
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
                  <td>% Discriminación</td>
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
        
        ${selloHTML}
        ${footerHTML}
      </body>
      </html>
    `;
    
    console.log('✅ HTML generado, longitud:', htmlContent.length);
    
    return htmlContent;
}

  async generarPDFAudiometria(datos, entidad) {
    try {
        console.log(`\n========== generarPDFAudiometria ==========`);
        console.log(`Entidad: ${entidad}`);
        console.log(`Datos PTA recibidos:`, datos.pta);
        
        let headerBase64 = null;
        let footerBase64 = null;
        let oidoLogoBase64 = null;

        let qrBase64 = null;

        let selloBase64 = null;

      

const testSello =
  this.probarImagen('sello.png') ||
  this.probarImagen('sello.jpeg') ||
  this.probarImagen('sello.jpg');

if (testSello) {
  const selloImageName =
    fs.existsSync(path.join(this.imagesPath, 'sello.png'))
      ? 'sello.png'
      : fs.existsSync(path.join(this.imagesPath, 'sello.jpeg'))
      ? 'sello.jpeg'
      : 'sello.jpg';

  selloBase64 = this.imageToBase64(selloImageName);
}


const testQR = this.probarImagen('qr.jpeg') || this.probarImagen('qr.png');
if (this.configuracionQR.habilitado && testQR) {
  const qrImageName = fs.existsSync(path.join(this.imagesPath, 'qr.jpeg')) ? 'qr.jpeg' : 'qr.png';
  qrBase64 = this.imageToBase64(qrImageName);
}
        
        const testHeader = this.probarImagen('header_uda.jpeg');
        const testFooter = this.probarImagen('footer_uda.jpeg');
        const testOidoLogo = this.probarImagen('oido_logo.jpeg');
        
        if (testHeader) headerBase64 = this.imageToBase64('header_uda.jpeg');
        if (testFooter) footerBase64 = this.imageToBase64('footer_uda.jpeg');
        if (testOidoLogo) oidoLogoBase64 = this.imageToBase64('oido_logo.jpeg');
        
        const html = this.generarAudiometriaHTML(datos, entidad, {
            headerBase64,
            footerBase64,
            oidoLogoBase64,
            qrBase64,  
            selloBase64,            // <-- AGREGAR
            qrHabilitado: this.configuracionQR.habilitado// <-- AGREGAR
            
        });
        
        const win = new BrowserWindow({
            width: 1200,
            height: 900,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        });
        
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const downloadsPath = this.getDownloadsPath();
        const fecha = new Date();
        const fechaStr = `${fecha.getFullYear()}-${fecha.getMonth()+1}-${fecha.getDate()}_${fecha.getHours()}-${fecha.getMinutes()}-${fecha.getSeconds()}`;
        const pdfPath = path.join(downloadsPath, `${datos.paciente.nombre || 'paciente'}_Audiometria_${fechaStr}.pdf`);
        
        
        /*
        const pdfData = await win.webContents.printToPDF({
            pageSize: 'A4',
            printBackground: true,
            landscape: false
        });
        */
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
        return pdfPath;
    } catch (error) {
        console.error('❌ Error en generarPDFAudiometria:', error);
        throw error;
    }
  }

generarAudiometriaHTML(datos, entidad, imagenes) {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaActual = new Date();
    const ciudad = 'Cúcuta';
    const mesActual = meses[fechaActual.getMonth()];
    const añoActual = fechaActual.getFullYear();
    const fechaTexto = `${ciudad}, ${mesActual} ${añoActual}`;

    const od = datos.valores_od || {};
    const oi = datos.valores_oi || {};
    const freqs = (datos.freqs || ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'])
    .filter(f => f !== '125' && f !== '125Hz' && f !== '125 Hz');
    const otoscopia = datos.otoscopia || '';
    const pta = datos.pta || {};

    const headerHTML = imagenes.headerBase64 ? 
        `<div class="header"><img src="${imagenes.headerBase64}" alt="Header"></div>` : 
        `<div class="header"><h1 style="color:#1e3a8a;">AUDIOLOGÍA CLÍNICA</h1></div>`;

    const footerHTML = imagenes.footerBase64 ?
        `<div class="footer"><img src="${imagenes.footerBase64}" alt="Footer"></div>` : 
        `<div class="footer"><p>Sistema de Gestión Audiológica</p></div>`;

    const oidoLogoHTML = imagenes.oidoLogoBase64 ? 
        `<img src="${imagenes.oidoLogoBase64}" alt="Oído" class="oido-img">` : 
        `<svg width="120" height="120" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="#333" stroke-width="2" fill="none"/></svg>`;

        // Código QR - solo si está habilitado
// Código QR - solo si está habilitado
let qrHTML = '';

if (imagenes.qrHabilitado && imagenes.qrBase64) {
  qrHTML = `
    <div class="qr-central">
      <img src="${imagenes.qrBase64}" alt="QR">
    </div>
  `;
}

let selloHTML = '';

if (imagenes.selloBase64) {
  selloHTML = `
    <div class="sello-central">
      <img src="${imagenes.selloBase64}" alt="Sello">
    </div>
  `;
}

    let tablaRows = '';
    freqs.forEach(f => {
        tablaRows += `
            <tr>
                <td style="border: 1px solid black; padding: 4px 3px; text-align: left; font-weight: bold;">${f} Hz</td>
                <td class="valor-od" style="border: 1px solid black; padding: 4px 3px; text-align: center;">${od[f] || '—'} <span class="unidad">dB</span></td>
                <td class="valor-oi" style="border: 1px solid black; padding: 4px 3px; text-align: center;">${oi[f] || '—'} <span class="unidad">dB</span></td>
            </tr>
        `;
    });

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
                     padding: 20px 50px 20px 100px; 
                    font-size: 12px;
                    background: white;
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
    
.header { text-align: center; margin-bottom: 20px; width: 100%; }
                .header img { width: 100%; max-height: 140px; object-fit: contain; }
                .fecha { text-align: left; font-size: 11px; margin-bottom: 20px; }
                .datos-paciente {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

.qr-central {
    position: absolute;
    top: 150px;
    left: 47%;
    transform: translateX(-50%);
    z-index: 100;
}

.qr-central img {
    width: 90px;
    height: 90px;
}

                .info-paciente { flex: 2; }
                .info-paciente p { margin: 5px 0; font-size: 16px; }
                .info-paciente strong { min-width: 80px; display: inline-block;  font-size: 16px;  }
                .oido-imagen { flex: 1; text-align: right; }
                .oido-img { max-width: 120px; max-height: 120px; object-fit: contain; }
                .otoscopia-texto { margin-top: 10px; font-size: 9px; color: #555; text-align: left; max-width: 200px; }
                .titulo-principal { text-align: center; margin: 10px 0; }
                .titulo-principal h2 { color: #1e3a8a; font-size: 18px; }


  .qr-container {
    margin-bottom: 10px;
    text-align: right;
}

.qr-img {
    max-width: 100px;
    max-height: 100px;
    width: auto;
    height: auto;
}              

                /* GRAFICA MAS ANCHA - OCUPA TODO EL ANCHO */
                .grafica-container { 
    text-align: center; 
    margin: 5px auto 15px auto;  /* ← auto centra el contenedor */
 
    max-width: 800px;
                  
                }
                .grafica-container img { 
                    width: 100%; 
                    max-height: 400px; 
                    height: auto; 
                    border: none; 
                    object-fit: contain;
                }
                
                .two-columns { display: flex; gap: 40px; margin: 15px 0; }
                .columna-derecha { flex: 1; }
                .columna-izquierda { flex: 1; }
                
                .tabla-valores {
                    width: 90%;
                    border-collapse: collapse;
                    font-size: 7.5px;  
             <!--  position: relative; -->
                    margin: 0 auto; 
                   transform: translateY(-340px) translateX(30px);   /* ← SUBE 60px */
                  
                
                }


.tabla-valores th, 
.tabla-valores td {
    border: 1px solid #bababa;
    padding: 3px 4px;        /* ← REDUCIR padding de 6px a 3px */
    text-align: center;
    font-size: 7.5px;        /* ← IGUALAR tamaño */
}


                .tabla-valores th {
    background-color: white;
    font-weight: bold;
    font-size: 7.5px;        /* ← IGUALAR tamaño */
}
            .tabla-valores td:first-child {
    text-align: left;
    font-weight: bold;
    font-size: 7.5px;        /* ← IGUALAR tamaño */
}

                .valor-od { color: #e74c3c; font-weight: bold; }
                .valor-oi { color: #3498db; font-weight: bold; }
                .unidad { font-size: 7px; color: #555; font-weight: normal; }
                
                .diagnostico-box { margin-bottom: 20px; }
                .diagnostico-titulo { font-weight: bold; font-size: 12px; margin-bottom: 10px; }
                .diagnostico-subtitulo { font-weight: bold; font-size: 11px; margin-top: 12px; margin-bottom: 5px; }
                .diagnostico-texto { font-size: 11px; line-height: 1.5; white-space: pre-wrap; }
                
                /* TABLA PTA SIMPLE - SIN BORDES INNECESARIOS, SIN COLORES */

/* ============================================================
   TABLA PTA - CORREGIDA
   ============================================================ */
.pta-container {
 position: fixed;   
    display: inline-block;
    background: white;
    border: 1px solid #fffefe;
    border-radius: 4px;
    padding: 0;
    margin-top: 15px;
    margin-bottom: 10px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
     z-index: 999999;   
}

.pta-titulo {
    font-weight: bold;
    font-size: 13px;
    text-align: center;
    padding: 6px 10px;
    background: #ffffff;
    border-bottom: 1px solid #ffffff;
    color: #333;
    letter-spacing: 1px;
}

.pta-simple {
    border-collapse: collapse;
    font-size: 14px;
    width: 100%;
    background: white;
}

.pta-simple td, .pta-simple th {
    border: 1px solid #999;
    padding: 8px 14px;
    text-align: center;
}

.pta-simple th {
    background-color: white;   /* ← FONDO BLANCO */
    font-weight: bold;
    font-size: 14px;
}

/* === NUEVO: Diagnóstico y Observaciones lado a lado === */
.dx-obs-row {
    display: flex;
    flex-direction: row;
    gap: 2mm;
    width: 100%;  /* ← CAMBIO: de 85mm a 100% */
    margin: 0 0 10px 0;
}

/* Contenedor de diagnósticos (OD + OI) */
.dx-diagnosticos {
    display: flex;
    flex-direction: row;
    gap: 2mm;
    width: 100%;  /* ← Cambia este valor para dar más/menos ancho */
    flex-shrink: 0;  /* ← Evita que se encoja */
}

/* Contenedor de observaciones */
.dx-observaciones {
    width: 100%;  /* ← Cambia este valor para dar más/menos ancho */
    flex-shrink: 0;  /* ← Evita que se encoja */
}

.dx-obs-box {
    box-sizing: border-box;
    border: 1px solid #d0d0d0;
    border-radius: 1mm;
    background: #fcfcfc;
    padding: 2mm;
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    page-break-inside: auto;
}

/* Anchos específicos para cada tipo */
.dx-diagnostico-od {
    flex: 1;  /* ← SIN CAMBIO */
}

.dx-diagnostico-oi {
    flex: 1;  /* ← SIN CAMBIO */
}

.dx-observacion {
    flex: 1;  /* ← SIN CAMBIO */
}

.dx-obs-box .diagnostico-titulo {
    font-size: 9px;
    text-align: center;
    text-transform: uppercase;
    border-bottom: 1px solid #e0e0e0;
    padding-bottom: 1mm;
    margin-bottom: 2mm;
}

.dx-obs-box .diagnostico-texto {
    font-size: 8.5px;
    line-height: 1.4;
    white-space: pre-wrap;
}

.otoscopia-container {
    margin: 5px 0 5px 18px;    /* ← CAMBIAR: 18px de margen izquierdo */
    padding: 4px 15px;
    font-size: 9px;
    background: #ffffff;       /* ← CAMBIAR: fondo gris claro */
    border-left: 3px solid #1e3a8a;
}


.pta-simple td:first-child {
    font-weight: bold;
    background-color: white;   /* ← FONDO BLANCO */
    font-size: 14px;
}

.pta-valor-od {
    color: #e74c3c !important;   /* ROJO para OD */
    font-weight: bold;
}

.pta-valor-oi {
    color: #3498db !important;   /* AZUL para OI */
    font-weight: bold;
}
                
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
               ${qrHTML}
            <div class="fecha">${fechaTexto}</div>

          
            
            <div class="datos-paciente">
                <div class="info-paciente">
                    <p><strong>Nombre:</strong> ${datos.paciente?.nombre || ''}</p>
                    <p><strong>C.C.:</strong> ${datos.paciente?.documento || ''}</p>
                    <p><strong>Entidad:</strong> ${entidad || ''}</p>
                </div>
                <div class="oido-imagen">
              
                    ${oidoLogoHTML}
            

                </div>
            </div>

                             ${otoscopia && otoscopia.trim() !== '' 
    ? `<div class="otoscopia-container"><strong>OTOSCOPIA:</strong> ${otoscopia}</div>`
    : `<div class="otoscopia-container"><strong>OTOSCOPIA:</strong></div>`
}
            
            <div class="titulo-principal">
                <h2>AUDIOMETRÍA TONAL</h2>
            </div>
            
            <div class="grafica-container">
                <img src="${datos.grafica_tonal_base64 || ''}" alt="Audiometría Tonal">
            </div>
            
            <div class="two-columns">
      

<div class="columna-izquierda">
    <div class="dx-obs-row">
        <!-- Contenedor de diagnósticos -->
        <div class="dx-diagnosticos">
            <div class="dx-obs-box dx-diagnostico-od">
                <div class="diagnostico-titulo">DIAGNÓSTICO</div>
                <div class="diagnostico-texto">${datos.diagnostico_od || ''}</div>
            </div>

        </div>
        
        <!-- Contenedor de observaciones -->
        <div class="dx-observaciones">
            <div class="dx-obs-box dx-observacion">
                <div class="diagnostico-titulo">OBSERVACIONES</div>
                <div class="diagnostico-texto">${datos.observaciones || ''}</div>
            </div>
        </div>
    </div>
                 
                    

                    <div class="pta-container">
    <div class="pta-titulo">PROMEDIO TONAL</div>
    <table class="pta-simple">
        <thead>
            <tr>
                <th></th>
                <th>V.A</th>
                <th>V.O</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>O.D.</td>
                <td class="pta-valor-od">${(pta.od_air !== undefined && pta.od_air !== null) ? pta.od_air + ' dB' : '--'}</td>
                <td class="pta-valor-od">${(pta.od_bone !== undefined && pta.od_bone !== null) ? pta.od_bone + ' dB' : '--'}</td>
            </tr>
            <tr>
                <td>O.I.</td>
                <td class="pta-valor-oi">${(pta.oi_air !== undefined && pta.oi_air !== null) ? pta.oi_air + ' dB' : '--'}</td>
                <td class="pta-valor-oi">${(pta.oi_bone !== undefined && pta.oi_bone !== null) ? pta.oi_bone + ' dB' : '--'}</td>
            </tr>
        </tbody>
    </table>
</div>



                </div>
                <div class="columna-derecha">
                    <table class="tabla-valores">
                        <thead>
                            <tr><th>Frecuencia</th><th>OD</th><th>OI</th></tr>
                        </thead>
                        <tbody>${tablaRows}</tbody>
                    </table>
                </div>
            </div>
            ${selloHTML}
            ${footerHTML}
        </body>
        </html>
    `;
}
}

module.exports = new PDFGenerator();