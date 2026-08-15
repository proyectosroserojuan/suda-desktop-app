// ============================================
// MODAL DE RESULTADOS (reutilizable)
// Uso: ModalService.mostrar({ rutaPDF, datosExamen })
// ============================================
(function () {

    const LOGO_SRC = '../img/lomodal.png';

    function crearModal() {
        if (document.getElementById('modalResultados')) return;

        const modal = document.createElement('div');
        modal.id = 'modalResultados';
        modal.style.cssText = `
            display:none; position:fixed; top:0; left:0;
            width:100%; height:100%; background:rgba(0,0,0,0.55);
            z-index:10000; justify-content:center; align-items:center;
            backdrop-filter:blur(3px);
        `;

        modal.innerHTML = `
          <div style="background:#ffffff; border-radius:16px; padding:45px 40px 35px; max-width:420px; width:92%; text-align:center; box-shadow:0 30px 80px rgba(0,0,0,0.35);">
            <div style="margin-bottom:25px;">
              <div style="width:180px; height:100px; margin:0 auto 12px; display:flex; align-items:center; justify-content:center;">
                <img src="${LOGO_SRC}" alt="Logo" style="width:180px; height:100px; object-fit:contain; border-radius:16px; box-shadow:0 4px 20px rgba(44,110,156,0.25);" onerror="this.style.display='none'">
              </div>
              <h3 style="color:#1a2332; margin:0; font-weight:300; font-size:18px; letter-spacing:1.5px;">S.U.D.A</h3>
              <br>
              <h3 style="color:#1a2332; margin:0; font-weight:300; font-size:18px; letter-spacing:1.5px; font-family:'Georgia','Times New Roman',serif; font-style:italic;">
                Luis Ignacio Sanin Jurado
              </h3>
              <div style="width:50px; height:2px; background:#2c6e9c; margin:10px auto 0;"></div>
            </div>

            <p style="color:#4a5a6a; font-size:14px; margin-bottom:25px; letter-spacing:0.3px;">Examen guardado correctamente</p>

            <button id="btnVerResultado" style="width:100%; padding:15px; background:#2c6e9c; color:white; border:none; border-radius:8px; font-size:15px; font-weight:600; margin-bottom:12px; cursor:pointer;">Ver Resultado</button>
            <button id="btnImprimir" style="width:100%; padding:15px; background:#4a6a7a; color:white; border:none; border-radius:8px; font-size:15px; font-weight:600; margin-bottom:12px; cursor:pointer;">Imprimir Resultado</button>
            <button id="btnVerDetalles" style="width:100%; padding:15px; background:#5a7a6a; color:white; border:none; border-radius:8px; font-size:15px; font-weight:600; margin-bottom:12px; cursor:pointer;">Ver Detalles</button>
            <button id="btnCerrarModal" style="width:100%; padding:15px; background:#e8edf3; color:#2a3a4a; border:none; border-radius:8px; font-size:15px; font-weight:500; cursor:pointer;">Cerrar</button>
          </div>
        `;

        document.body.appendChild(modal);
        conectarEventos(modal);
    }

    function conectarEventos(modal) {
        modal.querySelector('#btnVerResultado').addEventListener('click', async function () {
            const ruta = window.rutaPDFActual;
            if (!ruta) return notificar('⚠️ No hay PDF disponible', true);
            const result = await window.api.abrirPDFNativo(ruta);
            if (!result.ok) notificar('❌ Error al abrir el PDF: ' + result.error, true);
        });

        modal.querySelector('#btnImprimir').addEventListener('click', async function () {
            const ruta = window.rutaPDFActual;
            if (!ruta) return notificar('⚠️ No hay PDF disponible', true);
            const result = await window.api.imprimirPDFNativo(ruta);
            if (!result.ok) notificar('❌ Error al imprimir: ' + result.error, true);
        });

        modal.querySelector('#btnVerDetalles').addEventListener('click', function () {
            const datos = window.datosExamenActual;
            if (!datos) return notificar('⚠️ No hay datos de detalles disponibles', true);
            window.api.abrirVentanaDetalles(datos);
        });

        modal.querySelector('#btnCerrarModal').addEventListener('click', () => cerrar(modal));

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.style.display === 'flex') cerrar(modal);
        });

        modal.addEventListener('click', function (e) {
            if (e.target === modal) cerrar(modal);
        });
    }

    function cerrar(modal) {
        modal.style.display = 'none';
    }

    function notificar(msg, esError) {
        if (typeof window.mostrarNotificacion === 'function') {
            window.mostrarNotificacion(msg, esError);
        } else if (typeof window.mostrarNotificacionAudiometria === 'function') {
            window.mostrarNotificacionAudiometria(msg, esError);
        } else {
            console.log(msg);
        }
    }

    function mostrar({ rutaPDF, datosExamen } = {}) {
        crearModal();
        window.rutaPDFActual = rutaPDF || null;
        window.datosExamenActual = datosExamen || null;
        const modal = document.getElementById('modalResultados');
        if (modal) modal.style.display = 'flex';
    }

    window.ModalService = { mostrar };

    // Crea el modal (oculto) apenas cargue el DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', crearModal);
    } else {
        crearModal();
    }
})();