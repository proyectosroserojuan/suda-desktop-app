/* ============================================================
   ENMASCARAMIENTO LOGOAUDIOMETRÍA - SERVICIO INDEPENDIENTE
   VERSIÓN FUNCIONAL - Panel visible arriba del Oído Derecho
   ============================================================ */

(function () {

    const LOG = '[EnmascLogo]';

    // ============================================================
    // ALMACÉN DE SÍMBOLOS PERSONALIZADOS POR CAMPO
    // ============================================================
    let personalSymbols = {
        od: {},
        oi: {}
    };

    // Símbolos disponibles para cada oído
    const SIMBOLOS_OD = ['O', '↘O', '△', '[', '┐'];
    const SIMBOLOS_OI = ['X', '↙X', '□', ']', '┌'];

    // Mapeo de campos a etiquetas amigables
    const CAMPOS_LABELS = {
        urv: 'U. Voz',
        upalabra: 'U. Palabra',
        intermedio: 'Punto Intermedio',
        udisc_pmax: 'U. Discriminación'
    };

    // ============================================================
    // OBTENER PUNTOS CON SUS CAMPOS DE ORIGEN
    // ============================================================
    function obtenerPuntosConCampos(ear) {
        if (typeof getEarValues !== 'function' || typeof getCamposValidos !== 'function') {
            return [];
        }

        try {
            const data = getEarValues(ear);
            const campos = getCamposValidos(ear);
            const puntos = [];

            // Verificar si todo es "Sin Respuesta"
            const todoSinRespuesta =
                noResponseFlags[ear].urv &&
                noResponseFlags[ear].upalabra &&
                noResponseFlags[ear].udisc &&
                noResponseFlags[ear].pmax;

            if (todoSinRespuesta) return [];

            const sinDiscriminacion = noResponseFlags[ear].udisc || noResponseFlags[ear].pmax;

            if (sinDiscriminacion) {
                if (campos.urv) {
                    puntos.push({
                        field: 'urv',
                        x: data.uVoz,
                        y: 0,
                        label: 'U. Voz',
                        valor: `${data.uVoz} dB`
                    });
                }
                if (campos.upalabra) {
                    puntos.push({
                        field: 'upalabra',
                        x: data.uPalabra,
                        y: data.porcentajePalabra || 30,
                        label: 'U. Palabra',
                        valor: `${data.uPalabra} dB`
                    });
                }
                return puntos;
            }

            // Punto 1: U. Voz
            if (campos.urv) {
                puntos.push({
                    field: 'urv',
                    x: data.uVoz,
                    y: 0,
                    label: 'U. Voz',
                    valor: `${data.uVoz} dB`
                });
            }

            // Punto 2: U. Palabra
            if (campos.upalabra) {
                puntos.push({
                    field: 'upalabra',
                    x: data.uPalabra,
                    y: data.porcentajePalabra || 30,
                    label: 'U. Palabra',
                    valor: `${data.uPalabra} dB`
                });
            }

            // Punto Intermedio (si existe)
            if (data.puntoIntermedio !== null && !isNaN(data.puntoIntermedio) && 
                data.puntoIntermedio >= 0 && data.puntoIntermedio <= 100) {
                const xIntermedio = data.uPalabra + (data.uDiscriminacion - data.uPalabra) * 0.5;
                puntos.push({
                    field: 'intermedio',
                    x: xIntermedio,
                    y: data.puntoIntermedio,
                    label: 'Punto Intermedio',
                    valor: `${data.puntoIntermedio}%`
                });
            }

            // Punto 3: U. Discriminación
            if (campos.udisc && campos.pmax) {
                puntos.push({
                    field: 'udisc_pmax',
                    x: data.uDiscriminacion,
                    y: data.porcentaje,
                    label: 'U. Discriminación',
                    valor: `${data.uDiscriminacion} dB / ${data.porcentaje}%`
                });
            }

            return puntos;
        } catch (e) {
            console.warn(LOG, 'Error obteniendo puntos:', e);
            return [];
        }
    }

    // ============================================================
    // APLICAR SÍMBOLOS PERSONALIZADOS A LA GRÁFICA
    // ============================================================
function aplicarSimbolosPersonalizados() {
    if (typeof chart === 'undefined' || !chart || !chart.data) {
        console.warn(LOG, 'Chart no está listo');
        return;
    }

    // 🔥 PASO 1: Eliminar TODOS los datasets de puntos clínicos originales
    // (los que tienen label "OD - Puntos clínicos" o "OI - Puntos clínicos")
    chart.data.datasets = chart.data.datasets.filter(ds => {
        return ds.label !== 'OD - Puntos clínicos' && 
               ds.label !== 'OI - Puntos clínicos';
    });

    // 🔥 PASO 2: Eliminar datasets antiguos de enmascaramiento
    chart.data.datasets = chart.data.datasets.filter(
        ds => !ds._enmascLogoPoint
    );

    // 🔥 PASO 3: Crear NUEVOS datasets con los símbolos personalizados
    ['od', 'oi'].forEach(ear => {
        if (typeof earTieneDatos === 'function' && !earTieneDatos(ear)) {
            return;
        }

        const todoSinRespuesta =
            noResponseFlags[ear].urv &&
            noResponseFlags[ear].upalabra &&
            noResponseFlags[ear].udisc &&
            noResponseFlags[ear].pmax;

        if (todoSinRespuesta) return;

        const puntos = obtenerPuntosConCampos(ear);
        const color = ear === 'od' ? '#e74c3c' : '#3498db';
        const defaultSymbol = typeof getSymbolText === 'function' ? getSymbolText(ear) : (ear === 'od' ? 'O' : 'X');

        puntos.forEach(p => {
            const simboloPersonalizado = personalSymbols[ear][p.field] || defaultSymbol;
            
            chart.data.datasets.push({
                label: `Enmasc ${ear} - ${p.field}`,
                data: [{ x: p.x, y: p.y }],
                backgroundColor: color,
                borderColor: color,
                pointRadius: 0,
                customSymbol: simboloPersonalizado,
                showLine: false,
                _enmascLogoPoint: true,
                _enmascLogoEar: ear,
                _enmascLogoField: p.field
            });
        });
    });

    try {
        chart.update('none');
    } catch (e) {
        console.warn(LOG, 'Error actualizando chart:', e);
    }
}
    // ============================================================
    // PANEL VISUAL - Se inserta ARRIBA del Oído Derecho
    // ============================================================
    function crearPanelEnmascaramiento() {
        // Verificar si el panel ya existe
        if (document.getElementById('panelEnmascLogo')) {
            return true;
        }

        // Buscar el contenedor de los oídos (el grid que contiene OD y OI)
        const gridOidos = document.querySelector('.ear-section.od')?.closest('div[style*="grid-template-columns"]');
        
        if (!gridOidos) {
            console.warn(LOG, 'No se encontró el grid de oídos');
            return false;
        }

        // Crear el panel
        const panel = document.createElement('div');
        panel.id = 'panelEnmascLogo';
        panel.style.cssText = `
            background: #ffffff;
            border: 2px solid #dee4f5;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            width: 100%;
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <h3 style="margin: 0; color: #000000; font-size: 1rem; font-weight: 700;">
                    Enmascaramiento
                </h3>
                <button id="resetEnmascLogo" style="
                    background: #ef4444;
                    color: white;
                    border: none;
                    padding: 4px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 600;
                ">
                    Restablecer símbolos
                </button>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <div style="font-size: 12px; font-weight: 700; color: #e74c3c; margin-bottom: 8px;">
                        🔴 Oído Derecho (OD)
                    </div>
                    <div id="listaEnmascOD" style="display: flex; flex-direction: column; gap: 4px;"></div>
                </div>
                <div>
                    <div style="font-size: 12px; font-weight: 700; color: #3498db; margin-bottom: 8px;">
                        🔵 Oído Izquierdo (OI)
                    </div>
                    <div id="listaEnmascOI" style="display: flex; flex-direction: column; gap: 4px;"></div>
                </div>
            </div>
            <div style="margin-top: 10px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                Haz clic en cualquier valor para cambiar su símbolo de enmascaramiento
            </div>
        `;

        // Insertar el panel ANTES del grid de oídos
        gridOidos.parentElement.insertBefore(panel, gridOidos);

        // Evento para resetear todos los símbolos
        document.getElementById('resetEnmascLogo')?.addEventListener('click', function() {
            personalSymbols = { od: {}, oi: {} };
            aplicarSimbolosPersonalizados();
            actualizarPanel();
            // Feedback visual
            const original = this.textContent;
            this.textContent = '✅ ¡Restablecido!';
            this.style.background = '#22c55e';
            setTimeout(() => {
                this.textContent = original;
                this.style.background = '#ef4444';
            }, 1500);
        });

        console.log(LOG, '✅ Panel creado e insertado arriba del grid de oídos');
        return true;
    }

    // ============================================================
    // ACTUALIZAR PANEL CON LOS VALORES ACTUALES
    // ============================================================
    function actualizarPanel() {
        const listaOD = document.getElementById('listaEnmascOD');
        const listaOI = document.getElementById('listaEnmascOI');
        if (!listaOD || !listaOI) return;

        listaOD.innerHTML = '';
        listaOI.innerHTML = '';

        ['od', 'oi'].forEach(ear => {
            const cont = ear === 'od' ? listaOD : listaOI;
            const puntos = obtenerPuntosConCampos(ear);
            const defaultSymbol = typeof getSymbolText === 'function' ? getSymbolText(ear) : (ear === 'od' ? 'O' : 'X');

            if (puntos.length === 0) {
                cont.innerHTML = `
                    <div style="
                        color: #94a3b8;
                        text-align: center;
                        padding: 12px;
                        font-size: 12px;
                        background: #f8fafc;
                        border-radius: 6px;
                    ">
                        Sin datos disponibles
                    </div>
                `;
                return;
            }

            puntos.forEach(p => {
                const simboloActual = personalSymbols[ear][p.field] || defaultSymbol;
                const color = ear === 'od' ? '#e74c3c' : '#3498db';
                const bgColor = ear === 'od' ? '#fef2f2' : '#eff6ff';

                const item = document.createElement('div');
                item.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 6px 12px;
                    background: ${bgColor};
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 13px;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                `;

                item.innerHTML = `
                    <span style="font-weight: 500;">${p.label}</span>
                    <span style="
                        font-family: monospace;
                        font-weight: 700;
                        font-size: 16px;
                        color: ${color};
                        background: white;
                        padding: 2px 10px;
                        border-radius: 4px;
                        border: 1px solid #e2e8f0;
                    ">
                        ${simboloActual}
                    </span>
                    <span style="font-size: 11px; color: #64748b;">
                        ${p.valor}
                    </span>
                `;

                // Hover effect
                item.addEventListener('mouseenter', () => {
                    item.style.background = ear === 'od' ? '#fee2e2' : '#dbeafe';
                    item.style.borderColor = color;
                });
                item.addEventListener('mouseleave', () => {
                    item.style.background = bgColor;
                    item.style.borderColor = 'transparent';
                });

                // Click → mostrar selector
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    mostrarSelector(item, ear, p.field);
                });

                cont.appendChild(item);
            });
        });
    }

    // ============================================================
    // SELECTOR DE SÍMBOLOS (POPUP)
    // ============================================================
    function mostrarSelector(elemento, ear, field) {
        // Remover selector existente
        const existente = document.querySelector('.selector-enmasc-logo');
        if (existente) existente.remove();

        const selector = document.createElement('div');
        selector.className = 'selector-enmasc-logo';
        selector.style.cssText = `
            position: fixed;
            background: white;
            border: 2px solid #1e3a8a;
            border-radius: 10px;
            padding: 10px 12px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.2);
            z-index: 10002;
            min-width: 120px;
        `;

        // Título del selector
        const titulo = document.createElement('div');
        titulo.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: #475569;
            margin-bottom: 6px;
            text-align: center;
        `;
        titulo.textContent = `Seleccionar símbolo para ${CAMPOS_LABELS[field] || field}`;
        selector.appendChild(titulo);

        // Botones de símbolos
        const simbolos = ear === 'od' ? SIMBOLOS_OD : SIMBOLOS_OI;
        const contenedor = document.createElement('div');
        contenedor.style.cssText = 'display: flex; gap: 4px; flex-wrap: wrap; justify-content: center;';

        simbolos.forEach(sim => {
            const btn = document.createElement('button');
            btn.textContent = sim;
            btn.style.cssText = `
                padding: 4px 10px;
                font-size: 18px;
                font-weight: bold;
                cursor: pointer;
                background: #f1f5f9;
                border: 2px solid #e2e8f0;
                border-radius: 6px;
                transition: all 0.15s ease;
                min-width: 36px;
            `;
            btn.addEventListener('mouseenter', () => {
                btn.style.background = '#e2e8f0';
                btn.style.borderColor = '#1e3a8a';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = '#f1f5f9';
                btn.style.borderColor = '#e2e8f0';
            });
            btn.onclick = (e) => {
                e.stopPropagation();
                personalSymbols[ear][field] = sim;
                aplicarSimbolosPersonalizados();
                actualizarPanel();
                selector.remove();
            };
            contenedor.appendChild(btn);
        });

        // Botón para restablecer (símbolo por defecto)
        const resetBtn = document.createElement('button');
        resetBtn.textContent = '↺';
        resetBtn.title = 'Restablecer símbolo por defecto';
        resetBtn.style.cssText = `
            padding: 4px 10px;
            font-size: 18px;
            cursor: pointer;
            background: #fef3c7;
            border: 2px solid #fde68a;
            border-radius: 6px;
            transition: all 0.15s ease;
        `;
        resetBtn.addEventListener('mouseenter', () => {
            resetBtn.style.background = '#fde68a';
        });
        resetBtn.addEventListener('mouseleave', () => {
            resetBtn.style.background = '#fef3c7';
        });
        resetBtn.onclick = (e) => {
            e.stopPropagation();
            delete personalSymbols[ear][field];
            aplicarSimbolosPersonalizados();
            actualizarPanel();
            selector.remove();
        };
        contenedor.appendChild(resetBtn);

        selector.appendChild(contenedor);

        // Posicionar el selector
        const rect = elemento.getBoundingClientRect();
        let left = rect.left;
        let top = rect.bottom + 8;

        // Asegurar que no se salga de la pantalla
        if (left + 180 > window.innerWidth) {
            left = window.innerWidth - 190;
        }
        if (top + 120 > window.innerHeight) {
            top = rect.top - 130;
        }
        if (top < 10) top = 10;
        if (left < 10) left = 10;

        selector.style.left = left + 'px';
        selector.style.top = top + 'px';

        document.body.appendChild(selector);

        // Cerrar al hacer clic fuera
        function cerrarSelector(e) {
            if (!selector.contains(e.target)) {
                selector.remove();
                document.removeEventListener('click', cerrarSelector);
            }
        }
        setTimeout(() => document.addEventListener('click', cerrarSelector), 10);
    }

    // ============================================================
    // REFRESCAR (con debounce)
    // ============================================================
    let timeoutRefrescar = null;

    function refrescar() {
        if (timeoutRefrescar) clearTimeout(timeoutRefrescar);
        timeoutRefrescar = setTimeout(() => {
            aplicarSimbolosPersonalizados();
            actualizarPanel();
        }, 200);
    }

    // ============================================================
    // INSTALAR LISTENERS
    // ============================================================
    let listenersInstalados = false;

    function instalarListeners() {
        if (listenersInstalados) return;

        // Inputs de ambos oídos
        const inputs = document.querySelectorAll(
            '#od_urv, #od_upalabra, #od_udisc, #od_pmax, #od_porcentaje_real, #od_punto_intermedio, ' +
            '#oi_urv, #oi_upalabra, #oi_udisc, #oi_pmax, #oi_porcentaje_real, #oi_punto_intermedio'
        );
        inputs.forEach(input => {
            if (input) {
                input.addEventListener('input', refrescar);
                input.addEventListener('change', refrescar);
            }
        });

        // Botones NR
        document.querySelectorAll('.nr-btn').forEach(btn => {
            btn.addEventListener('click', refrescar);
        });

        // Botón Sin Respuesta
        document.querySelectorAll('.btn-sin-respuesta').forEach(btn => {
            btn.addEventListener('click', refrescar);
        });

        // Botones Borrar y Rehacer
        document.querySelectorAll('.btn-borrar, .btn-rehacer').forEach(btn => {
            btn.addEventListener('click', function() {
                const ear = this.dataset.ear;
                if (ear) {
                    personalSymbols[ear] = {};
                }
                refrescar();
            });
        });

        // Reset general
        document.getElementById('resetBtn')?.addEventListener('click', function() {
            personalSymbols = { od: {}, oi: {} };
            refrescar();
        });

        listenersInstalados = true;
        console.log(LOG, '✅ Listeners instalados');
    }

    // ============================================================
    // INICIALIZACIÓN CON REINTENTOS
    // ============================================================
    let intentos = 0;
    const MAX_INTENTOS = 40;

    function intentarInicializar() {
        intentos++;

        const chartListo = typeof chart !== 'undefined' && chart !== null;
        const funcionesListas =
            typeof getEarValues === 'function' &&
            typeof getCamposValidos === 'function' &&
            typeof getSymbolText === 'function' &&
            typeof earTieneDatos === 'function' &&
            typeof noResponseFlags !== 'undefined';

        if (!chartListo || !funcionesListas) {
            if (intentos >= MAX_INTENTOS) {
                console.error(LOG, '❌ No se encontraron las dependencias necesarias. Asegúrate que este script se cargue DESPUÉS de logoaudiometria.html');
                return;
            }
            setTimeout(intentarInicializar, 150);
            return;
        }

        const panelOk = crearPanelEnmascaramiento();
        if (!panelOk) {
            if (intentos >= MAX_INTENTOS) {
                console.error(LOG, '❌ No se pudo crear el panel');
                return;
            }
            setTimeout(intentarInicializar, 150);
            return;
        }

        instalarListeners();
        refrescar();

        console.log(LOG, '✅ Inicialización completa');
    }

    // ============================================================
    // EXPONER FUNCIONES PARA DEBUG
    // ============================================================
    window.enmascLogo = {
        aplicar: aplicarSimbolosPersonalizados,
        actualizar: actualizarPanel,
        crear: crearPanelEnmascaramiento,
        refrescar: refrescar,
        reiniciar: intentarInicializar,
        reset: function() {
            personalSymbols = { od: {}, oi: {} };
            refrescar();
        }
    };

    // ============================================================
    // INICIAR
    // ============================================================
    console.log(LOG, 'Script cargado, esperando DOM...');

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        intentarInicializar();
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            console.log(LOG, 'DOMContentLoaded, iniciando...');
            intentarInicializar();
        });
    }

})();