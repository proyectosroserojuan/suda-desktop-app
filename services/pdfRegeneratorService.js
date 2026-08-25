// services/pdfRegeneratorService.js - REEMPLAZAR COMPLETAMENTE

const { BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const https = require('https');

// Importar los generadores de PDF
const pdfGeneratorUnified = require('./pdfGeneratorUnified');
const pdfGeneratorCoosaludUnified = require('./pdfGeneratorCoosaludUnified');
const pdfGeneratorCoosalud = require('./pdfGeneratorCoosalud');
const pdfGenerator = require('./pdfGenerator');

class PDFRegeneratorService {
    constructor() {
        this.downloadsPath = path.join(os.homedir(), 'Downloads');
        this.tempPath = path.join(os.tmpdir(), 'audiologia_pdfs');
        
        if (!fs.existsSync(this.tempPath)) {
            fs.mkdirSync(this.tempPath, { recursive: true });
        }
    }

        // ============================================
    // MÉTODO NUEVO 1: Descargar imagen desde URL
    // ============================================
    descargarImagen(url) {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`Error HTTP: ${response.statusCode}`));
                    return;
                }
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
                response.on('error', reject);
            }).on('error', reject);
        });
    }

    // ============================================
    // MÉTODO NUEVO 2: Convertir URL a base64
    // ============================================
    async urlToBase64(url) {
        if (!url) return null;
        try {
            const buffer = await this.descargarImagen(url);
            return `data:image/png;base64,${buffer.toString('base64')}`;
        } catch (error) {
            console.error('⚠️ Error convirtiendo URL a base64:', error);
            return null;
        }
    }

    /**
     * ✅ REGENERAR PDF - USA tipo_atencion_id para decidir
     */
    async regenerarPDF(cita, examenAudiometria, examenLogoaudiometria) {
        console.log('\n========== REGENERANDO PDF DESDE BD ==========');
        console.log('Cita ID:', cita.id);
        console.log('Paciente:', cita.paciente_nombre);
        console.log('Entidad:', cita.entidad_nombre);
        console.log('Tipo Atención ID:', cita.tipo_atencion_id);
        console.log('Tiene Audiometría:', !!examenAudiometria);
        console.log('Tiene Logoaudiometría:', !!examenLogoaudiometria);


        // Al inicio de regenerarPDF, después de obtener los exámenes
console.log('📊 DIAGNOSTICO en examenAudiometria:', {
    existe: !!examenAudiometria,
    diagnostico: examenAudiometria?.diagnostico,
    diagnostico_od: examenAudiometria?.diagnostico_od,
    diagnostico_oi: examenAudiometria?.diagnostico_oi
});

console.log('📊 DIAGNOSTICO en examenLogoaudiometria:', {
    existe: !!examenLogoaudiometria,
    diagnostico: examenLogoaudiometria?.diagnostico,
    diagnostico_od: examenLogoaudiometria?.diagnostico_od,
    diagnostico_oi: examenLogoaudiometria?.diagnostico_oi
});
        
        try {
            if (!examenAudiometria && !examenLogoaudiometria) {
                throw new Error('No hay datos de examen para generar el PDF');
            }

            const entidad = cita.entidad_nombre || 'UDA';
            const esCoosalud = entidad.toLowerCase().includes('coosalud') || 
                              entidad.toLowerCase().includes('progresando');
            
            // ✅ DETERMINAR QUÉ TIPO DE PDF GENERAR SEGÚN tipo_atencion_id
            const tipoId = cita.tipo_atencion_id;
            
            // Tipos combinados: 3 (Audiometria Tonal y Logoadiometria), 
            // 4 (Cuadro Clinico Auditivo), 7 (Prepagada Audiometria Tonal y Logoadiometria)
            const esCombinado = [3, 4, 7].includes(tipoId);
            
            // Tipos solo audiometría: 1 (Audiometría), 5 (Prepagada Audiometria Tonal)
            const esSoloAudiometria = [1, 5].includes(tipoId);
            
            // Tipos solo logoaudiometría: 2 (Logoaudiometria), 6 (Prepagada Logoaudiometria)
            const esSoloLogoaudiometria = [2, 6].includes(tipoId);
            
            console.log(`📋 Decisión por tipo_atencion_id (${tipoId}):`, {
                esCombinado,
                esSoloAudiometria,
                esSoloLogoaudiometria
            });
            
            let pdfPath = null;
            
            // ✅ CASO 1: COMBINADO (tipos 3, 4, 7)
if (esCombinado) {
    console.log('📄 Generando PDF COMBINADO (por tipo_atencion_id)');
    
    // 🔥 CORREGIDO: Pasar CADA examen por separado, SIN usar ||
    const datosAudiometria = await this.prepararDatosParaPDF(cita, examenAudiometria, 'audiometria');
    const datosLogoaudiometria = await this.prepararDatosParaPDF(cita, examenLogoaudiometria, 'logoaudiometria');
                
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
            }
            // ✅ CASO 2: SOLO AUDIOMETRÍA (tipos 1, 5)
            else if (esSoloAudiometria) {
                console.log('📄 Generando PDF de AUDIOMETRÍA (por tipo_atencion_id)');
                const datos = await this.prepararDatosParaPDF(cita, examenAudiometria, 'audiometria');
                
                if (esCoosalud) {
                    pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad, 'audiometria');
                } else {
                    pdfPath = await pdfGenerator.generarPDF(datos, entidad, 'audiometria');
                }
            }
            // ✅ CASO 3: SOLO LOGOAUDIOMETRÍA (tipos 2, 6)
            else if (esSoloLogoaudiometria) {
                console.log('📄 Generando PDF de LOGOAUDIOMETRÍA (por tipo_atencion_id)');
                const datos = await this.prepararDatosParaPDF(cita, examenLogoaudiometria, 'logoaudiometria');
                
                if (esCoosalud) {
                    pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad, 'logoaudiometria');
                } else {
                    pdfPath = await pdfGenerator.generarPDF(datos, entidad, 'logoaudiometria');
                }
            }
            // ✅ CASO 4: FALLBACK - Detectar automáticamente
            else {
                console.log('⚠️ Tipo no reconocido, detectando automáticamente...');
                
                const tieneAudiometria = this.tieneAudiometria(examenAudiometria || examenLogoaudiometria);
                const tieneLogoaudiometria = this.tieneLogoaudiometria(examenAudiometria || examenLogoaudiometria);
                
                if (tieneAudiometria && tieneLogoaudiometria) {
                    console.log('📄 Generando PDF COMBINADO (detección automática)');
                    const datosAudiometria = await this.prepararDatosParaPDF(cita, examenAudiometria || examenLogoaudiometria, 'audiometria');
                    const datosLogoaudiometria = await this.prepararDatosParaPDF(cita, examenLogoaudiometria || examenAudiometria, 'logoaudiometria');
                    
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
                } else if (tieneAudiometria) {
                    console.log('📄 Generando PDF de AUDIOMETRÍA (detección automática)');
                    const datos = await this.prepararDatosParaPDF(cita, examenAudiometria || examenLogoaudiometria, 'audiometria');
                    
                    if (esCoosalud) {
                        pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad, 'audiometria');
                    } else {
                        pdfPath = await pdfGenerator.generarPDF(datos, entidad, 'audiometria');
                    }
                } else if (tieneLogoaudiometria) {
                    console.log('📄 Generando PDF de LOGOAUDIOMETRÍA (detección automática)');
                    const datos = await this.prepararDatosParaPDF(cita, examenLogoaudiometria || examenAudiometria, 'logoaudiometria');
                    
                    if (esCoosalud) {
                        pdfPath = await pdfGeneratorCoosalud.generarPDF(datos, entidad, 'logoaudiometria');
                    } else {
                        pdfPath = await pdfGenerator.generarPDF(datos, entidad, 'logoaudiometria');
                    }
                } else {
                    throw new Error('No se encontraron datos válidos para generar el PDF');
                }
            }
            
            console.log('✅ PDF regenerado exitosamente:', pdfPath);
            return pdfPath;
            
        } catch (error) {
            console.error('❌ Error regenerando PDF:', error);
            throw error;
        }
    }

    /**
     * ✅ DETECTAR SI TIENE DATOS DE AUDIOMETRÍA
     */
    tieneAudiometria(examen) {
        if (!examen) return false;
        
        const tienePTA = !!(examen.pta_via_aerea_od || examen.pta_via_aerea_oi || 
                           examen.pta_via_osea_od || examen.pta_via_osea_oi);
        const tieneDiagnostico = !!(examen.diagnostico);
        
        let tieneValores = false;
        if (examen.valores_od) {
            try {
                const vals = typeof examen.valores_od === 'string' ? JSON.parse(examen.valores_od) : examen.valores_od;
                tieneValores = Object.keys(vals).some(k => vals[k] && vals[k] !== '');
            } catch(e) {}
        }
        if (!tieneValores && examen.valores_oi) {
            try {
                const vals = typeof examen.valores_oi === 'string' ? JSON.parse(examen.valores_oi) : examen.valores_oi;
                tieneValores = Object.keys(vals).some(k => vals[k] && vals[k] !== '');
            } catch(e) {}
        }
        
        return tienePTA || tieneDiagnostico || tieneValores;
    }

    /**
     * ✅ DETECTAR SI TIENE DATOS DE LOGOAUDIOMETRÍA
     */
    tieneLogoaudiometria(examen) {
        if (!examen) return false;
        
        const tieneURV = !!(examen.urv_od || examen.urv_oi);
        const tieneUpalabra = !!(examen.upalabra_od || examen.upalabra_oi);
        const tieneUdisc = !!(examen.udisc_od || examen.udisc_oi);
        const tienePmax = !!(examen.pmax_od || examen.pmax_oi);
        const tieneDiagnostico = !!(examen.diagnostico);
        const tieneGraficaLogo = !!(examen.grafica_logo_base64);
        
        return tieneURV || tieneUpalabra || tieneUdisc || tienePmax || 
               tieneDiagnostico || tieneGraficaLogo;
    }

