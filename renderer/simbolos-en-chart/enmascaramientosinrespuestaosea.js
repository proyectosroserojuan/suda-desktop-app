// ============================================
// ENMASCARAMIENTO SIN RESPUESTA VÍA ÓSEA
// ============================================

// Variables para almacenar las imágenes
let imgOD = null;
let imgOI = null;

// Configuración de las imágenes
const IMG_CONFIG = {
    od: {
        path: '../assets/images/od.png',
        width: 20,
        height: 20
    },
    oi: {
        path: '../assets/images/oi.png',
        width: 20,
        height: 20
    }
};

// ============================================
// 1. CARGAR IMÁGENES Y EXPONERLAS GLOBALMENTE
// ============================================

function cargarImagenes() {
    return new Promise((resolve, reject) => {
        let cargadas = 0;
        const total = Object.keys(IMG_CONFIG).length;
        let errores = [];

        Object.keys(IMG_CONFIG).forEach(ear => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = IMG_CONFIG[ear].path;
            
            img.onload = () => {
                cargadas++;
                if (ear === 'od') {
                    imgOD = img;
                    window._imgOD = img;
                }
                if (ear === 'oi') {
                    imgOI = img;
                    window._imgOI = img;
                }
                if (cargadas === total) {
                    console.log('✅ Imágenes OD y OI cargadas correctamente');
                    resolve();
                }
            };
            
            img.onerror = () => {
                cargadas++;
                errores.push(`Error al cargar ${ear}: ${IMG_CONFIG[ear].path}`);
                if (cargadas === total) {
                    console.error('❌ Errores al cargar imágenes:', errores);
                    reject(new Error(errores.join(', ')));
                }
            };
        });
    });
}

// ============================================
// 2. OBTENER EL CHART
// ============================================

function obtenerChart() {
    if (window.chart) return window.chart;
    if (window.myChart) return window.myChart;
    
    if (typeof Chart !== 'undefined' && Chart.instances) {
        const instances = Object.values(Chart.instances);
        if (instances.length > 0) {
            for (const instance of instances) {
                if (instance.canvas && instance.canvas.id === 'toneChart') {
                    window.chart = instance;
                    return instance;
                }
            }
            window.chart = instances[0];
            return instances[0];
        }
    }
    
    const canvas = document.getElementById('toneChart');
    if (canvas && canvas.chart) {
        window.chart = canvas.chart;
        return canvas.chart;
    }
    
    console.warn('⚠️ No se pudo encontrar la instancia de Chart.js');
    return null;
}

// ============================================
// 3. FUNCIÓN PRINCIPAL: DIBUJAR IMÁGENES Y GUIONES NR
// ============================================

