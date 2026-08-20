// ============================================
// LOGOAUDIOMETRIA - FUNCIONES DE GUARDADO Y PDF
// ============================================

async function capturarGraficaComoImagen() {
    return new Promise((resolve, reject) => {
        const canvas = document.getElementById('speechChart');
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

function obtenerDiscriminacionOD() {
    const porcentaje = document.getElementById('discriminacion_od_porcentaje')?.value || '';
    const db = document.getElementById('discriminacion_od_db')?.value || '';
    if (!porcentaje && !db) return '';
    return `Discriminación del ${porcentaje}% en dB ${db} O.D`;
}

function obtenerDiscriminacionOI() {
    const porcentaje = document.getElementById('discriminacion_oi_porcentaje')?.value || '';
    const db = document.getElementById('discriminacion_oi_db')?.value || '';
    if (!porcentaje && !db) return '';
    return `Discriminación del ${porcentaje}% en dB ${db} O.I`;
}

function obtenerValoresFormulario() {
    return {
        od: {
            urv: document.getElementById('od_urv')?.value || '',
            upalabra: document.getElementById('od_upalabra')?.value || '',
            udisc: document.getElementById('od_udisc')?.value || '',
            pmax: document.getElementById('od_pmax')?.value || ''
        },
        oi: {
            urv: document.getElementById('oi_urv')?.value || '',
            upalabra: document.getElementById('oi_upalabra')?.value || '',
            udisc: document.getElementById('oi_udisc')?.value || '',
            pmax: document.getElementById('oi_pmax')?.value || ''
        }
    };
}

function obtenerDiagnostico() {
    return document.getElementById('diagnostico')?.value || '';
}

function obtenerDiagnosticoOd() {
    return document.getElementById('diagnostico_od')?.value || '';
}

function obtenerDiagnosticoOi() {
    return document.getElementById('diagnostico_oi')?.value || '';
}

function obtenerDatosPaciente() {
    try {
        const pacienteData = localStorage.getItem('pacienteActual');
        if (!pacienteData) return null;
        let paciente = JSON.parse(pacienteData);
        
        if (!paciente.id && paciente.id_paciente) paciente.id = paciente.id_paciente;
        if (!paciente.id && paciente.paciente_id) paciente.id = paciente.paciente_id;
        
        return paciente;
    } catch (e) {
        console.error('Error:', e);
        return null;
    }
}

function obtenerDatosCita() {
    try {
        const citaData = localStorage.getItem('citaActual');
        if (!citaData) return null;
        let cita = JSON.parse(citaData);
        
        if (!cita.id && cita.id_cita) cita.id = cita.id_cita;
        if (!cita.id && cita.cita_id) cita.id = cita.cita_id;
        
        return cita;
    } catch (e) {
        console.error('Error:', e);
        return null;
    }
}

// En logoaudiometria.html - REEMPLAZA guardarEnBaseDeDatos

async function guardarEnBaseDeDatos(pacienteId, citaId, diagnostico, diagnostico_od, diagnostico_oi, otoscopia, valoresOD, valoresOI, imagenBase64, tipoAtencionNombre, modoEdicion = false) {
    console.log('guardarEnBaseDeDatos - Inicio | Edición:', modoEdicion);
    console.log('pacienteId:', pacienteId);
    console.log('citaId:', citaId);
    
    const data = {
        tipo_examen: tipoAtencionNombre || 'no especificado',
        paciente_id: pacienteId,
        cita_id: citaId,
        entidad_id: null,
        diagnostico: diagnostico,
        diagnostico_od: diagnostico_od,
        diagnostico_oi: diagnostico_oi,
        otoscopia: otoscopia,
        valores_od: valoresOD,
        valores_oi: valoresOI,
        grafica_logo_base64: imagenBase64,
        observaciones: null,
        grafica_tonal_base64: null,
        pta_via_aerea_od: null,
        pta_via_osea_od: null,
        pta_via_aerea_oi: null,
        pta_via_osea_oi: null,
        urv_od: valoresOD?.urv || null,
        urv_oi: valoresOI?.urv || null,
        upalabra_od: valoresOD?.upalabra || null,
        upalabra_oi: valoresOI?.upalabra || null,
        udisc_od: valoresOD?.udisc || null,
        udisc_oi: valoresOI?.udisc || null,
        pmax_od: valoresOD?.pmax || null,
        pmax_oi: valoresOI?.pmax || null
    };
    
    console.log('Datos a enviar a window.api:', JSON.stringify(data, null, 2));
    
    let result;

    // 🔥 NUEVO: elegir entre actualizar (edición) o crear (nuevo)
    if (modoEdicion && window.api?.actualizarExamen) {
        result = await window.api.actualizarExamen(citaId, data);
    } else {
        if (!window.api || !window.api.guardarExamen) {
            throw new Error('window.api.guardarExamen no está disponible');
        }
        result = await window.api.guardarExamen(data);
    }

    console.log('Resultado de window.api:', result);
    
    if (!result.ok) {
        throw new Error(result.error || 'Error al guardar');
    }
    return result.id;
}

async function generarPDF(paciente, cita, diagnostico, diagnostico_od, diagnostico_oi,otoscopia, valores, imagenDataURL, entidad, nrFlags){
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
            valores_od: valores.od || { urv: '', upalabra: '', udisc: '', pmax: '' },
            valores_oi: valores.oi || { urv: '', upalabra: '', udisc: '', pmax: '' },
            diagnostico: diagnostico || '',
            diagnostico_od: diagnostico_od || '',
            diagnostico_oi: diagnostico_oi || '',
            otoscopia: otoscopia,
            grafica_logo_base64: imagenDataURL || '',
            nr_flags: nrFlags || { od: {}, oi: {} }  // ✅ SOLO PARA EL PDF
        };
        
        const result = await window.api.generarPDF(
            datosParaPDF,
            entidadNombre,
            'logoaudiometria'
        );
        
        if (result && result.ok) {
            mostrarNotificacion(`✅ PDF generado: ${result.path}`, false);
            return result.path;
        } else {
            throw new Error(result?.error || 'Error al generar PDF');
        }
    } catch (error) {
        console.error('Error generando PDF:', error);
        mostrarNotificacion(`Error PDF: ${error.message}`, true);
        throw error;
    }
}

function mostrarLoading(mostrar) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.style.display = mostrar ? 'flex' : 'none';
    }
}

