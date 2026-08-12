
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');  // ← AGREGAR ESTA LÍNEA


class PDFGeneratorCoosaludUnified {



  constructor() {
    this.imagesPath = path.join(__dirname, '../assets/images');
    
    console.log('\n========== PDFGeneratorCoosaludUnified INICIALIZADO ==========');
    console.log('Ruta de imágenes:', this.imagesPath);
    console.log('¿Existe la carpeta?', fs.existsSync(this.imagesPath));
    
    if (fs.existsSync(this.imagesPath)) {
      const files = fs.readdirSync(this.imagesPath);
      console.log('Archivos encontrados:', files);
    }
    console.log('===============================================================\n');
  }

    drawWrappedTextInArea(page, text, x, y, width, height, fontSize, font, color = rgb(0, 0, 0), fromTop) {
    if (!text || text === '') return;
    
    const lineHeight = fontSize * 1.3;
    const padding = 4;
    const maxLines = Math.floor((height - (padding * 2)) / lineHeight);
    
    // Separar por saltos de línea
    const paragraphs = text.split('\n');
    const lines = [];
    
    for (const paragraph of paragraphs) {
      const words = paragraph.split(' ');
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);
        
        if (testWidth > width - (padding * 2) && currentLine !== '') {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    
    // Truncar si es necesario
    const finalLines = lines.slice(0, maxLines);
    let currentY = y + padding + fontSize;
    
    for (const line of finalLines) {
      page.drawText(line, {
        x: x + padding,
        y: fromTop(currentY),
        size: fontSize,
        font,
        color
      });
      currentY += lineHeight;
    }
  }




  getDownloadsPath() {
    return path.join(os.homedir(), 'Downloads');
  }

  async imageToBytes(imageName) {
    const extensiones = ['.jpeg', '.jpg', '.png'];
    for (const ext of extensiones) {
      const file = path.join(this.imagesPath, imageName.replace(/\.[^/.]+$/, '') + ext);
      if (fs.existsSync(file)) return fs.readFileSync(file);
    }
    return null;
  }

  async imageToBase64(imageName) {
    const bytes = await this.imageToBytes(imageName);
    if (!bytes) return null;
    const ext = path.extname(imageName).toLowerCase();
    let mimeType = 'image/jpeg';
    if (ext === '.png') mimeType = 'image/png';
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
  }

  /**
   * GENERAR PDF COMBINADO COOSALUD (ambos exámenes en una sola hoja)
   */
async generarPDFCombinadoCOO(datosAudiometria, datosLogoaudiometria, entidad) {

 
  try {
    console.log(`\n========== generarPDFCombinadoCOO INICIADO ==========`);
    console.log(`Entidad: ${entidad}`);
    
    // Verificar si existe la plantilla
    const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
    console.log('📄 Ruta plantilla:', plantillaPath);
    console.log('📄 ¿Existe plantilla?', fs.existsSync(plantillaPath));
    
    if (!fs.existsSync(plantillaPath)) {
        throw new Error(`No se encuentra la plantilla PDF en: ${plantillaPath}`);
    }
  
    const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
    const page = pdfDoc.getPages()[0];

    const { width, height } = page.getSize();
    const fromTop = (y) => height - y;

const fontPath = 'C:/Windows/Fonts/arial.ttf';
const fontBytes = fs.readFileSync(fontPath);


pdfDoc.registerFontkit(fontkit);  // ← AGREGAR ESTA LÍNEA
const font = await pdfDoc.embedFont(fontBytes);


const fontBold = font;

    // Datos de AUDIOMETRÍA
    const odAudiometria = datosAudiometria.valores_od || {};
    const oiAudiometria = datosAudiometria.valores_oi || {};
    const freqs = datosAudiometria.freqs || ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

    // Datos de LOGOAUDIOMETRÍA
    const odLogoaudiometria = datosLogoaudiometria.valores_od || {};
    const oiLogoaudiometria = datosLogoaudiometria.valores_oi || {};

    // Flags NR
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

    const nombre = datosAudiometria.paciente?.nombre || '';
    const doc = datosAudiometria.paciente?.documento || '';

    // FECHA
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const fechaActual = new Date();
    const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

    // HEADER
    page.drawText(fechaTexto, { x: 50, y: fromTop(125), size: 9, font });
    page.drawText(`Nombre: ${nombre}`, { x: 50, y: fromTop(145), size: 10, font });
    page.drawText(`C.C.: ${doc}`, { x: 50, y: fromTop(165), size: 10, font });
    page.drawText(`Entidad: ${entidad}`, { x: 50, y: fromTop(185), size: 10, font });

    // OTOSCOPIA
    const otoscopiaTexto = datosAudiometria.otoscopia || '';
    if (otoscopiaTexto && otoscopiaTexto.trim() !== '') {
        page.drawText(`OTOSCOPIA: ${otoscopiaTexto}`, {
            x: 50,
            y: fromTop(200),
            size: 9,
            font: font
        });
    } else {
        page.drawText(`OTOSCOPIA:`, {
            x: 50,
            y: fromTop(200),
            size: 9,
            font: font
        });
    }

       // ============================================================
    // GRÁFICAS INDEPENDIENTES - SIN CONTENEDOR
    // ============================================================
    
    // Configuración individual para cada gráfica
    const graficaConfig = {
        audiometria: {
            x: 25,              // Posición X desde la izquierda
            y: 220,             // Posición Y desde arriba
            width: 520,         // Ancho de la gráfica
            height: 250,        // Alto de la gráfica
            titulo: 'AUDIOMETRÍA TONAL'
        },
        logoaudiometria: {
            x: 25,             // Posición X (puede ser diferente)
            y: 330,             // Posición Y (puede ser diferente)
            width: 450,         // Ancho (puede ser diferente)
            height: 450,        // Alto (puede ser diferente)
            titulo: 'LOGOAUDIOMETRÍA'
        }
    };

    // DIBUJAR TÍTULOS DE LAS GRÁFICAS
    page.drawText(graficaConfig.audiometria.titulo, { 
        x: graficaConfig.audiometria.x + 150, 
        y: fromTop(graficaConfig.audiometria.y - 5), 
        size: 11, 
        font: fontBold 
    });

    page.drawText(graficaConfig.logoaudiometria.titulo, { 
        x: graficaConfig.logoaudiometria.x + 150, 
         y: fromTop(315),    // ← Cambiar de 315 a 220 (más arriba)
        size: 11, 
        font: fontBold 
    });

    // GRÁFICA DE AUDIOMETRÍA
    if (datosAudiometria.grafica_tonal_base64 && datosAudiometria.grafica_tonal_base64.length > 100) {
        const base64 = datosAudiometria.grafica_tonal_base64.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const img = datosAudiometria.grafica_tonal_base64.includes('png')
            ? await pdfDoc.embedPng(buffer)
            : await pdfDoc.embedJpg(buffer);
        
        // Calcular dimensiones manteniendo proporción
        const aspectRatio = img.width / img.height;
        let drawWidth = graficaConfig.audiometria.width;
        let drawHeight = graficaConfig.audiometria.height;
        
        if (aspectRatio > (graficaConfig.audiometria.width / graficaConfig.audiometria.height)) {
            drawHeight = graficaConfig.audiometria.width / aspectRatio;
        } else {
            drawWidth = graficaConfig.audiometria.height * aspectRatio;
        }
        
        // Centrar dentro del espacio disponible
        const xOffset = (graficaConfig.audiometria.width - drawWidth) / 2;
        const yOffset = (graficaConfig.audiometria.height - drawHeight) / 2;
        
        page.drawImage(img, {
            x: graficaConfig.audiometria.x + xOffset,
            y: fromTop(graficaConfig.audiometria.y + graficaConfig.audiometria.height - yOffset),
            width: drawWidth,
            height: drawHeight
        });
    }

    // GRÁFICA DE LOGOAUDIOMETRÍA
    if (datosLogoaudiometria.grafica_logo_base64 && datosLogoaudiometria.grafica_logo_base64.length > 100) {
        const base64 = datosLogoaudiometria.grafica_logo_base64.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const img = datosLogoaudiometria.grafica_logo_base64.includes('png')
            ? await pdfDoc.embedPng(buffer)
            : await pdfDoc.embedJpg(buffer);
        
        // Calcular dimensiones manteniendo proporción
        const aspectRatio = img.width / img.height;
        let drawWidth = graficaConfig.logoaudiometria.width;
        let drawHeight = graficaConfig.logoaudiometria.height;
        
        if (aspectRatio > (graficaConfig.logoaudiometria.width / graficaConfig.logoaudiometria.height)) {
            drawHeight = graficaConfig.logoaudiometria.width / aspectRatio;
        } else {
            drawWidth = graficaConfig.logoaudiometria.height * aspectRatio;
        }
        
        // Centrar dentro del espacio disponible
        const xOffset = (graficaConfig.logoaudiometria.width - drawWidth) / 2;
        const yOffset = (graficaConfig.logoaudiometria.height - drawHeight) / 2;
        
        page.drawImage(img, {
            x: graficaConfig.logoaudiometria.x + xOffset,
            y: fromTop(graficaConfig.logoaudiometria.y + graficaConfig.logoaudiometria.height - yOffset),
            width: drawWidth,
            height: drawHeight
        });
    }

    page.drawText('LOGOAUDIOMETRÍA', { 
        x: graficaConfig.logoaudiometria.x + 150, 
        y: fromTop(graficaConfig.logoaudiometria.y + 160),  // ← 30px dentro de la gráfica
        size: 11, 
        font: fontBold,
        color: rgb(0, 0, 0)
    });

    function drawCenteredTextInCell(text, x, y, cellWidth, cellHeight, fontSize, font, color = rgb(0, 0, 0)) {
        if (!text || text === '') return;
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        const centerX = x + (cellWidth / 2) - (textWidth / 2);
        const centerY = y + (cellHeight / 2) - (fontSize / 2);
        page.drawText(text, { x: centerX, y: centerY, size: fontSize, font, color });
    }

    // TABLA DE AUDIOMETRÍA
    const tablaYd = 450;  
    const tablaAltoFilap = 20;
    const tablaAnchoCol1 = 75;
    const tablaAnchoCol2 = 55;
    const tablaAnchoCol3 = 55;
    const tablaAudiometriaX = 50;



    
    // PTA

page.drawText('PROMEDIO TONAL', { 
    x: 380,              // ← Ajusta la X para centrar el texto
    y: fromTop(250), 
    size: 10, 
    font: fontBold 
});

    const pta = datosAudiometria.pta || {};
    const tablaPTAY = 260;
    const ptaTableX = 320;
    const ptaTableY = tablaPTAY + 20;
    const ptaRowHeight = 22;
    const ptaColWidth1 = 70;
    const ptaColWidth2 = 70;
    const ptaColWidth3 = 70;
    const ptaHeaderY = fromTop(ptaTableY);
    
    page.drawRectangle({ x: ptaTableX, y: ptaHeaderY, width: ptaColWidth1, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1, y: ptaHeaderY, width: ptaColWidth2, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1 + ptaColWidth2, y: ptaHeaderY, width: ptaColWidth3, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    drawCenteredTextInCell('Oido', ptaTableX, ptaHeaderY, ptaColWidth1, ptaRowHeight, 8, fontBold);
    drawCenteredTextInCell('Vía Aérea', ptaTableX + ptaColWidth1, ptaHeaderY, ptaColWidth2, ptaRowHeight, 8, fontBold);
    drawCenteredTextInCell('Vía Ósea', ptaTableX + ptaColWidth1 + ptaColWidth2, ptaHeaderY, ptaColWidth3, ptaRowHeight, 8, fontBold);

    const row1Y = ptaHeaderY - ptaRowHeight;
    page.drawRectangle({ x: ptaTableX, y: row1Y, width: ptaColWidth1, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1, y: row1Y, width: ptaColWidth2, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1 + ptaColWidth2, y: row1Y, width: ptaColWidth3, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    drawCenteredTextInCell('Oído Derecho', ptaTableX, row1Y, ptaColWidth1, ptaRowHeight, 8, fontBold);
    drawCenteredTextInCell(`${pta.od_air !== undefined && pta.od_air !== null ? pta.od_air + ' dB' : '--'}`, ptaTableX + ptaColWidth1, row1Y, ptaColWidth2, ptaRowHeight, 8, font, rgb(0.9, 0.2, 0.2));
    drawCenteredTextInCell(`${pta.od_bone !== undefined && pta.od_bone !== null ? pta.od_bone + ' dB' : '--'}`, ptaTableX + ptaColWidth1 + ptaColWidth2, row1Y, ptaColWidth3, ptaRowHeight, 8, font, rgb(0.9, 0.2, 0.2));

    const row2Y = row1Y - ptaRowHeight;
    page.drawRectangle({ x: ptaTableX, y: row2Y, width: ptaColWidth1, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1, y: row2Y, width: ptaColWidth2, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: ptaTableX + ptaColWidth1 + ptaColWidth2, y: row2Y, width: ptaColWidth3, height: ptaRowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    drawCenteredTextInCell('Oído Izquierdo', ptaTableX, row2Y, ptaColWidth1, ptaRowHeight, 8, fontBold);
    drawCenteredTextInCell(`${pta.oi_air !== undefined && pta.oi_air !== null ? pta.oi_air + ' dB' : '--'}`, ptaTableX + ptaColWidth1, row2Y, ptaColWidth2, ptaRowHeight, 8, font, rgb(0.2, 0.5, 0.9));
    drawCenteredTextInCell(`${pta.oi_bone !== undefined && pta.oi_bone !== null ? pta.oi_bone + ' dB' : '--'}`, ptaTableX + ptaColWidth1 + ptaColWidth2, row2Y, ptaColWidth3, ptaRowHeight, 8, font, rgb(0.2, 0.5, 0.9));

    // DIAGNÓSTICOS
// DIAGNÓSTICOS - MOVIDO MÁS A LA IZQUIERDA Y MÁS ABAJO
// ============================================================
// DIAGNÓSTICO AUDIOMETRÍA TONAL - CON WRAPPING (DIV)
// ============================================================
const diagY = 350;        // Posición Y desde arriba
const diagX = 320;        // Posición X desde la izquierda

// Definir el área del "div" para el diagnóstico
const boxWidth = 210;      // Ancho fijo del div
const boxHeight = 80;      // Alto fijo del div
const boxX = diagX;
const boxY = diagY + 18;   // Posición Y del div (desde arriba)

// Título principal (fuera del div)
page.drawText('DIAGNÓSTICO AUDIOMETRIA TONAL', { 
    x: diagX, 
    y: fromTop(diagY), 
    size: 9, 
    font: fontBold 
});

// Dibujar el fondo y borde del div
page.drawRectangle({
    x: boxX,
    y: fromTop(boxY + boxHeight), // Ajuste para que coincida con fromTop
    width: boxWidth,
    height: boxHeight,
    color: rgb(1, 1, 1), // Fondo blanco
    borderWidth: 0.5,
    borderColor: rgb(0.5, 0.5, 0.5)
});

// Construir el texto completo del diagnóstico
const diagnosticoOD = datosAudiometria.diagnostico_od || '';
const diagnosticoOI = datosAudiometria.diagnostico_oi || '';
const diagnosticoTexto = `: ${diagnosticoOD}\n: ${diagnosticoOI}`;

// Dibujar el diagnóstico con wrapping dentro del div
this.drawWrappedTextInArea(
    page,
    diagnosticoTexto,
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    8,          // Tamaño de fuente
    font,       // Fuente
    rgb(0, 0, 0), // ✅ Negro válido
    fromTop     // Función fromTop
);

//claveeeee
// ============================================================
// DIAGNÓSTICOS DE LOGOAUDIOMETRÍA
// ============================================================
const diagLogoY = 650;  // ← COORDENADA FIJA (desde arriba)
const diagLogoX = 40;  // ← COORDENADA FIJA (desde la izquierda)

// Título "DIAGNÓSTICO LOGOAUDIOMETRÍA"
page.drawText('DIAGNÓSTICO LOGOAUDIOMETRÍA', { 
    x: diagLogoX,        // ← CAMBIADO: diagX → diagLogoX
    y: fromTop(diagLogoY), 
    size: 9, 
    font: fontBold 
});

// O.D. (Logoaudiometría)
page.drawText('O.D', { 
    x: diagLogoX,        // ← CAMBIADO: diagX → diagLogoX
    y: fromTop(diagLogoY + 18), 
    size: 8, 
    font: fontBold 
});
page.drawText((datosLogoaudiometria.diagnostico_od || '').substring(0, 55), { 
    x: diagLogoX + 35,   // ← CAMBIADO: diagX → diagLogoX
    y: fromTop(diagLogoY + 18), 
    size: 8, 
    font 
});

// O.I. (Logoaudiometría)
page.drawText('O.I:', { 
    x: diagLogoX,        // ← CAMBIADO: diagX → diagLogoX
    y: fromTop(diagLogoY + 36), 
    size: 8, 
    font: fontBold 
});
page.drawText((datosLogoaudiometria.diagnostico_oi || '').substring(0, 55), { 
    x: diagLogoX + 35,   // ← CAMBIADO: diagX → diagLogoX
    y: fromTop(diagLogoY + 36), 
    size: 8, 
    font 
});





// O.I.
//page.drawText('Oido Izquierda:', { 
   // x: diagX, 
 //   y: fromTop(diagY + 36), 
  //  size: 8, 
 //   font: fontBold 
//});
//page.drawText((datosAudiometria.diagnostico_oi || '').substring(0, 55), { 
 //   x: diagX + 35, 
 //   y: fromTop(diagY + 36), 
 //   size: 8, 
 //   font 
//});

// OBSERVACIONES
//page.drawText('OBSERVACIONES', { 
 //   x: diagX, 
 //   y: fromTop(diagY + 60), 
  //  size: 9, 
  //  font: fontBold 
//});
//page.drawText((datosAudiometria.observaciones || '').substring(0, 70), { 
  //  x: diagX, 
 //   y: fromTop(diagY + 78), 
 //   size: 8, 
 //   font 
//});




    // ============================================================
    // IMAGEN DEL OÍDO SUPERPUESTA - CON LIBERTAD TOTAL
    // ============================================================
    
    // CONFIGURACIÓN DE LA IMAGEN - AJUSTA ESTOS VALORES LIBREMENTE
    const oidoConfig = {
        x: width - 200,        // Posición X (desde la izquierda)
        y: 570,                // Posición Y (desde arriba)
        width: 120,             // Ancho de la imagen
        height: 120,            // Alto de la imagen
        // OPCIONAL: si quieres usar fromTop para Y
        // y: fromTop(120),    // ← Descomenta si usas fromTop
    };

    // Cargar y dibujar la imagen del oído
    const oido = await this.imageToBytes('oido_logo.jpeg');
    if (oido) {
        try {
            const img = await pdfDoc.embedJpg(oido);
            
            // Dibujar la imagen SUPERPUESTA (al final para que esté sobre todo)
            page.drawImage(img, { 
                x: oidoConfig.x,
                y: oidoConfig.y,  // Si usas fromTop, cambia a: fromTop(oidoConfig.y)
                width: oidoConfig.width,
                height: oidoConfig.height
            });
            
            console.log('✅ Imagen del oído superpuesta en el PDF combinado');
        } catch (error) {
            console.warn('⚠️ No se pudo cargar la imagen del oído:', error.message);
        }
    } else {
        console.warn('⚠️ No se encontró la imagen oido_logo.jpeg');
    }


    // ============================================================
    // TABLA DE LOGOAUDIOMETRÍA - FONDO BLANCO SIMPLE
    // ============================================================
    
    const tablaAltoFila = 20;
    const tablaLogoaudiometriaX = 480;
    const tablaY = 515;  
    const tablaLogoCol1 = 65;
    const tablaLogoCol2 = 27;
    const tablaLogoCol3 = 27;
    const headerLogoY = fromTop(tablaY);
    
    const rowsLogo = [
        { label: "U. VOZ", od: getValorConNR('od', 'urv', odLogoaudiometria.urv), oi: getValorConNR('oi', 'urv', oiLogoaudiometria.urv), isODNR: nrFlags.od?.urv || false, isOINR: nrFlags.oi?.urv || false },
        { label: "U. PALABRA", od: getValorConNR('od', 'upalabra', odLogoaudiometria.upalabra), oi: getValorConNR('oi', 'upalabra', oiLogoaudiometria.upalabra), isODNR: nrFlags.od?.upalabra || false, isOINR: nrFlags.oi?.upalabra || false },
        { label: "U. DISCRIM.", od: getValorConNR('od', 'udisc', odLogoaudiometria.udisc), oi: getValorConNR('oi', 'udisc', oiLogoaudiometria.udisc), isODNR: nrFlags.od?.udisc || false, isOINR: nrFlags.oi?.udisc || false },
        { label: "% DISCRIM.", od: getValorConNR('od', 'pmax', odLogoaudiometria.pmax), oi: getValorConNR('oi', 'pmax', oiLogoaudiometria.pmax), isODNR: nrFlags.od?.pmax || false, isOINR: nrFlags.oi?.pmax || false }
    ];
    
    // ============================================================
    // DIBUJAR CADA CELDA CON FONDO BLANCO
    // ============================================================
    
    // ENCABEZADOS
    // Celda 1
    page.drawRectangle({ x: tablaLogoaudiometriaX, y: headerLogoY, width: tablaLogoCol1, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
    page.drawRectangle({ x: tablaLogoaudiometriaX, y: headerLogoY, width: tablaLogoCol1, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
    // Celda 2
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1, y: headerLogoY, width: tablaLogoCol2, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1, y: headerLogoY, width: tablaLogoCol2, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
    // Celda 3
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, y: headerLogoY, width: tablaLogoCol3, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, y: headerLogoY, width: tablaLogoCol3, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
    
    drawCenteredTextInCell('Parámetro', tablaLogoaudiometriaX, headerLogoY, tablaLogoCol1, tablaAltoFila, 9, fontBold);
    drawCenteredTextInCell('OD', tablaLogoaudiometriaX + tablaLogoCol1, headerLogoY, tablaLogoCol2, tablaAltoFila, 9, fontBold);
    drawCenteredTextInCell('OI', tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, headerLogoY, tablaLogoCol3, tablaAltoFila, 9, fontBold);

    // FILAS - Repite el mismo patrón para cada fila
    rowsLogo.forEach((r, i) => {
        const rowY = headerLogoY - tablaAltoFila - (i * tablaAltoFila);
        
        // Celda 1
        page.drawRectangle({ x: tablaLogoaudiometriaX, y: rowY, width: tablaLogoCol1, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
        page.drawRectangle({ x: tablaLogoaudiometriaX, y: rowY, width: tablaLogoCol1, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
        // Celda 2
        page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1, y: rowY, width: tablaLogoCol2, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
        page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1, y: rowY, width: tablaLogoCol2, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
        // Celda 3
        page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, y: rowY, width: tablaLogoCol3, height: tablaAltoFila, color: rgb(1,1,1), borderWidth: 0 });
        page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, y: rowY, width: tablaLogoCol3, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0,0,0) });
        
        // Textos
        drawCenteredTextInCell(r.label, tablaLogoaudiometriaX, rowY, tablaLogoCol1, tablaAltoFila, 8, font);
        
        if (r.isODNR || r.od === '↓') {
            drawCenteredTextInCell('↓', tablaLogoaudiometriaX + tablaLogoCol1, rowY, tablaLogoCol2, tablaAltoFila, 14, font, rgb(0.9, 0.2, 0.2));
        } else {
            drawCenteredTextInCell(`${r.od} dB`, tablaLogoaudiometriaX + tablaLogoCol1, rowY, tablaLogoCol2, tablaAltoFila, 8, font, rgb(0.9, 0.2, 0.2));
        }

        if (r.isOINR || r.oi === '↓') {
            drawCenteredTextInCell('↓', tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, rowY, tablaLogoCol3, tablaAltoFila, 14, font, rgb(0.2, 0.5, 0.9));
        } else {
            drawCenteredTextInCell(`${r.oi} dB`, tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, rowY, tablaLogoCol3, tablaAltoFila, 8, font, rgb(0.2, 0.5, 0.9));
        }
    });


    console.log('🔍🔍🔍 nrFlags:', JSON.stringify(nrFlags));
    console.log('🔍🔍🔍 odLogoaudiometria.urv:', odLogoaudiometria.urv);
    console.log('🔍🔍🔍 rowsLogo:', JSON.stringify(rowsLogo));


    // =========================
    // GUARDAR PDF
    // =========================
    console.log('📁 Preparando para guardar PDF...');
    
    const pdfBytes = await pdfDoc.save();
    console.log('📁 PDF generado, tamaño:', pdfBytes.length, 'bytes');
    
    const fileName = `${nombre.replace(/\s+/g, '_')}_Examen_Completo_COOSALUD_${Date.now()}.pdf`;
    const downloadsPath = this.getDownloadsPath();
    console.log('📁 Carpeta Descargas:', downloadsPath);
    
    if (!fs.existsSync(downloadsPath)) {
        console.log('⚠️ La carpeta Descargas no existe, creándola...');
        fs.mkdirSync(downloadsPath, { recursive: true });
    }
    
    const filePath = path.join(downloadsPath, fileName);
    console.log('📁 Ruta completa:', filePath);
    
    try {
        fs.writeFileSync(filePath, pdfBytes);
        console.log(`\n✅ PDF COOSALUD combinado generado: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
            console.log('✅ Archivo verificado en el sistema de archivos');
            const stats = fs.statSync(filePath);
            console.log('📁 Tamaño del archivo:', stats.size, 'bytes');
        } else {
            console.log('⚠️ El archivo no aparece después de guardar');
        }
        
        return filePath;
    } catch (writeError) {
        console.error('❌ Error al escribir el archivo:', writeError);
        throw new Error(`No se pudo guardar el PDF: ${writeError.message}`);
    }

  } catch (error) {
    console.error('❌ Error en generarPDFCombinado (COOSALUD):', error);
    throw error;
  }
}
  /**
   * GENERAR PDF SOLO DE AUDIOMETRÍA COOSALUD
   */
  async generarPDFAudiometria(datos, entidad) {
    try {
      console.log(`\n========== generarPDFAudiometria (COOSALUD) ==========`);
      
      const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
      const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
      const page = pdfDoc.getPages()[0];

      const { width, height } = page.getSize();
      const fromTop = (y) => height - y;

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      const od = datos.valores_od || {};
      const oi = datos.valores_oi || {};
      const freqs = datos.freqs || ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];

      const nombre = datos.paciente?.nombre || '';
      const doc = datos.paciente?.documento || '';

      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const fechaActual = new Date();
      const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

page.drawText(fechaTexto, { x: 50, y: fromTop(125), size: 9, font });
page.drawText(`Nombre: ${nombre}`, { x: 50, y: fromTop(145), size: 10, font });
page.drawText(`C.C.: ${doc}`, { x: 50, y: fromTop(165), size: 10, font });
page.drawText(`Entidad: ${entidad}`, { x: 50, y: fromTop(185), size: 10, font });

      const oido = await this.imageToBytes('oido_logo.jpeg');
      if (oido) {
        const img = await pdfDoc.embedJpg(oido);
        page.drawImage(img, { x: width - 140, y: fromTop(130), width: 80, height: 80 });
      }



      
      page.drawText('AUDIOMETRÍA TONAL', { x: 150, y: fromTop(200), size: 14, font: fontBold });

      if (datos.grafica_tonal_base64 && datos.grafica_tonal_base64.length > 100) {
        const base64 = datos.grafica_tonal_base64.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const img = datos.grafica_tonal_base64.includes('png')
          ? await pdfDoc.embedPng(buffer)
          : await pdfDoc.embedJpg(buffer);
        page.drawImage(img, { x: 80, y: fromTop(350), width: 450, height: 200 });
      }

      // Tabla
      const tableX = 80;
      const tableY = 380;
      const rowHeight = 22;

      page.drawRectangle({ x: tableX, y: fromTop(tableY), width: 100, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
      page.drawRectangle({ x: tableX + 100, y: fromTop(tableY), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
      page.drawRectangle({ x: tableX + 180, y: fromTop(tableY), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });

      page.drawText('Frecuencia', { x: tableX + 15, y: fromTop(tableY - 15), size: 9, font: fontBold });
      page.drawText('OD', { x: tableX + 120, y: fromTop(tableY - 15), size: 9, font: fontBold });
      page.drawText('OI', { x: tableX + 210, y: fromTop(tableY - 15), size: 9, font: fontBold });

      freqs.forEach((f, i) => {
        const y = tableY + (i + 1) * rowHeight;
        page.drawRectangle({ x: tableX, y: fromTop(y), width: 100, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
        page.drawRectangle({ x: tableX + 100, y: fromTop(y), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
        page.drawRectangle({ x: tableX + 180, y: fromTop(y), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });

        page.drawText(`${f} Hz`, { x: tableX + 10, y: fromTop(y - 15), size: 8, font });
        page.drawText(`${od[f] || '—'} dB`, { x: tableX + 115, y: fromTop(y - 15), size: 8, font, color: rgb(0.9, 0.2, 0.2) });
        page.drawText(`${oi[f] || '—'} dB`, { x: tableX + 200, y: fromTop(y - 15), size: 8, font, color: rgb(0.2, 0.5, 0.9) });
      });

      const diagY = 520;
      page.drawText('DIAGNÓSTICO AUDITIVO', { x: 50, y: fromTop(diagY), size: 10, font: fontBold });
      page.drawText('O.D.', { x: 50, y: fromTop(diagY + 18), size: 9, font: fontBold });
      page.drawText(datos.diagnostico_od || '_________________________', { x: 80, y: fromTop(diagY + 18), size: 9, font });
      page.drawText('O.I.', { x: 50, y: fromTop(diagY + 36), size: 9, font: fontBold });
      page.drawText(datos.diagnostico_oi || '_________________________', { x: 80, y: fromTop(diagY + 36), size: 9, font });
      page.drawText('OBSERVACIONES', { x: 50, y: fromTop(diagY + 60), size: 10, font: fontBold });

      page.drawText(datos.observaciones || '_________________________', { x: 50, y: fromTop(diagY + 78), size: 9, font });
       
// ✅ AGREGAR AQUÍ ESTAS 4 LÍNEAS ✅
const otoscopia = datosAudiometria.otoscopia || '';
page.drawText(`OTOSCOPIA: ${otoscopia || '_________________________'}`, {
    x: 80, y: fromTop(185), size: 9, font: font
});





      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.getDownloadsPath(), `${nombre.replace(/\s+/g, '_')}_Audiometria_COOSALUD_${Date.now()}.pdf`);
      fs.writeFileSync(filePath, pdfBytes);

      console.log(`\n✅ PDF Audiometría COOSALUD generado: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Error en generarPDFAudiometria (COOSALUD):', error);
      throw error;
    }
  }

  /**
   * GENERAR PDF SOLO DE LOGOAUDIOMETRÍA COOSALUD
   */
  async generarPDFLogoaudiometria(datos, entidad) {
    try {
      console.log(`\n========== generarPDFLogoaudiometria (COOSALUD) ==========`);
      
      const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
      const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
      const page = pdfDoc.getPages()[0];

      const { width, height } = page.getSize();
      const fromTop = (y) => height - y;

const fontPath = 'C:/Windows/Fonts/arial.ttf';
const fontBytes = fs.readFileSync(fontPath);
const font = await pdfDoc.embedFont(fontBytes);
const fontBold = font;

      const od = datos.valores_od || {};
      const oi = datos.valores_oi || {};



// 🔥 NUEVO: Obtener flags NR
const nrFlags = datos.nr_flags || { od: {}, oi: {} };


// 🔥 NUEVO: Funciones para NR
// 🔥 NUEVO: Función para obtener valor o flecha según NR
function getValorConNR(ear, campo, valor) {
    if (nrFlags[ear] && nrFlags[ear][campo] === true) {
        return '↓';  // ← Cambia 'NR' por '↓'
    }
    return valor || '—';
}

function getUnidad(ear, campo, unidad) {
    if (nrFlags[ear] && nrFlags[ear][campo] === true) {
        return '';
    }
    return unidad;
}

      const nombre = datos.paciente?.nombre || '';
      const doc = datos.paciente?.documento || '';

      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const fechaActual = new Date();
      const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

// =========================
// HEADER (DATOS SUPERIORES)
// =========================
page.drawText(fechaTexto, {
    x: 55,
    y: fromTop(125),
    size: 9,
    font
});

page.drawText(`Nombre: ${nombre}`, {
    x: 55,
    y: fromTop(145),
    size: 10,
    font
});

page.drawText(`C.C.: ${doc}`, {
    x: 55,
    y: fromTop(163),
    size: 10,
    font
});

page.drawText(`Entidad: ${entidad}`, {
    x: 55,
    y: fromTop(181),
    size: 10,
    font
});

      const oido = await this.imageToBytes('oido_logo.jpeg');
      if (oido) {
        const img = await pdfDoc.embedJpg(oido);
        page.drawImage(img, { x: width - 140, y: fromTop(130), width: 80, height: 80 });
      }




// OBTENER OTOSCOPIA de los datos
const otoscopia = datos.otoscopia || '';

// Si hay OTOSCOPIA, mostrarla
if (otoscopia && otoscopia.trim() !== '') {
    page.drawText('OTOSCOPIA', { x: 80, y: fromTop(185), size: 9, font: fontBold });
    
    // Dividir texto en líneas
    const lines = [];
    let currentLine = '';
    for (let i = 0; i < otoscopia.length; i++) {
        currentLine += otoscopia[i];
        if (currentLine.length >= 75 || i === otoscopia.length - 1) {
            lines.push(currentLine);
            currentLine = '';
        }
    }
    
    lines.forEach((line, idx) => {
        page.drawText(line, { x: 85, y: fromTop(195 + (idx + 1) * 12), size: 7, font });
    });
    
    // Ajustar posición de los títulos (bajarlos)
    const offsetOtoscopia = 25 + (lines.length * 12);
    page.drawText('AUDIOMETRÍA TONAL', { x: 80, y: fromTop(200 + offsetOtoscopia), size: 11, font: fontBold });
    page.drawText('LOGOAUDIOMETRÍA', { x: width - 200, y: fromTop(200 + offsetOtoscopia), size: 11, font: fontBold });
    
    // También ajustar las gráficas (usar offsetOtoscopia)
    const graficaYOffset = 220 + offsetOtoscopia;
    // ... usar graficaYOffset en lugar de 220 en las gráficas
} else {
    // Sin OTOSCOPIA, mantener original
page.drawText('AUDIOMETRÍA TONAL', {
    x: 95,
    y: fromTop(225),
    size: 10,
    font: fontBold
});

page.drawText('LOGOAUDIOMETRÍA', {
    x: width - 230,
    y: fromTop(225),
    size: 10,
    font: fontBold
});
}


      page.drawText('LOGOAUDIOMETRÍA', { x: 130, y: fromTop(200), size: 14, font: fontBold });

      if (datos.grafica_logo_base64 && datos.grafica_logo_base64.length > 100) {
        const base64 = datos.grafica_logo_base64.split(',')[1];
        const buffer = Buffer.from(base64, 'base64');
        const img = datos.grafica_logo_base64.includes('png')
          ? await pdfDoc.embedPng(buffer)
          : await pdfDoc.embedJpg(buffer);
        page.drawImage(img, { x: 80, y: fromTop(350), width: 450, height: 200 });
      }

      const tableX = 80;
      const tableY = 380;
      const rowHeight = 22;

      page.drawRectangle({ x: tableX, y: fromTop(tableY), width: 120, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
      page.drawRectangle({ x: tableX + 120, y: fromTop(tableY), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
      page.drawRectangle({ x: tableX + 200, y: fromTop(tableY), width: 80, height: rowHeight, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });

      page.drawText('Parámetro', { x: tableX + 20, y: fromTop(tableY - 15), size: 9, font: fontBold });
      page.drawText('OD', { x: tableX + 150, y: fromTop(tableY - 15), size: 9, font: fontBold });
      page.drawText('OI', { x: tableX + 230, y: fromTop(tableY - 15), size: 9, font: fontBold });

const rows = [
    { 
        label: "U. Voz", 
        od: getValorConNR('od', 'urv', od.urv), 
        oi: getValorConNR('oi', 'urv', oi.urv),
        isODNR: nrFlags.od?.urv || false,
        isOINR: nrFlags.oi?.urv || false
    },
    { 
        label: "U. Palabras", 
        od: getValorConNR('od', 'upalabra', od.upalabra), 
        oi: getValorConNR('oi', 'upalabra', oi.upalabra),
        isODNR: nrFlags.od?.upalabra || false,
        isOINR: nrFlags.oi?.upalabra || false
    },
    { 
        label: "U. Discriminación", 
        od: getValorConNR('od', 'udisc', od.udisc), 
        oi: getValorConNR('oi', 'udisc', oi.udisc),
        isODNR: nrFlags.od?.udisc || false,
        isOINR: nrFlags.oi?.udisc || false
    },
    { 
        label: "% Discriminación", 
        od: getValorConNR('od', 'pmax', od.pmax), 
        oi: getValorConNR('oi', 'pmax', oi.pmax),
        isODNR: nrFlags.od?.pmax || false,
        isOINR: nrFlags.oi?.pmax || false
    }
];

rows.forEach((r, i) => {
    const rowY = headerLogoY - tablaAltoFila - (i * tablaAltoFila);
    page.drawRectangle({ x: tablaLogoaudiometriaX, y: rowY, width: tablaLogoCol1, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1, y: rowY, width: tablaLogoCol2, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    page.drawRectangle({ x: tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, y: rowY, width: tablaLogoCol3, height: tablaAltoFila, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
    
    drawCenteredTextInCell(r.label, tablaLogoaudiometriaX, rowY, tablaLogoCol1, tablaAltoFila, 8, font);
    
    // 🔥 OD - dibujar flecha manual o texto - USANDO isODNR
// 🔥 OD - con Arial, '↓' se muestra correctamente
if (r.isODNR || r.od === '↓') {
    drawCenteredTextInCell('↓', tablaLogoaudiometriaX + tablaLogoCol1, rowY, tablaLogoCol2, tablaAltoFila, 14, font, rgb(0.9, 0.2, 0.2));
} else {
    drawCenteredTextInCell(`${r.od} dB`, tablaLogoaudiometriaX + tablaLogoCol1, rowY, tablaLogoCol2, tablaAltoFila, 8, font, rgb(0.9, 0.2, 0.2));
}

// 🔥 OI - con Arial, '↓' se muestra correctamente
if (r.isOINR || r.oi === '↓') {
    drawCenteredTextInCell('↓', tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, rowY, tablaLogoCol3, tablaAltoFila, 14, font, rgb(0.2, 0.5, 0.9));
} else {
    drawCenteredTextInCell(`${r.oi} dB`, tablaLogoaudiometriaX + tablaLogoCol1 + tablaLogoCol2, rowY, tablaLogoCol3, tablaAltoFila, 8, font, rgb(0.2, 0.5, 0.9));
}
});

      const diagY = 520;
      page.drawText('DIAGNÓSTICO AUDITIVO', { x: 50, y: fromTop(diagY), size: 10, font: fontBold });
      page.drawText('O.D.', { x: 50, y: fromTop(diagY + 18), size: 9, font: fontBold });
      page.drawText(datos.diagnostico_od || '_________________________', { x: 80, y: fromTop(diagY + 18), size: 9, font });
      page.drawText('O.I.', { x: 50, y: fromTop(diagY + 36), size: 9, font: fontBold });
      page.drawText(datos.diagnostico_oi || '_________________________', { x: 80, y: fromTop(diagY + 36), size: 9, font });
      page.drawText('OBSERVACIONES', { x: 50, y: fromTop(diagY + 60), size: 10, font: fontBold });
      page.drawText(datos.diagnostico || '_________________________', { x: 50, y: fromTop(diagY + 78), size: 9, font });

      const pdfBytes = await pdfDoc.save();
      const filePath = path.join(this.getDownloadsPath(), `${nombre.replace(/\s+/g, '_')}_Logoaudiometria_COOSALUD_${Date.now()}.pdf`);
      fs.writeFileSync(filePath, pdfBytes);

      console.log(`\n✅ PDF Logoaudiometría COOSALUD generado: ${filePath}`);
      return filePath;

    } catch (error) {
      console.error('❌ Error en generarPDFLogoaudiometria (COOSALUD):', error);
      throw error;
    }
  }
}

module.exports = new PDFGeneratorCoosaludUnified();