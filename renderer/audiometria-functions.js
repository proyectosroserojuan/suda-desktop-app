// ============================================
// AUDIOMETRIA TONAL - FUNCIONES DE GUARDADO Y PDF
// ============================================

async function capturarGraficaAudiometria() {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById('toneChart');
        if (!canvas) {
            reject(new Error('No se encontró el canvas de la gráfica'));
            return;
        }
        
        html2canvas(canvas, {
            scale: 2.5,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
        }).then(resolve).catch(reject);
    });
}

function obtenerValoresAudiometria() {
    const freqs = ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
    const od = {};
    const oi = {};
    
    freqs.forEach(f => {
        const odInput = document.getElementById(`od_${f}`);
        const oiInput = document.getElementById(`oi_${f}`);
        od[f] = odInput?.value || '';
        oi[f] = oiInput?.value || '';
    });
    
    return { od, oi, freqs };
}

function obtenerDiagnosticoOd() {
    return document.getElementById('diagnostico_od')?.value || '';
}

function obtenerDiagnosticoOi() {
    return document.getElementById('diagnostico_oi')?.value || '';
}

function obtenerObservacionesAudiometria() {
    return document.getElementById('observaciones_audiometria')?.value || '';
}

function obtenerDatosPacienteAudiometria() {
    try {
        const pacienteData = localStorage.getItem('pacienteActual');
        if (!pacienteData) return null;
        let paciente = JSON.parse(pacienteData);
        
        if (!paciente.id && paciente.id_paciente) paciente.id = paciente.id_paciente;
        if (!paciente.id && paciente.paciente_id) paciente.id = paciente.paciente_id;
        
        const citaData = localStorage.getItem('citaActual');
        const cita = citaData ? JSON.parse(citaData) : null;
        
        let entidad_id = null;
        let entidad_nombre = 'PARTICULAR';
        
        if (cita) {
            entidad_id = cita.entidad_id || null;
            entidad_nombre = cita.entidad_nombre || 'PARTICULAR';
        }
        
        return { paciente, cita, entidad_id, entidad_nombre };
    } catch (e) {
        console.error('Error:', e);
        return null;
    }
}

async function guardarAudiometriaEnBaseDeDatos(pacienteId, citaId, entidadId, diagnostico_od, diagnostico_oi, observaciones, valoresOD, valoresOI, imagenBase64) {
    console.log('guardarAudiometriaEnBaseDeDatos - Inicio');
    console.log('pacienteId:', pacienteId);
    console.log('citaId:', citaId);
    
    const data = {
        paciente_id: pacienteId,
        cita_id: citaId,
        entidad_id: entidadId,
        diagnostico_od: diagnostico_od,
        diagnostico_oi: diagnostico_oi,
        observaciones: observaciones,
        valores_od: valoresOD,
        valores_oi: valoresOI,
        grafica_base64: imagenBase64
    };
    
    console.log('Datos a enviar a window.api:', JSON.stringify(data, null, 2));
    
    if (!window.api || !window.api.guardarAudiometria) {
        throw new Error('window.api.guardarAudiometria no está disponible');
    }
    
    const result = await window.api.guardarAudiometria(data);
    console.log('Resultado de window.api:', result);
    
    if (!result.ok) {
        throw new Error(result.error || 'Error al guardar');
    }
    return result.id;
}

async function generarPDFAudiometria(paciente, cita, diagnostico_od, diagnostico_oi, observaciones, valores, imagenDataURL, entidad) {
    try {
        const entidadNombre = entidad || cita?.entidad_nombre || 'PARTICULAR';
        
        const datosParaPDF = {
            paciente: {
                nombre: paciente.nombre || '',
                documento: paciente.documento || '',
                telefono: paciente.telefono || '',
                fecha_nacimiento: paciente.fecha_nacimiento || ''
            },
            cita: {
                fecha_cita: cita?.fecha_cita || new Date().toISOString().split('T')[0],
                motivo: cita?.motivo || ''
            },
            valores_od: valores.od || {},
            valores_oi: valores.oi || {},
            freqs: valores.freqs || ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'],
            diagnostico_od: diagnostico_od || '',
            diagnostico_oi: diagnostico_oi || '',
            observaciones: observaciones || '',
            grafica_base64: imagenDataURL || ''
        };
        
  const result = await window.api.generarPDFAudiometria(datosParaPDF, entidadNombre);
        
        if (result && result.ok) {
            mostrarNotificacionAudiometria(`✅ PDF generado: ${result.path}`, false);
            return result.path;
        } else {
            throw new Error(result?.error || 'Error al generar PDF');
        }
    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarNotificacionAudiometria(`Error PDF: ${error.message}`, true);
        throw error;
    }
}

