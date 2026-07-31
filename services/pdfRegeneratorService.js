// services/pdfRegeneratorService.js
const { BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Importar los generadores de PDF
const pdfGeneratorUnified = require('./pdfGeneratorUnified');
const pdfGeneratorCoosaludUnified = require('./pdfGeneratorCoosaludUnified');

// Importar módulos de base de datos
const examenesDB = require('../db/examenes_unificados');

class PDFRegeneratorService {
    constructor() {
        this.downloadsPath = path.join(os.homedir(), 'Downloads');
        this.tempPath = path.join(os.tmpdir(), 'audiologia_pdfs');
        
        // Crear carpeta temporal si no existe
        if (!fs.existsSync(this.tempPath)) {
            fs.mkdirSync(this.tempPath, { recursive: true });
        }
    }

    /**
     * REGENERAR PDF COMPLETO DESDE DATOS DE BASE DE DATOS
     */
    async regenerarPDF(cita, examenData) {
        console.log('\n========== REGENERANDO PDF DESDE BD ==========');
        console.log('Cita ID:', cita.id);
        console.log('Paciente:', cita.paciente_nombre);
        console.log('Entidad:', cita.entidad_nombre);
        console.log('Tipo examen:', examenData.tipo_examen);
        
        try {
            if (!examenData) {
                throw new Error('No hay datos del examen en la base de datos');
            }

            const entidad = cita.entidad_nombre || 'UDA';
            const esCoosalud = entidad.toLowerCase().includes('coosalud') || 
                              entidad.toLowerCase().includes('progresando');
            
            // Buscar ambos tipos de examen
            let datosAudiometria = null;
            let datosLogoaudiometria = null;
            
            if (examenData.tipo_examen === 'audiometria') {
                datosAudiometria = this.prepararDatosParaPDF(cita, examenData);
                try {
                    const logoaudioResult = await examenesDB.obtenerExamenesPorCitaYtipo(cita.id, 'logoaudiometria');
                    if (logoaudioResult) {
                        datosLogoaudiometria = this.prepararDatosParaPDF(cita, logoaudioResult);
                        console.log('✅ Logoaudiometría encontrada para combinar');
                    }
                } catch(e) {
                    console.log('⚠️ No se encontró logoaudiometría para combinar');
                }
            } else if (examenData.tipo_examen === 'logoaudiometria') {
                datosLogoaudiometria = this.prepararDatosParaPDF(cita, examenData);
                try {
                    const audioResult = await examenesDB.obtenerExamenesPorCitaYtipo(cita.id, 'audiometria');
                    if (audioResult) {
                        datosAudiometria = this.prepararDatosParaPDF(cita, audioResult);
                        console.log('✅ Audiometría encontrada para combinar');
                    }
                } catch(e) {
                    console.log('⚠️ No se encontró audiometría para combinar');
                }
            } else {
                datosAudiometria = this.prepararDatosParaPDF(cita, examenData);
            }
            
            let pdfPath = null;
            
            if (datosAudiometria && datosLogoaudiometria) {
                console.log('📄 Generando PDF COMBINADO (Audiometría + Logoaudiometría)');
                if (esCoosalud) {
                    pdfPath = await pdfGeneratorCoosaludUnified.generarPDFCombinadoCOO(
                        datosAudiometria,
                        datosLogoaudiometria,
                        entidad
                    );
                } else {
                    pdfPath = await pdfGeneratorUnified.generarPDFCombinado(
                        datosAudiometria,
                        datosLogoaudiometria,
                        entidad
                    );
                }
            } else if (datosAudiometria) {
                console.log('📄 Generando PDF de AUDIOMETRÍA');
                if (esCoosalud) {
                    pdfPath = await pdfGeneratorCoosaludUnified.generarPDFAudiometria(datosAudiometria, entidad);
                } else {
                    pdfPath = await pdfGeneratorUnified.generarPDFAudiometria(datosAudiometria, entidad);
                }
            } else if (datosLogoaudiometria) {
                console.log('📄 Generando PDF de LOGOAUDIOMETRÍA');
                if (esCoosalud) {
                    pdfPath = await pdfGeneratorCoosaludUnified.generarPDFLogoaudiometria(datosLogoaudiometria, entidad);
                } else {
                    pdfPath = await pdfGeneratorUnified.generarPDFLogoaudiometria(datosLogoaudiometria, entidad);
                }
            } else {
                throw new Error('No se encontraron datos válidos para generar el PDF');
            }
            
            console.log('✅ PDF regenerado exitosamente:', pdfPath);
            return pdfPath;
            
        } catch (error) {
            console.error('❌ Error regenerando PDF:', error);
            throw error;
        }
    }

    /**
     * PREPARAR DATOS PARA EL GENERADOR DE PDF
     */
    prepararDatosParaPDF(cita, examenData) {
        let valoresOD = examenData.valores_od || {};
        let valoresOI = examenData.valores_oi || {};
        
        if (typeof valoresOD === 'string') {
            try { valoresOD = JSON.parse(valoresOD); } catch(e) { valoresOD = {}; }
        }
        if (typeof valoresOI === 'string') {
            try { valoresOI = JSON.parse(valoresOI); } catch(e) { valoresOI = {}; }
        }
        
        const parseNumber = (val) => {
            if (val === null || val === undefined || val === '') return null;
            const num = Number(val);
            return isNaN(num) ? null : num;
        };
        
        return {
            paciente: {
                nombre: cita.paciente_nombre || '',
                documento: cita.documento || ''
            },
            valores_od: valoresOD,
            valores_oi: valoresOI,
            diagnostico_od: examenData.diagnostico_od || '',
            diagnostico_oi: examenData.diagnostico_oi || '',
            observaciones: examenData.observaciones || '',
            otoscopia: examenData.otoscopia || '',
            grafica_base64: examenData.grafica_base64 || '',
            pta: {
                od_air: parseNumber(examenData.pta_via_aerea_od),
                od_bone: parseNumber(examenData.pta_via_osea_od),
                oi_air: parseNumber(examenData.pta_via_aerea_oi),
                oi_bone: parseNumber(examenData.pta_via_osea_oi)
            },
            diagnostico: examenData.diagnostico || '',
            urv_od: parseNumber(examenData.urv_od),
            urv_oi: parseNumber(examenData.urv_oi),
            upalabra_od: parseNumber(examenData.upalabra_od),
            upalabra_oi: parseNumber(examenData.upalabra_oi),
            udisc_od: parseNumber(examenData.udisc_od),
            udisc_oi: parseNumber(examenData.udisc_oi),
            pmax_od: parseNumber(examenData.pmax_od),
            pmax_oi: parseNumber(examenData.pmax_oi),
            freqs: ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000']
        };
    }

    /**
     * MOSTRAR PDF EN UNA VENTANA - Versión mejorada
     */
    async mostrarPDFEnVentana(pdfPath, titulo = 'Resultados del Examen') {
        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('El archivo PDF no existe');
        }
        
        console.log('🖥️ Mostrando PDF en ventana:', pdfPath);
        console.log('📄 Tamaño del PDF:', fs.statSync(pdfPath).size, 'bytes');
        
        const win = new BrowserWindow({
            width: 1000,
            height: 850,
            title: titulo,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                webSecurity: true
            }
        });
        
        // Intentar cargar directamente con file://
        try {
            const fileUrl = `file://${pdfPath.replace(/\\/g, '/')}`;
            console.log('📂 Cargando URL:', fileUrl);
            
            await win.loadURL(fileUrl);
            win.show();
            win.focus();
            console.log('✅ PDF cargado directamente');
            return win;
        } catch (error) {
            console.warn('⚠️ No se pudo cargar directamente, usando visor HTML:', error.message);
        }
        
        // Fallback con visor HTML mejorado
        const fileUrl = `file://${pdfPath.replace(/\\/g, '/')}`;
        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${titulo}</title>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        background: #f0f0f0; 
                        font-family: Arial, sans-serif;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                    }
                    .toolbar {
                        background: #2c3e50;
                        color: white;
                        padding: 8px 20px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-shrink: 0;
                        z-index: 10;
                    }
                    .toolbar-title {
                        font-size: 14px;
                        font-weight: bold;
                    }
                    .toolbar button {
                        background: #34495e;
                        color: white;
                        border: none;
                        padding: 5px 14px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        margin-left: 8px;
                        transition: background 0.2s;
                    }
                    .toolbar button:hover {
                        background: #4a6a8a;
                    }
                    .pdf-viewer {
                        flex: 1;
                        width: 100%;
                        background: #525659;
                        position: relative;
                    }
                    .pdf-viewer object,
                    .pdf-viewer embed {
                        width: 100%;
                        height: 100%;
                        display: block;
                        border: none;
                    }
                    .error-message {
                        display: none;
                        padding: 40px;
                        text-align: center;
                        color: #666;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                        max-width: 500px;
                    }
                    .error-message h2 { margin-bottom: 15px; color: #e74c3c; }
                    .error-message button {
                        background: #3498db;
                        color: white;
                        border: none;
                        padding: 10px 24px;
                        border-radius: 6px;
                        font-size: 14px;
                        cursor: pointer;
                        margin-top: 15px;
                    }
                    .error-message button:hover {
                        background: #2980b9;
                    }
                    .error-message .file-path {
                        font-size: 11px;
                        color: #999;
                        word-break: break-all;
                        margin-top: 10px;
                    }
                </style>
            </head>
            <body>
                <div class="toolbar">
                    <span class="toolbar-title">📄 ${titulo}</span>
                    <div>
                        <button onclick="window.print()">🖨️ Imprimir</button>
                        <button onclick="window.location.reload()">🔄 Recargar</button>
                        <button onclick="window.open('${fileUrl}', '_blank')">📂 Abrir externo</button>
                    </div>
                </div>
                <div class="pdf-viewer">
                    <object data="${fileUrl}" type="application/pdf" width="100%" height="100%">
                        <embed src="${fileUrl}" type="application/pdf" width="100%" height="100%">
                        <div class="error-message" style="display:block;">
                            <h2>❌ No se puede mostrar el PDF</h2>
                            <p>El visor de PDF no está disponible en esta ventana.</p>
                            <button onclick="window.open('${fileUrl}', '_blank')">
                                📂 Abrir con visor externo
                            </button>
                            <div class="file-path">📁 ${pdfPath}</div>
                        </div>
                    </object>
                </div>
            </body>
            </html>
        `;
        
        await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        win.show();
        win.focus();
        
        console.log('✅ PDF cargado con visor HTML');
        return win;
    }
}

module.exports = new PDFRegeneratorService();