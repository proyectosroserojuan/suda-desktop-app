// ============================================
// duplicadoService.js - Control de duplicados
// ============================================

(function() {
    'use strict';

    // Estado interno
    let citasEnProceso = new Map();
    let modalAbierto = false;

    /**
     * Muestra el modal de advertencia cuando la cita ya tiene resultados
     * @param {number|string} citaId 
     * @returns {Promise<void>}
     */
    function mostrarModalAdvertencia(citaId) {
        return new Promise((resolve) => {
            // Si ya hay un modal abierto, no crear otro
            if (modalAbierto) {
                resolve();
                return;
            }

            modalAbierto = true;

            // Eliminar modal existente si lo hay
            let modalExistente = document.getElementById('modalDuplicadoAdvertencia');
            if (modalExistente) {
                modalExistente.remove();
            }

            // CREAR MODAL
            const modal = document.createElement('div');
            modal.id = 'modalDuplicadoAdvertencia';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.6);
                z-index: 999999;
                display: flex !important;
                justify-content: center;
                align-items: center;
                backdrop-filter: blur(4px);
            `;

 modal.innerHTML = `
    <div style="
        background: #ffffff;
        border-radius: 20px;
        padding: 45px 40px 35px;
        max-width: 460px;
        width: 92%;
        text-align: center;
        box-shadow: 0 30px 80px rgba(0,0,0,0.4);
        animation: modalFadeIn 0.3s ease;
    ">
        <div style="margin-bottom: 20px;">
            <div style="
                width: 70px;
                height: 70px;
                background: #fee2e2;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 15px;
            ">
                <span style="font-size: 36px;"></span>
            </div>
            <h3 style="color: #1a2332; margin: 0; font-size: 20px; font-weight: 700;">
                Cita ya atendida
            </h3>
        </div>
        
        <p style="color: #4a5a6a; font-size: 15px; margin-bottom: 20px; line-height: 1.7;">
            Esta cita <strong style="color: #dc2626;">ya tiene resultados registrados</strong>.
            <br><br>
            <span style="color: #6b7280; font-size: 14px;">
                Si necesitas modificar los resultados existentes, 
                haz clic en <strong>"Editar Resultados"</strong>
            </span>
        </p>
        
        <div style="display: flex; gap: 10px;">
            <button id="btnEditarCita" style="
                flex: 1;
                padding: 16px;
                background: #2c6e9c;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.25s ease;
            ">
                Editar Resultados
            </button>
            
            <button id="btnCerrarModalDuplicado" style="
                flex: 1;
                padding: 16px;
                background: #6b7280;
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.25s ease;
            ">
                Cerrar
            </button>
        </div>
    </div>
`;
            // Agregar estilos de animación
            const styleAnim = document.createElement('style');
            styleAnim.textContent = `
                @keyframes modalFadeIn {
                    from {
                        opacity: 0;
                        transform: scale(0.9) translateY(-20px);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                }
            `;
            modal.appendChild(styleAnim);

            document.body.appendChild(modal);

            // Manejador del botón
            const cerrarBtn = document.getElementById('btnCerrarModalDuplicado');
            const editarBtn = document.getElementById('btnEditarCita');

            function cerrarModal() {
                modalAbierto = false;
                if (modal && modal.parentNode) {
                    modal.remove();
                }
                resolve();
            }

            cerrarBtn.addEventListener('click', cerrarModal);
            editarBtn.addEventListener('click', function() {
    window.location.href = 'modificaryborrarresultados.html';
    cerrarModal();
});

            // Cerrar con Escape
            const handlerEscape = (e) => {
                if (e.key === 'Escape') {
                    cerrarModal();
                    document.removeEventListener('keydown', handlerEscape);
                }
            };
            document.addEventListener('keydown', handlerEscape);

            // Cerrar al hacer clic fuera
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    cerrarModal();
                }
            });
        });
    }

    /**
     * Verifica si una cita ya tiene examen registrado
     */
    async function verificarDuplicado(citaId, notificarCallback) {
        if (!citaId) {
            console.warn('⚠️ duplicadoService: citaId no proporcionado');
            return { duplicado: false };
        }

        try {
            const resultado = await window.api.verificarExamenPorCita(citaId);
            
            if (!resultado || !resultado.ok) {
                console.warn('⚠️ Error verificando examen:', resultado?.error);
                return { duplicado: false };
            }

            // Si existe examen, mostrar modal y BLOQUEAR
            if (resultado.existe) {
                console.log(`🔍 La cita ${citaId} YA TIENE RESULTADOS - Mostrando modal`);
                
                // 🔥 MOSTRAR EL MODAL
                await mostrarModalAdvertencia(citaId);
                
                // Mostrar notificación en rojo como respaldo
                if (notificarCallback) {
                    notificarCallback('❌ Esta cita ya tiene resultados registrados', true);
                }
                
                return { duplicado: true, bloqueado: true };
            }

            return { duplicado: false };

        } catch (error) {
            console.error('❌ Error en verificarDuplicado:', error);
            return { duplicado: false };
        }
    }

    /**
     * Marca una cita como "en proceso"
     */
    function comenzarProceso(citaId) {
        if (!citaId) return false;

        if (citasEnProceso.has(citaId)) {
            const inicio = citasEnProceso.get(citaId);
            const tiempoTranscurrido = Date.now() - inicio;

            if (tiempoTranscurrido > 30000) {
                citasEnProceso.delete(citaId);
            } else {
                console.warn(`⏳ La cita ${citaId} ya está siendo procesada`);
                return false;
            }
        }

        citasEnProceso.set(citaId, Date.now());
        return true;
    }

    /**
     * Finaliza el proceso de una cita
     */
    function finalizarProceso(citaId) {
        if (citaId) {
            citasEnProceso.delete(citaId);
        }
    }

async function ejecutarConControl(funcionGuardar, citaId, opciones = {}, notificarCallback) {
    if (!citaId) {
        return { ok: false, error: 'ID de cita no proporcionado' };
    }

    if (typeof funcionGuardar !== 'function') {
        return { ok: false, error: 'Función de guardado no válida' };
    }

    // 1. Verificar si ya está en proceso
    if (!comenzarProceso(citaId)) {
        if (notificarCallback) {
            notificarCallback('⏳ Ya hay un proceso en curso para esta cita', true);
        }
        return { ok: false, error: 'Proceso en curso', enProceso: true };
    }

    try {
        // 2. Verificar duplicado - SOLO si NO estamos en modo edición.
        //    En modo edición es esperado que ya exista un examen: es
        //    justamente el que se está actualizando, no un duplicado.
        if (!opciones.modoEdicion) {
            const verif = await verificarDuplicado(citaId, notificarCallback);

            if (verif.duplicado) {
                finalizarProceso(citaId);
                return {
                    ok: false,
                    cancelado: true,
                    bloqueado: true,
                    error: 'La cita ya tiene resultados registrados'
                };
            }
        }

        // 3. Ejecutar la función de guardado
        const resultado = await funcionGuardar();

        // 4. Si el guardado fue exitoso, actualizar el estado de la cita
        if (resultado && resultado.ok) {
            console.log(`✅ Resultados guardados correctamente para cita ${citaId}`);

            try {
                await window.api.actualizarEstadoCita(citaId, 'atendida');
                console.log(`📌 Cita ${citaId} actualizada a "atendida"`);
            } catch (err) {
                console.warn('⚠️ No se pudo actualizar el estado de la cita:', err);
            }
        }

        return resultado;

    } catch (error) {
        console.error('❌ Error en ejecutarConControl:', error);
        return { ok: false, error: error.message };
    } finally {
        finalizarProceso(citaId);
    }
}

    /**
     * Limpia el estado interno
     */
    function limpiarEstado() {
        citasEnProceso.clear();
        modalAbierto = false;
        
        const modal = document.getElementById('modalDuplicadoAdvertencia');
        if (modal) modal.remove();
    }

    // Exponer servicio globalmente
    window.DuplicadoService = {
        verificarDuplicado,
        comenzarProceso,
        finalizarProceso,
        ejecutarConControl,
        limpiarEstado,
        _getEstado: () => ({
            citasEnProceso: Array.from(citasEnProceso.keys()),
            modalAbierto
        })
    };

    console.log('✅ DuplicadoService cargado correctamente');

})();