function mostrarLoadingAudiometria(mostrar) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = mostrar ? 'flex' : 'none';
    }
}

function mostrarNotificacionAudiometria(mensaje, esError = false) {
    const notif = document.createElement('div');
    notif.textContent = mensaje;
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.right = '20px';
    notif.style.padding = '12px 20px';
    notif.style.borderRadius = '8px';
    notif.style.backgroundColor = esError ? '#e74c3c' : '#27ae60';
    notif.style.color = 'white';
    notif.style.fontWeight = 'bold';
    notif.style.zIndex = '10001';
    notif.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.style.opacity = '0';
        setTimeout(() => {
            if (notif.parentNode) notif.parentNode.removeChild(notif);
        }, 300);
    }, 3000);
}

async function onGrabarAudiometriaClick() {
    console.log('=== onGrabarAudiometriaClick INICIADO ===');
    
    try {
        mostrarLoadingAudiometria(true);
        
        const valores = obtenerValoresAudiometria();
        const tieneValores = Object.values(valores.od).some(v => v !== '') || Object.values(valores.oi).some(v => v !== '');
        if (!tieneValores) {
            throw new Error('No hay datos para guardar. Complete al menos un valor en Audiometría Tonal');
        }
        
        const datos = obtenerDatosPacienteAudiometria();
        if (!datos || !datos.paciente) {
            throw new Error('No hay paciente seleccionado');
        }
        
        const paciente = datos.paciente;
        const cita = datos.cita;
        
        if (!paciente.id) {
            throw new Error('ID de paciente no válido');
        }
        
        if (!cita || !cita.id) {
            throw new Error('No hay cita seleccionada');
        }
        
        const diagnostico_od = obtenerDiagnosticoOd();
        const diagnostico_oi = obtenerDiagnosticoOi();
        const observaciones = obtenerObservacionesAudiometria();
        
        let imagenBase64 = '';
        try {
            const canvasImg = await capturarGraficaAudiometria();
            imagenBase64 = canvasImg.toDataURL('image/png');
            console.log('Gráfica capturada, tamaño:', imagenBase64.length);
        } catch (err) {
            console.warn('Error capturando gráfica:', err);
        }
        
        const id = await guardarAudiometriaEnBaseDeDatos(
            paciente.id,
            cita.id,
            datos.entidad_id,
            diagnostico_od,
            diagnostico_oi,
            observaciones,
            valores.od,
            valores.oi,
            imagenBase64
        );
        
        console.log('✅ Guardado exitoso, ID:', id);
        mostrarNotificacionAudiometria('✅ Audiometría guardada exitosamente');
        
        try {
            await generarPDFAudiometria(
                paciente,
                cita,
                diagnostico_od,
                diagnostico_oi,
                observaciones,
                valores,
                imagenBase64,
                datos.entidad_nombre
            );
        } catch (err) {
            console.warn('Error generando PDF:', err);
            mostrarNotificacionAudiometria('⚠️ Datos guardados pero error al generar PDF', true);
        }
        
    } catch (error) {
        console.error('❌ ERROR en onGrabarAudiometriaClick:', error);
        mostrarNotificacionAudiometria(`❌ Error: ${error.message}`, true);
    } finally {
        mostrarLoadingAudiometria(false);
        console.log('=== onGrabarAudiometriaClick FINALIZADO ===');
    }
}

// Exportar funciones
window.audiometriaFunctions = {
    onGrabarAudiometriaClick,
    obtenerValoresAudiometria,
    obtenerDiagnosticoOd,
    obtenerDiagnosticoOi,
    obtenerObservacionesAudiometria,
    generarPDFAudiometria,
    guardarAudiometriaEnBaseDeDatos
};

window.onGrabarAudiometriaClick = onGrabarAudiometriaClick;