// En services/pdfRegeneratorService.js - modificar prepararDatosParaPDF
    async prepararDatosParaPDF(cita, examenData, tipo = 'audiometria') {
        let valoresOD = examenData?.valores_od || {};
        let valoresOI = examenData?.valores_oi || {};
        
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

            const diagnostico = examenData?.diagnostico || '';
    
    console.log(`📋 DIAGNOSTICO para ${tipo}:`, {
        valor: diagnostico,
        desde_examenData: !!examenData?.diagnostico,
        longitud: diagnostico.length
    });


       

        // 🔥 NUEVO: Convertir URLs de Cloudinary a base64
        let graficaTonalBase64 = examenData?.grafica_tonal_base64 || examenData?.grafica_base64 || '';
        
        // Si no tiene base64 pero tiene URL de Cloudinary, descargarla
        if (!graficaTonalBase64 && examenData?.grafica_tonal_url) {
            console.log('🔄 Descargando imagen tonal desde Cloudinary');
            graficaTonalBase64 = await this.urlToBase64(examenData.grafica_tonal_url);
        }
        
        let graficaLogoBase64 = examenData?.grafica_logo_base64 || '';
        if (!graficaLogoBase64 && examenData?.grafica_logo_url) {
            console.log('🔄 Descargando imagen logo desde Cloudinary');
            graficaLogoBase64 = await this.urlToBase64(examenData.grafica_logo_url);
        }

        // Si es logoaudiometria y no tiene logo, intentar con grafica_base64
        if (tipo === 'logoaudiometria' && !graficaLogoBase64 && examenData?.grafica_base64) {
            graficaLogoBase64 = examenData.grafica_base64;
        }

        return {
            paciente: {
                nombre: cita.paciente_nombre || '',
                documento: cita.documento || ''
            },
            valores_od: valoresOD,
            valores_oi: valoresOI,
        
            diagnostico_od: examenData?.diagnostico_od || '',
            diagnostico_oi: examenData?.diagnostico_oi || '',
            observaciones: examenData?.observaciones || '',
            otoscopia: examenData?.otoscopia || '',
            grafica_tonal_base64: graficaTonalBase64,
            grafica_logo_base64: graficaLogoBase64,
            pta: {
                od_air: parseNumber(examenData?.pta_via_aerea_od),
                od_bone: parseNumber(examenData?.pta_via_osea_od),
                oi_air: parseNumber(examenData?.pta_via_aerea_oi),
                oi_bone: parseNumber(examenData?.pta_via_osea_oi)
            },
             diagnostico: diagnostico,
            urv_od: parseNumber(examenData?.urv_od),
            urv_oi: parseNumber(examenData?.urv_oi),
            upalabra_od: parseNumber(examenData?.upalabra_od),
            upalabra_oi: parseNumber(examenData?.upalabra_oi),
            udisc_od: parseNumber(examenData?.udisc_od),
            udisc_oi: parseNumber(examenData?.udisc_oi),
            pmax_od: parseNumber(examenData?.pmax_od),
            pmax_oi: parseNumber(examenData?.pmax_oi),
            freqs: ['250', '500', '1000', '2000', '3000', '4000', '6000', '8000']
        };
    }

    /**
     * MOSTRAR PDF EN VENTANA
     */
    async mostrarPDFEnVentana(pdfPath, titulo = 'Resultados del Examen') {
        if (!pdfPath || !fs.existsSync(pdfPath)) {
            throw new Error('El archivo PDF no existe');
        }
        
        console.log('🖥️ Mostrando PDF en ventana:', pdfPath);
        
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
        
        try {
            const fileUrl = `file://${pdfPath.replace(/\\/g, '/')}`;
            await win.loadURL(fileUrl);
            win.show();
            win.focus();
            console.log('✅ PDF cargado directamente');
            return win;
        } catch (error) {
            console.warn('⚠️ Error cargando PDF, usando fallback:', error.message);
            
            const fileUrl = `file://${pdfPath.replace(/\\/g, '/')}`;
            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${titulo}</title>
                    <style>
                        body { margin:0; background:#f0f0f0; display:flex; flex-direction:column; height:100vh; }
                        .toolbar { background:#2c3e50; color:white; padding:8px 20px; display:flex; justify-content:space-between; }
                        .pdf-viewer { flex:1; }
                        .pdf-viewer object, .pdf-viewer embed { width:100%; height:100%; }
                        button { background:#34495e; color:white; border:none; padding:5px 14px; border-radius:4px; cursor:pointer; }
                        button:hover { background:#4a6a8a; }
                    </style>
                </head>
                <body>
                    <div class="toolbar">
                        <span>📄 ${titulo}</span>
                        <div>
                            <button onclick="window.print()">🖨️ Imprimir</button>
                            <button onclick="window.open('${fileUrl}', '_blank')">📂 Abrir externo</button>
                        </div>
                    </div>
                    <div class="pdf-viewer">
                        <embed src="${fileUrl}" type="application/pdf" width="100%" height="100%">
                    </div>
                </body>
                </html>
            `;
            
            await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
            win.show();
            win.focus();
            return win;
        }
    }
}

module.exports = new PDFRegeneratorService();