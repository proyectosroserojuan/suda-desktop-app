// services/pdfGeneratorCoosalud.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit'); // ← AGREGAR ESTA LÍNEA

class PDFGeneratorCoosalud {
  constructor() {
    this.imagesPath = path.join(__dirname, '../assets/images');
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

  async generarPDF(datos, entidad, tipo = 'logoaudiometria') {
    try {
        console.log(`=== generarPDF (COOSALUD) con soporte NR ===`);
        console.log(`Tipo recibido: ${tipo}`);
        
        // ✅ SI ES AUDIOMETRIA, USAR EL GENERADOR ESPECÍFICO
        if (tipo === 'audiometria') {
            console.log('🔄 Redirigiendo a generarPDFAudiometria');
            return await this.generarPDFAudiometria(datos, entidad);
        }
        
        // ✅ SI ES LOGOAUDIOMETRIA, CONTINUAR CON EL CÓDIGO NORMAL
        console.log('📄 Generando Logoaudiometría (COOSALUD)');
        
        const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
        const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
        
        // 🔥 REGISTRAR FONTKIT
        pdfDoc.registerFontkit(fontkit);
        
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();
        const fromTop = (y) => height - y;

        // 🔥 USAR ARIAL EN LUGAR DE TIMES ROMAN
        const fontPath = 'C:/Windows/Fonts/arial.ttf';
        const fontBytes = fs.readFileSync(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);
        const fontBold = font;

        const od = datos.valores_od || {};
        const oi = datos.valores_oi || {};

        // 🔥 OBTENER FLAGS NR
        const nrFlags = datos.nr_flags || { od: {}, oi: {} };

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

        function esNR(ear, campo) {
            return nrFlags[ear] && nrFlags[ear][campo] === true;
        }

        const nombre = datos.paciente?.nombre || '';
        const doc = datos.paciente?.documento || '';

        // FECHA Y CIUDAD
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const fechaActual = new Date();
        const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

        page.drawText(fechaTexto, { x: 50, y: fromTop(120), size: 10, font });

        // DATOS PACIENTE
        page.drawText(`Nombre: ${nombre}`, { x: 50, y: fromTop(150), size: 11, font });
        page.drawText(`C.C.: ${doc}`, { x: 50, y: fromTop(170), size: 11, font });
        page.drawText(`Entidad: ${entidad}`, { x: 50, y: fromTop(190), size: 11, font });

        // IMAGEN OIDO
        const oido = await this.imageToBytes('oido_logo.jpeg');
        if (oido) {
            const img = await pdfDoc.embedJpg(oido);
            page.drawImage(img, { x: width - 200, y: fromTop(210), width: 110, height: 110 });
        }

        // TITULO
        const tituloY = 230;
        page.drawText('LOGOAUDIOMETRÍA', { x: 150, y: fromTop(tituloY), size: 16, font: fontBold });

        // GRAFICA
        const graficaY = tituloY + 30;
        if (datos.grafica_base64) {
            const base64 = datos.grafica_base64.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            const img = datos.grafica_base64.includes('png')
                ? await pdfDoc.embedPng(buffer)
                : await pdfDoc.embedJpg(buffer);
            page.drawImage(img, { x: (width - 420) / 2 - 80, y: fromTop(graficaY + 200), width: 520, height: 180 });
        }

        // BLOQUE INFERIOR
        const bloqueY = graficaY + 240;

        // DIAGNOSTICO
        page.drawText('DIAGNÓSTICO', { x: 50, y: fromTop(bloqueY), size: 11, font: fontBold });
        page.drawText('O.D.', { x: 50, y: fromTop(bloqueY + 20), size: 10, font: fontBold });
        page.drawText(datos.diagnostico_od || '', { x: 80, y: fromTop(bloqueY + 35), size: 10, font });
        page.drawText('O.I.', { x: 50, y: fromTop(bloqueY + 60), size: 10, font: fontBold });
        page.drawText(datos.diagnostico_oi || '', { x: 80, y: fromTop(bloqueY + 75), size: 10, font });
     //   page.drawText('OBSERVACIONES', { x: 50, y: fromTop(bloqueY + 105), size: 11, font: fontBold });
     //   page.drawText(datos.diagnostico || '________', { x: 50, y: fromTop(bloqueY + 120), size: 10, font });

        // TABLA CON SOPORTE NR
        const tableX = 260;
        const rowHeight = 25;

        function cell(x, y, w, h) {
            page.drawRectangle({ x, y, width: w, height: h, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
        }

        function drawCenteredText(text, x, y, cellWidth, cellHeight, fontSize, font, color = rgb(0, 0, 0)) {
            if (!text || text === '') return;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            const centerX = x + (cellWidth / 2) - (textWidth / 2);
            const centerY = y + (cellHeight / 2) - (fontSize / 2.5);
            page.drawText(text, { x: centerX, y: centerY, size: fontSize, font, color });
        }

        const headerY = bloqueY;
        cell(tableX, fromTop(headerY), 120, rowHeight);
        cell(tableX + 120, fromTop(headerY), 80, rowHeight);
        cell(tableX + 200, fromTop(headerY), 80, rowHeight);

        drawCenteredText('Parámetro', tableX, fromTop(headerY), 120, rowHeight, 10, fontBold);
        drawCenteredText('OD', tableX + 120, fromTop(headerY), 80, rowHeight, 10, fontBold);
        drawCenteredText('OI', tableX + 200, fromTop(headerY), 80, rowHeight, 10, fontBold);

        const rows = [
            { label: "U. Voz", campo: 'urv', od: od.urv, oi: oi.urv },
            { label: "U. Palabras", campo: 'upalabra', od: od.upalabra, oi: oi.upalabra },
            { label: "U. Discriminación", campo: 'udisc', od: od.udisc, oi: oi.udisc },
            { label: "% Discriminación", campo: 'pmax', od: od.pmax, oi: oi.pmax }
        ];

        rows.forEach((r, i) => {
            const y = bloqueY + i * rowHeight + rowHeight;

            cell(tableX, fromTop(y), 120, rowHeight);
            cell(tableX + 120, fromTop(y), 80, rowHeight);
            cell(tableX + 200, fromTop(y), 80, rowHeight);

            const labelWidth = font.widthOfTextAtSize(r.label, 9);
            const labelCenterX = tableX + (120 / 2) - (labelWidth / 2);
            const labelCenterY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
            page.drawText(r.label, { x: labelCenterX, y: labelCenterY, size: 9, font });

            const valorOD = getValorConNR('od', r.campo, r.od);
            const esNROD = esNR('od', r.campo);
            
            if (esNROD || valorOD === '↓') {
                const arrowSize = 18;
                const arrowWidth = font.widthOfTextAtSize('↓', arrowSize);
                const arrowX = (tableX + 120) + (80 / 2) - (arrowWidth / 2);
                const arrowY = fromTop(y) + (rowHeight / 2) - (arrowSize / 2.5);
                page.drawText('↓', { x: arrowX, y: arrowY, size: arrowSize, font: fontBold, color: rgb(0.9, 0.2, 0.2) });
            } else {
                const textoOD = `${valorOD} dB`;
                const textWidth = font.widthOfTextAtSize(textoOD, 9);
                const textX = (tableX + 120) + (80 / 2) - (textWidth / 2);
                const textY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
                page.drawText(textoOD, { x: textX, y: textY, size: 9, font, color: rgb(0.9, 0.2, 0.2) });
            }

            const valorOI = getValorConNR('oi', r.campo, r.oi);
            const esNROI = esNR('oi', r.campo);
            
            if (esNROI || valorOI === '↓') {
                const arrowSize = 18;
                const arrowWidth = font.widthOfTextAtSize('↓', arrowSize);
                const arrowX = (tableX + 200) + (80 / 2) - (arrowWidth / 2);
                const arrowY = fromTop(y) + (rowHeight / 2) - (arrowSize / 2.5);
                page.drawText('↓', { x: arrowX, y: arrowY, size: arrowSize, font: fontBold, color: rgb(0.2, 0.5, 0.9) });
            } else {
                const textoOI = `${valorOI} dB`;
                const textWidth = font.widthOfTextAtSize(textoOI, 9);
                const textX = (tableX + 200) + (80 / 2) - (textWidth / 2);
                const textY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
                page.drawText(textoOI, { x: textX, y: textY, size: 9, font, color: rgb(0.2, 0.5, 0.9) });
            }
        });

        const pdfBytes = await pdfDoc.save();
        const filePath = path.join(this.getDownloadsPath(), `${nombre || 'paciente'}_coosalud_${Date.now()}.pdf`);

        fs.writeFileSync(filePath, pdfBytes);
        console.log(`✅ PDF generado: ${filePath}`);
        return filePath;

    } catch (error) {
        console.error('❌ Error en generarPDF:', error);
        throw error;
    }
}

  /*
async generarPDF(datos, entidad) {
    try {
        console.log('=== generarPDF (COOSALUD) con soporte NR ===');
        
        const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
        const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
        
        // 🔥 REGISTRAR FONTKIT
        pdfDoc.registerFontkit(fontkit);
        
        const page = pdfDoc.getPages()[0];

        const { width, height } = page.getSize();
        const fromTop = (y) => height - y;

        // 🔥 USAR ARIAL EN LUGAR DE TIMES ROMAN
        const fontPath = 'C:/Windows/Fonts/arial.ttf';
        const fontBytes = fs.readFileSync(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);
        const fontBold = font; // Arial ya es negrita cuando usamos la versión bold

        const od = datos.valores_od || {};
        const oi = datos.valores_oi || {};

        // 🔥 OBTENER FLAGS NR
        const nrFlags = datos.nr_flags || { od: {}, oi: {} };

        // 🔥 FUNCIÓN para obtener el valor o la flecha según el flag NR
        function getValorConNR(ear, campo, valor) {
            if (nrFlags[ear] && nrFlags[ear][campo] === true) {
                return '↓';  // Flecha invertida
            }
            return valor || '—';
        }

        // 🔥 FUNCIÓN para obtener la unidad (solo si NO es NR)
        function getUnidad(ear, campo, unidad) {
            if (nrFlags[ear] && nrFlags[ear][campo] === true) {
                return '';
            }
            return unidad;
        }

        // 🔥 FUNCIÓN para saber si es NR
        function esNR(ear, campo) {
            return nrFlags[ear] && nrFlags[ear][campo] === true;
        }

        const nombre = datos.paciente?.nombre || '';
        const doc = datos.paciente?.documento || '';

        // =========================
        // FECHA Y CIUDAD
        // =========================
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const fechaActual = new Date();
        const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

        page.drawText(fechaTexto, {
            x: 50,
            y: fromTop(120),
            size: 10,
            font
        });

        // =========================
        // DATOS PACIENTE
        // =========================
        page.drawText(`Nombre: ${nombre}`, { x: 50, y: fromTop(150), size: 11, font });
        page.drawText(`C.C.: ${doc}`, { x: 50, y: fromTop(170), size: 11, font });
        page.drawText(`Entidad: ${entidad}`, { x: 50, y: fromTop(190), size: 11, font });

        // =========================
        // IMAGEN OIDO
        // =========================
        const oido = await this.imageToBytes('oido_logo.jpeg');
        if (oido) {
            const img = await pdfDoc.embedJpg(oido);
            page.drawImage(img, {
                x: width - 200,
                y: fromTop(210),
                width: 110,
                height: 110
            });
        }

        // =========================
        // TITULO
        // =========================
        const tituloY = 230;
        page.drawText('LOGOAUDIOMETRÍA', {
            x: 150,
            y: fromTop(tituloY),
            size: 16,
            font: fontBold
        });

        // =========================
        // GRAFICA
        // =========================
        const graficaY = tituloY + 30;
        if (datos.grafica_base64) {
            const base64 = datos.grafica_base64.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            const img = datos.grafica_base64.includes('png')
                ? await pdfDoc.embedPng(buffer)
                : await pdfDoc.embedJpg(buffer);
            page.drawImage(img, {
                x: (width - 420) / 2,
                y: fromTop(graficaY + 200),
                width: 420,
                height: 200
            });
        }

        // =========================
        // BLOQUE INFERIOR
        // =========================
        const bloqueY = graficaY + 240;

        // DIAGNOSTICO
        page.drawText('DIAGNÓSTICO AUDITIVO', {
            x: 50,
            y: fromTop(bloqueY),
            size: 11,
            font: fontBold
        });

        page.drawText('O.D.', {
            x: 50,
            y: fromTop(bloqueY + 20),
            size: 10,
            font: fontBold
        });

        page.drawText(datos.diagnostico_od || '________', {
            x: 80,
            y: fromTop(bloqueY + 35),
            size: 10,
            font
        });

        page.drawText('O.I.', {
            x: 50,
            y: fromTop(bloqueY + 60),
            size: 10,
            font: fontBold
        });

        page.drawText(datos.diagnostico_oi || '________', {
            x: 80,
            y: fromTop(bloqueY + 75),
            size: 10,
            font
        });

        page.drawText('OBSERVACIONES', {
            x: 50,
            y: fromTop(bloqueY + 105),
            size: 11,
            font: fontBold
        });

        page.drawText(datos.diagnostico || '________', {
            x: 50,
            y: fromTop(bloqueY + 120),
            size: 10,
            font
        });

        // =========================
        // TABLA CON SOPORTE NR
        // =========================
        const tableX = 260;
        const rowHeight = 25;

// 🔥 FUNCIÓN PARA DIBUJAR UNA CELDA CON BORDE
function cell(x, y, w, h) {
    page.drawRectangle({
        x,
        y,
        width: w,
        height: h,
        borderWidth: 0.5,
        borderColor: rgb(0, 0, 0)
    });
}

// 🔥 FUNCIÓN PARA CENTRAR TEXTO EN UNA CELDA
function drawCenteredText(text, x, y, cellWidth, cellHeight, fontSize, font, color = rgb(0, 0, 0)) {
    if (!text || text === '') return;
    
    // Calcular el ancho del texto para centrarlo horizontalmente
    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const centerX = x + (cellWidth / 2) - (textWidth / 2);
    
    // Centrar verticalmente
    const centerY = y + (cellHeight / 2) - (fontSize / 2.5);
    
    page.drawText(text, { 
        x: centerX, 
        y: centerY, 
        size: fontSize, 
        font, 
        color 
    });
}

// 🔥 HEADER DE LA TABLA CON CENTRADO
const headerY = bloqueY;

// Dibujar celdas del header
cell(tableX, fromTop(headerY), 120, rowHeight);
cell(tableX + 120, fromTop(headerY), 80, rowHeight);
cell(tableX + 200, fromTop(headerY), 80, rowHeight);

// Dibujar textos centrados en el header
drawCenteredText('Parámetro', tableX, fromTop(headerY), 120, rowHeight, 10, fontBold);
drawCenteredText('OD', tableX + 120, fromTop(headerY), 80, rowHeight, 10, fontBold);
drawCenteredText('OI', tableX + 200, fromTop(headerY), 80, rowHeight, 10, fontBold);

        // 🔥 FILAS CON NR
        const rows = [
            { label: "U. Voz", campo: 'urv', od: od.urv, oi: oi.urv },
            { label: "U. Palabras", campo: 'upalabra', od: od.upalabra, oi: oi.upalabra },
            { label: "U. Discriminación", campo: 'udisc', od: od.udisc, oi: oi.udisc },
            { label: "% Discriminación", campo: 'pmax', od: od.pmax, oi: oi.pmax }
        ];

rows.forEach((r, i) => {
    const y = bloqueY + i * rowHeight + rowHeight;

    // Dibujar celdas
    cell(tableX, fromTop(y), 120, rowHeight);
    cell(tableX + 120, fromTop(y), 80, rowHeight);
    cell(tableX + 200, fromTop(y), 80, rowHeight);

    // 🔥 LABEL CENTRADO
    const labelWidth = font.widthOfTextAtSize(r.label, 9);
    const labelCenterX = tableX + (120 / 2) - (labelWidth / 2);
    const labelCenterY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
    page.drawText(r.label, { 
        x: labelCenterX, 
        y: labelCenterY, 
        size: 9, 
        font 
    });

    // 🔥 OD con soporte NR - CENTRADO
    const valorOD = getValorConNR('od', r.campo, r.od);
    const esNROD = esNR('od', r.campo);
    
    if (esNROD || valorOD === '↓') {
        // Mostrar flecha invertida centrada
        const arrowSize = 18;
        const arrowWidth = font.widthOfTextAtSize('↓', arrowSize);
        const arrowX = (tableX + 120) + (80 / 2) - (arrowWidth / 2);
        const arrowY = fromTop(y) + (rowHeight / 2) - (arrowSize / 2.5);
        page.drawText('↓', { 
            x: arrowX, 
            y: arrowY, 
            size: arrowSize,
            font: fontBold,
            color: rgb(0.9, 0.2, 0.2)
        });
    } else {
        // Mostrar valor normal centrado
        const textoOD = `${valorOD} dB`;
        const textWidth = font.widthOfTextAtSize(textoOD, 9);
        const textX = (tableX + 120) + (80 / 2) - (textWidth / 2);
        const textY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
        page.drawText(textoOD, { 
            x: textX, 
            y: textY, 
            size: 9, 
            font,
            color: rgb(0.9, 0.2, 0.2)
        });
    }

    // 🔥 OI con soporte NR - CENTRADO
    const valorOI = getValorConNR('oi', r.campo, r.oi);
    const esNROI = esNR('oi', r.campo);
    
    if (esNROI || valorOI === '↓') {
        // Mostrar flecha invertida centrada
        const arrowSize = 18;
        const arrowWidth = font.widthOfTextAtSize('↓', arrowSize);
        const arrowX = (tableX + 200) + (80 / 2) - (arrowWidth / 2);
        const arrowY = fromTop(y) + (rowHeight / 2) - (arrowSize / 2.5);
        page.drawText('↓', { 
            x: arrowX, 
            y: arrowY, 
            size: arrowSize,
            font: fontBold,
            color: rgb(0.2, 0.5, 0.9)
        });
    } else {
        // Mostrar valor normal centrado
        const textoOI = `${valorOI} dB`;
        const textWidth = font.widthOfTextAtSize(textoOI, 9);
        const textX = (tableX + 200) + (80 / 2) - (textWidth / 2);
        const textY = fromTop(y) + (rowHeight / 2) - (9 / 2.5);
        page.drawText(textoOI, { 
            x: textX, 
            y: textY, 
            size: 9, 
            font,
            color: rgb(0.2, 0.5, 0.9)
        });
    }
});
        // =========================
        // GUARDAR
        // =========================
        const pdfBytes = await pdfDoc.save();
        const filePath = path.join(
            this.getDownloadsPath(),
            `${nombre || 'paciente'}_coosalud_${Date.now()}.pdf`
        );

        fs.writeFileSync(filePath, pdfBytes);
        console.log(`✅ PDF generado: ${filePath}`);
        return filePath;

    } catch (error) {
        console.error('❌ Error en generarPDF:', error);
        throw error;
    }
}

*/
  // Agregar a PDFGeneratorCoosalud class
async generarPDFAudiometria(datos, entidad) {
    try {
        console.log('=== generarPDFAudiometria (COOSALUD) ===');
        
        const plantillaPath = path.join(this.imagesPath, 'formatocoosalud.pdf');
        const pdfDoc = await PDFDocument.load(fs.readFileSync(plantillaPath));
        
        // 🔥 REGISTRAR FONTKIT PARA ARIAL
        pdfDoc.registerFontkit(fontkit);
        
        const page = pdfDoc.getPages()[0];
        const { width, height } = page.getSize();
        const fromTop = (y) => height - y;

        // 🔥 USAR ARIAL
        const fontPath = 'C:/Windows/Fonts/arial.ttf';
        const fontBytes = fs.readFileSync(fontPath);
        const font = await pdfDoc.embedFont(fontBytes);
        const fontBold = font;

        // CENTRAR TEXTO VERTICALMENTE
        const centerText = (topY, rowH, fontSize = 8) => {
            return fromTop(topY + (rowH / 2) + (fontSize / 2.8));
        };

        const od = datos.valores_od || {};
        const oi = datos.valores_oi || {};
        const freqs = (datos.freqs || [
            '250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'
        ]).filter(f => f !== '125');

        const nombre = datos.paciente?.nombre || '';
        const doc = datos.paciente?.documento || '';

        // FECHA
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const fechaActual = new Date();
        const fechaTexto = `Cúcuta, ${meses[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`;

        page.drawText(fechaTexto, { x: 50, y: fromTop(120), size: 10, font });

        // DATOS PACIENTE
        page.drawText(`Nombre: ${nombre}`, { x: 50, y: fromTop(150), size: 11, font });
        page.drawText(`C.C.: ${doc}`, { x: 50, y: fromTop(170), size: 11, font });
        page.drawText(`Entidad: ${entidad}`, { x: 50, y: fromTop(190), size: 11, font });

        // OTOSCOPIA
        const otoscopiaTexto = datos.otoscopia || '________';
        const palabras = otoscopiaTexto.split(' ');
        const lineas = [];
        for (let i = 0; i < palabras.length; i += 10) {
            lineas.push(palabras.slice(i, i + 20).join(' '));
        }

        page.drawText('Otoscopia:', {
            x: 50,
            y: fromTop(210),
            size: 10,
            font: fontBold
        });

        lineas.forEach((linea, index) => {
            page.drawText(linea, {
                x: 50,
                y: fromTop(225 + (index * 12)),
                size: 9,
                font,
                color: rgb(0.3, 0.3, 0.3)
            });
        });

        // IMAGEN OIDO
        const oido = await this.imageToBytes('oido_logo.jpeg');
        if (oido) {
            const img = await pdfDoc.embedJpg(oido);
            page.drawImage(img, { x: width - 200, y: fromTop(210), width: 110, height: 110 });
        }

        // TITULO
        const tituloY = 250;
        page.drawText('AUDIOMETRÍA TONAL', { 
            x: 145, 
            y: fromTop(tituloY), 
            size: 14, 
            font: fontBold 
        });

        // GRAFICA
const graficaY = 240;  // ← Valor fijo, no cambia al mover el título
if (datos.grafica_base64) {
            const base64 = datos.grafica_base64.split(',')[1];
            const buffer = Buffer.from(base64, 'base64');
            const img = datos.grafica_base64.includes('png')
                ? await pdfDoc.embedPng(buffer)
                : await pdfDoc.embedJpg(buffer);
            page.drawImage(img, { 
                x: (width - 420) / 2 - 75, 
                y: fromTop(graficaY + 300), 
                width: 520, 
                height: 280 
            });
        }

        // =========================
        // DIAGNÓSTICO
        // =========================
        const diagY = 560;
        const diagX = 50;

        page.drawText('DIAGNÓSTICO', { 
            x: diagX, 
            y: fromTop(diagY), 
            size: 11, 
            font: fontBold 
        });
        page.drawText(datos.diagnostico_od || '', { 
            x: diagX + 30, 
            y: fromTop(diagY + 35), 
            size: 10, 
            font 
        });

        // =========================
        // TABLA PTA CON TÍTULO
        // =========================
        const pta = datos.pta || {};

        const ptaX = 55;
        const ptaY = 650;

        const ptaCol1 = 45;
        const ptaCol2 = 55;
        const ptaCol3 = 55;
        const ptaRow = 20;

        // 🔥 TÍTULO "PTA" ENCIMA DE LA TABLA
        page.drawText('PTA', {
            x: ptaX + 10,
            y: fromTop(ptaY - 5),
            size: 10,
            font: fontBold
        });

        function ptaCell(x, topY, w, h) {
            page.drawRectangle({
                x,
                y: fromTop(topY + h),
                width: w,
                height: h,
                borderWidth: 0.5,
                borderColor: rgb(0.6, 0.6, 0.6)
            });
        }

        // HEADER
        ptaCell(ptaX, ptaY, ptaCol1, ptaRow);
        ptaCell(ptaX + ptaCol1, ptaY, ptaCol2, ptaRow);
        ptaCell(ptaX + ptaCol1 + ptaCol2, ptaY, ptaCol3, ptaRow);

        page.drawText('V.A', {
            x: ptaX + ptaCol1 + 18,
            y: centerText(ptaY, ptaRow, 9),
            size: 9,
            font: fontBold
        });

        page.drawText('V.O', {
            x: ptaX + ptaCol1 + ptaCol2 + 18,
            y: centerText(ptaY, ptaRow, 9),
            size: 9,
            font: fontBold
        });

        // FILA OD
        const odY = ptaY + ptaRow;

        ptaCell(ptaX, odY, ptaCol1, ptaRow);
        ptaCell(ptaX + ptaCol1, odY, ptaCol2, ptaRow);
        ptaCell(ptaX + ptaCol1 + ptaCol2, odY, ptaCol3, ptaRow);

        page.drawText('O.D.', {
            x: ptaX + 8,
            y: centerText(odY, ptaRow, 9),
            size: 9,
            font,
            color: rgb(0.9, 0.2, 0.2)
        });

        page.drawText(
            pta.od_air != null ? `${pta.od_air} dB` : '--',
            {
                x: ptaX + ptaCol1 + 10,
                y: centerText(odY, ptaRow, 9),
                size: 9,
                font,
                color: rgb(0.9, 0.2, 0.2)
            }
        );

        page.drawText(
            pta.od_bone != null ? `${pta.od_bone} dB` : '--',
            {
                x: ptaX + ptaCol1 + ptaCol2 + 10,
                y: centerText(odY, ptaRow, 9),
                size: 9,
                font,
                color: rgb(0.9, 0.2, 0.2)
            }
        );

        // FILA OI
        const oiY = odY + ptaRow;

        ptaCell(ptaX, oiY, ptaCol1, ptaRow);
        ptaCell(ptaX + ptaCol1, oiY, ptaCol2, ptaRow);
        ptaCell(ptaX + ptaCol1 + ptaCol2, oiY, ptaCol3, ptaRow);

        page.drawText('O.I.', {
            x: ptaX + 8,
            y: centerText(oiY, ptaRow, 9),
            size: 9,
            font,
            color: rgb(0.2, 0.5, 0.9)
        });

        page.drawText(
            pta.oi_air != null ? `${pta.oi_air} dB` : '--',
            {
                x: ptaX + ptaCol1 + 10,
                y: centerText(oiY, ptaRow, 9),
                size: 9,
                font,
                color: rgb(0.2, 0.5, 0.9)
            }
        );

        page.drawText(
            pta.oi_bone != null ? `${pta.oi_bone} dB` : '--',
            {
                x: ptaX + ptaCol1 + ptaCol2 + 10,
                y: centerText(oiY, ptaRow, 9),
                size: 9,
                font,
                color: rgb(0.2, 0.5, 0.9)
            }
        );

        // =========================
        // TABLA DE FRECUENCIAS
        // =========================
        const tablaX = 340;
        const tablaY = 320;
        const rowHeight = 18;

        function cell(x, y, w, h) {
            page.drawRectangle({ 
                x, 
                y, 
                width: w, 
                height: h, 
                borderWidth: 0.5, 
                borderColor: rgb(0, 0, 0) 
            });
        }

        // HEADER
        cell(tablaX, fromTop(tablaY + rowHeight), 90, rowHeight);
        cell(tablaX + 90, fromTop(tablaY + rowHeight), 55, rowHeight);
        cell(tablaX + 145, fromTop(tablaY + rowHeight), 55, rowHeight);

        page.drawText('Frecuencia', { 
            x: tablaX + 10, 
            y: centerText(tablaY, rowHeight, 8), 
            size: 8, 
            font: fontBold 
        });
        page.drawText('OD', { 
            x: tablaX + 105, 
            y: centerText(tablaY, rowHeight, 8), 
            size: 8, 
            font: fontBold 
        });
        page.drawText('OI', { 
            x: tablaX + 160, 
            y: centerText(tablaY, rowHeight, 8), 
            size: 8, 
            font: fontBold 
        });

        // FILAS
        freqs.forEach((f, i) => {
            const rowY = tablaY + rowHeight + (i * rowHeight);
            
            cell(tablaX, fromTop(rowY + rowHeight), 90, rowHeight);
            cell(tablaX + 90, fromTop(rowY + rowHeight), 55, rowHeight);
            cell(tablaX + 145, fromTop(rowY + rowHeight), 55, rowHeight);
            
            page.drawText(`${f} Hz`, { 
                x: tablaX + 8, 
                y: centerText(rowY, rowHeight, 8), 
                size: 8, 
                font 
            });
            
            page.drawText(`${od[f] || '—'} dB`, { 
                x: tablaX + 96, 
                y: centerText(rowY, rowHeight, 8), 
                size: 8, 
                font, 
                color: rgb(0.9, 0.2, 0.2) 
            });
            
            page.drawText(`${oi[f] || '—'} dB`, { 
                x: tablaX + 151, 
                y: centerText(rowY, rowHeight, 8), 
                size: 8, 
                font, 
                color: rgb(0.2, 0.5, 0.9) 
            });
        });

        // GUARDAR
        const pdfBytes = await pdfDoc.save();
        const filePath = path.join(
            this.getDownloadsPath(), 
            `${nombre || 'paciente'}_Audiometria_${Date.now()}.pdf`
        );
        fs.writeFileSync(filePath, pdfBytes);

        console.log(`✅ PDF Audiometría COOSALUD generado: ${filePath}`);
        return filePath;

    } catch (error) {
        console.error('Error en generarPDFAudiometria (COOSALUD):', error);
        throw error;
    }
}
// services/pdfGeneratorCoosalud.js
// Agregar después del método generarPDFAudiometria

async generarPDFLogoaudiometria(datos, entidad) {
    try {
        console.log('=== generarPDFLogoaudiometria (COOSALUD) con soporte NR ===');
        // Reutilizar el código de generarPDF que ya tiene soporte NR
        return await this.generarPDF(datos, entidad);
    } catch (error) {
        console.error('Error en generarPDFLogoaudiometria (COOSALUD):', error);
        throw error;
    }
}
}

module.exports = new PDFGeneratorCoosalud();