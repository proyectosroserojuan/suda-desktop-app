// ============================================
// SISTEMA DE MENSAJES PERSONALIZADO
// ============================================

// ============================================
// SISTEMA DE MENSAJES PERSONALIZADO
// ============================================

//function showMessage(message, type = 'error', onAccept = null) {
function showMessage(message, type = 'error', onAccept = null, fraseAdicional = null) {
    // Eliminar mensajes anteriores
    const oldOverlay = document.querySelector('.custom-overlay');
    if (oldOverlay) oldOverlay.remove();
    const oldMsg = document.querySelector('.custom-message');
    if (oldMsg) oldMsg.remove();
    
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'custom-overlay';
    document.body.appendChild(overlay);
    
    // Definir iconos según tipo
    const icons = {
        error: '',
        success: '',
        info: 'ℹ'
    };
    
    const titles = {
        error: 'Error',
        success: 'Éxito',
        info: 'Información'
    };
    
    const icon = icons[type] || icons.info;
    const title = titles[type] || titles.info;




// Construir el contenido del mensaje
let contenidoMensaje = message;

// Si es un mensaje de éxito y hay frase adicional, agregarla
if (type === 'success' && fraseAdicional) {
    contenidoMensaje = `
        <div style="margin-bottom: 12px; font-size: 16px; font-weight: 500;">
            ${message}
        </div>
        <div style="padding: 12px 16px; background: #f8f9fa; border-left: 4px solid #2a5298; border-radius: 4px; font-size: 13px; color: #2c3e50; line-height: 1.5; text-align: left; margin: 8px 0 16px 0;">
            <span style="font-weight: 600; color: #1e3c72;">📰 FRASE DEL DÍA</span>
            <br>
            ${fraseAdicional}
        </div>
    `;
} else {
    contenidoMensaje = `<p>${message}</p>`;
}




    
    // Crear mensaje con estructura profesional
    const div = document.createElement('div');
    div.className = `custom-message ${type}`;
    div.innerHTML = `
        <div class="msg-header">
            <span class="icon">${icon}</span>
            <h3>${title}</h3>
        </div>


    <!--    <div class="msg-body">
            <p>${message}</p>
            <button id="btn-aceptar">Aceptar</button>
        </div> -->

        <div class="msg-body">
    ${contenidoMensaje}
    <button id="btn-aceptar">Aceptar</button>
</div>
    `;
    document.body.appendChild(div);
    
    // Event listener para cerrar
    const btn = document.getElementById('btn-aceptar');
    btn.addEventListener('click', function() {
        overlay.remove();
        div.remove();
        // ✅ NUEVO: Ejecutar callback si existe
        if (onAccept && typeof onAccept === 'function') {
            onAccept();
        }
    });
    
    // Cerrar con Escape
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            div.remove();
            document.removeEventListener('keydown', escHandler);
        }
    });
    
    // Enfocar el botón
    setTimeout(() => btn.focus(), 150);
}
// ============================================
// LOGIN CORREGIDO
// ============================================

async function login() {
    // Evitar múltiples clics
    if (window._isLoggingIn) return;
    window._isLoggingIn = true;
    
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    // Validar campos vacíos
    if (!username || !password) {
        showMessage('Por favor ingrese usuario y contraseña', 'error');
        window._isLoggingIn = false;
        setTimeout(() => usernameInput.focus(), 200);
        return;
    }

    try {
        const res = await window.api.login({ username, password });

        if (res.ok) {
            // ✅ Login exitoso - Mostrar bienvenida
            const nombreUsuario = res.user.nombre_completo || res.user.username || 'Usuario';


//quitar si falla
// OBTENER FRASE DEL DÍA (SIN BLOQUEAR)
let fraseDelDia = null;
try {
    if (window.noticiasService) {
        const dato = window.noticiasService.obtenerParaModal();
        fraseDelDia = dato.texto;
    }
} catch (error) {
    console.warn('No se pudo obtener frase:', error);
}


/*
            showMessage(
                'Bienvenido ' + nombreUsuario,
                'success',
                function() {
                    window.location.href = 'dashboard.html';
                }
            );

*/

showMessage(
    'Bienvenido ' + nombreUsuario,
    'success',
    function() {
        window.location.href = 'dashboard.html';
    },
    fraseDelDia  // ← NUEVO PARÁMETRO AQUÍ
);



        } else {
            // ❌ Login fallido
            showMessage(res.error || 'Credenciales incorrectas', 'error');
            usernameInput.value = '';
            passwordInput.value = '';
            window._isLoggingIn = false;
            setTimeout(() => usernameInput.focus(), 200);
        }
    } catch (error) {
        console.error('Error en login:', error);
        showMessage('Error de conexión: ' + error.message, 'error');
        usernameInput.value = '';
        passwordInput.value = '';
        window._isLoggingIn = false;
        setTimeout(() => usernameInput.focus(), 200);
    }
}

// ============================================
// FUNCIÓN DE EMERGENCIA
// ============================================

window.unlockInputs = function() {
    document.querySelectorAll('input').forEach(el => {
        el.disabled = false;
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
    });
    const btn = document.querySelector('.login-card button');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    }
    window._isLoggingIn = false;
    console.log('✅ Inputs desbloqueados');
};

// ============================================
// EVENTOS DE TECLADO (SOLO UNA VEZ)
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    
    // Enter en usuario
    usernameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            login();
        }
    });

    // Enter en contraseña
    passwordInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            login();
        }
    });
});