function dibujarNR() {
    const drawingCanvas = document.getElementById('drawingCanvas');
    const chart = obtenerChart();
    
    if (!drawingCanvas || !chart) {
        return;
    }
    
    const drawCtx = drawingCanvas.getContext('2d');
    const scaleX = drawingCanvas._scaleX || 1;
    const scaleY = drawingCanvas._scaleY || 1;
    const frecuenciasNR = ['250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
    
    if (!imgOD || !imgOI) {
        cargarImagenes().then(() => dibujarNR());
        return;
    }
    
    const posOD = [];
    const posOI = [];
    const freqs = window.freqs || [];
    const xPositions = window.xPositions || [];
    
    frecuenciasNR.forEach((freq) => {
        const freqIndex = freqs.indexOf(freq);
        if (freqIndex === -1 || freqIndex >= xPositions.length) return;
        
        const inputOD = document.getElementById(`od-bone_${freq}`);
        const inputOI = document.getElementById(`oi-bone_${freq}`);
        
        // Verificar NR: valor "-" o "NR" o "NR2"
        const valOD = inputOD ? inputOD.value.trim() : '';
        const valOI = inputOI ? inputOI.value.trim() : '';
        
        if (valOD === '-' || valOD === 'NR' || valOD === 'NR2') {
            const chartX = chart.scales.x.getPixelForValue(xPositions[freqIndex]);
            const chartY = chart.scales.y.getPixelForValue(110);
            posOD.push({ x: chartX * scaleX, y: chartY * scaleY, freq });
        }
        
        if (valOI === '-' || valOI === 'NR' || valOI === 'NR2') {
            const chartX = chart.scales.x.getPixelForValue(xPositions[freqIndex]);
            const chartY = chart.scales.y.getPixelForValue(110);
            posOI.push({ x: chartX * scaleX, y: chartY * scaleY, freq });
        }
    });
    
    // Dibujar imágenes OD
    posOD.forEach(p => {
        const w = IMG_CONFIG.od.width;
        const h = IMG_CONFIG.od.height;
        drawCtx.drawImage(imgOD, p.x - w/2, p.y - h/2, w, h);
    });
    
    // Dibujar imágenes OI
    posOI.forEach(p => {
        const w = IMG_CONFIG.oi.width;
        const h = IMG_CONFIG.oi.height;
        drawCtx.drawImage(imgOI, p.x - w/2, p.y - h/2, w, h);
    });
    
    // Dibujar guiones entre puntos NR
    function dibujarGuiones(puntos, color) {
        if (puntos.length < 2) return;
        puntos.sort((a, b) => frecuenciasNR.indexOf(a.freq) - frecuenciasNR.indexOf(b.freq));
        for (let i = 1; i < puntos.length; i++) {
            const prev = puntos[i - 1];
            const curr = puntos[i];
            // Solo dibujar guión si hay una frecuencia intermedia con NR
            const freqAnterior = prev.freq;
            const freqActual = curr.freq;
            const idxAnterior = frecuenciasNR.indexOf(freqAnterior);
            const idxActual = frecuenciasNR.indexOf(freqActual);
            
            // Verificar si hay alguna frecuencia NR entre medio
            let hayNRIntermedio = true;
            for (let j = idxAnterior + 1; j < idxActual; j++) {
                const freqIntermedia = frecuenciasNR[j];
                const inputCheck = document.getElementById(ear === 'od' ? `od-bone_${freqIntermedia}` : `oi-bone_${freqIntermedia}`);
                if (inputCheck && (inputCheck.value.trim() === '-' || inputCheck.value.trim() === 'NR' || inputCheck.value.trim() === 'NR2')) {
                    // Hay otra NR entre medio, no dibujar guión
                    hayNRIntermedio = false;
                    break;
                }
            }
            
            if (!hayNRIntermedio) {
                const midX = (prev.x + curr.x) / 2;
                const midY = (prev.y + curr.y) / 2;
                const angle = Math.atan2(curr.y - prev.y, curr.x - prev.x);
                drawCtx.save();
                drawCtx.translate(midX, midY);
                drawCtx.rotate(angle);
                drawCtx.fillStyle = color;
                drawCtx.font = "bold 20px Arial";
                drawCtx.textAlign = "center";
                drawCtx.textBaseline = "middle";
                drawCtx.fillText("-", 0, 0);
                drawCtx.restore();
            }
        }
    }
    
    // Dibujar guiones
    if (posOD.length >= 2) dibujarGuiones(posOD, "#8B0000");
    if (posOI.length >= 2) dibujarGuiones(posOI, "#1d4ed8");
}

// ============================================
// 4. INICIALIZAR - CONECTAR EVENTOS
// ============================================

function inicializarSinRespuestaOsea() {
    console.log('🔄 Inicializando enmascaramiento sin respuesta vía ósea...');
    
    cargarImagenes().then(() => {
        console.log('✅ Imágenes cargadas correctamente');
        setTimeout(dibujarNR, 100);
    }).catch(err => {
        console.error('❌ Error al cargar imágenes:', err);
    });

    // Observar cambios en inputs de vía ósea
    const frecuencias = ['250', '500', '750', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
    frecuencias.forEach(freq => {
        const inputOD = document.getElementById(`od-bone_${freq}`);
        const inputOI = document.getElementById(`oi-bone_${freq}`);
        
        if (inputOD) {
            inputOD.addEventListener('input', function() {
                if (this.value.trim() === '-' || this.value === '') {
                    setTimeout(dibujarNR, 50);
                }
            });
        }
        
        if (inputOI) {
            inputOI.addEventListener('input', function() {
                if (this.value.trim() === '-' || this.value === '') {
                    setTimeout(dibujarNR, 50);
                }
            });
        }
    });

    // Interceptar redrawAll para dibujar NR después
    if (window.redrawAll) {
        const originalRedrawAll = window.redrawAll;
        window.redrawAll = function() {
            originalRedrawAll();
            setTimeout(dibujarNR, 30);
        };
    }

    // Interceptar sincronizarCanvasDesdeInputs
    if (window.sincronizarCanvasDesdeInputs) {
        const originalSincronizar = window.sincronizarCanvasDesdeInputs;
        window.sincronizarCanvasDesdeInputs = function() {
            originalSincronizar();
            setTimeout(dibujarNR, 30);
        };
    }

    console.log('✅ SinRespuestaOsea inicializado correctamente');
}

// ============================================
// 5. FUNCIONES PÚBLICAS
// ============================================

const SinRespuestaOsea = {
    init: inicializarSinRespuestaOsea,
    dibujar: dibujarNR,
    cargarImagenes: cargarImagenes,
    getTamanosOD: function() {
        return { width: IMG_CONFIG.od.width, height: IMG_CONFIG.od.height };
    },
    getTamanosOI: function() {
        return { width: IMG_CONFIG.oi.width, height: IMG_CONFIG.oi.height };
    },
    setRutasImagenes: function(rutas) {
        if (rutas.od) IMG_CONFIG.od.path = rutas.od;
        if (rutas.oi) IMG_CONFIG.oi.path = rutas.oi;
    },
    setTamanosImagenes: function(tamanos) {
        if (tamanos.od) {
            IMG_CONFIG.od.width = tamanos.od.width || IMG_CONFIG.od.width;
            IMG_CONFIG.od.height = tamanos.od.height || IMG_CONFIG.od.height;
        }
        if (tamanos.oi) {
            IMG_CONFIG.oi.width = tamanos.oi.width || IMG_CONFIG.oi.width;
            IMG_CONFIG.oi.height = tamanos.oi.height || IMG_CONFIG.oi.height;
        }
    }
};

// Auto-ejecución
if (typeof window !== 'undefined') {
    window.SinRespuestaOsea = SinRespuestaOsea;
    
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        setTimeout(SinRespuestaOsea.init, 1000);
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(SinRespuestaOsea.init, 1000);
        });
    }
}