function mostrarNotificacion(mensaje, esError = false) {
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

// ✅ VERSIÓN CORRECTA - Usa window.api, NO fetch
async function onGrabarClick() {
    console.log('=== onGrabarClick INICIADO ===');
    
    try {
        mostrarLoading(true);
        
        // Obtener valores de diagnóstico
        const diagnostico = obtenerDiagnostico();
const diagnostico_od = obtenerDiscriminacionOD();
const diagnostico_oi = obtenerDiscriminacionOI();
        const otoscopia = document.getElementById('otoscopia_logoaudiometria')?.value || '';  // ✅ AGREGAR
        
        console.log('Diagnósticos:', { diagnostico, diagnostico_od, diagnostico_oi });
        
        // Obtener valores del formulario
        const valores = obtenerValoresFormulario();
        console.log('Valores:', valores);

               const nrFlags = window.noResponseFlags || { od: {}, oi: {} };
        console.log('NR Flags:', nrFlags);
        
        // Obtener datos del paciente y cita
        const paciente = obtenerDatosPaciente();
        const cita = obtenerDatosCita();
        
        console.log('Paciente:', paciente);
        console.log('Cita:', cita);
        
        if (!paciente || !paciente.id) {
            throw new Error('No hay paciente seleccionado');
        }
        
        if (!cita || !cita.id) {
            throw new Error('No hay cita seleccionada');
        }

        // 🔥 NUEVO: detectar si estamos editando
        const modoEdicion = localStorage.getItem('modoEdicion') === 'true';

        const resultado = await window.DuplicadoService.ejecutarConControl(
            async () => {
        
        // Capturar gráfica
        let imagenBase64 = '';
        try {
            const canvasImg = await capturarGraficaComoImagen();
            imagenBase64 = canvasImg.toDataURL('image/png');
            console.log('Gráfica capturada, tamaño:', imagenBase64.length);
        } catch (err) {
            console.warn('Error capturando gráfica:', err);
        }
        
        // Guardar en base de datos
        // Guardar en base de datos
        const id = await guardarEnBaseDeDatos(
            paciente.id,
            cita.id,
            diagnostico,
            diagnostico_od,
            diagnostico_oi,
            otoscopia,
            valores.od,
            valores.oi,
            imagenBase64,
            cita?.tipo_atencion_nombre,
            modoEdicion // 🔥 NUEVO
        );

        console.log('✅ Guardado exitoso, ID:', id);
        mostrarNotificacion(modoEdicion ? '✅ Logoaudiometría actualizada exitosamente' : '✅ Logoaudiometría guardada exitosamente');

        // 🔥 NUEVO: limpiar modo edición tras guardar
        localStorage.removeItem('modoEdicion');
        localStorage.removeItem('examenActual');
        localStorage.removeItem('citaIdEdicion');
        
        // Generar PDF
        try {
            const pdfPath = await generarPDF(
        paciente,           // paciente
        cita,              // cita
        diagnostico,       // diagnostico general
        diagnostico_od,    // diagnóstico OD
        diagnostico_oi,    // diagnóstico OI
        otoscopia,  
        valores,           // valores {od, oi}
        imagenBase64,      // imagen de la gráfica
        cita?.entidad_nombre,
        nrFlags  // entidad
    );

            if (typeof ModalService !== 'undefined' && pdfPath) {
                ModalService.mostrar({
                    rutaPDF: pdfPath,
                    datosExamen: {
                        paciente: paciente.nombre || '',
                        documento: paciente.documento || '',
                        fecha: cita?.fecha_cita || new Date().toISOString().split('T')[0],
                        entidad: cita?.entidad_nombre || 'Particular',
                        tipo_examen: 'Logoaudiometría',
                        observaciones: diagnostico || '',
                        cita_id: cita.id
                    }
                });
            }
          } catch (err) {
            console.warn('Error generando PDF:', err);
            mostrarNotificacion('⚠️ Datos guardados pero error al generar PDF', true);
        }

        return { ok: true, id };

            },
            cita.id,
            { modoEdicion },
            mostrarNotificacion
        );

        if (!resultado.ok) {
            if (resultado.cancelado || resultado.enProceso) {
                return;
            }
            throw new Error(resultado.error || 'Error al guardar');
        }

    } catch (error) {
        console.error('❌ ERROR en onGrabarClick:', error);




        mostrarNotificacion(`❌ Error: ${error.message}`, true);
    } finally {
        mostrarLoading(false);
        console.log('=== onGrabarClick FINALIZADO ===');
    }
}

// Exportar funciones
window.logoaudiometriaFunctions = {
    onGrabarClick,
    obtenerValoresFormulario,
    obtenerDiagnostico,
    obtenerDiagnosticoOd,
    obtenerDiagnosticoOi,
    obtenerDiscriminacionOD,   // ← NUEVA
    obtenerDiscriminacionOI,   // ← NUEVA
    generarPDF,
    guardarEnBaseDeDatos
};

// Para compatibilidad
window.onGrabarClick = onGrabarClick;