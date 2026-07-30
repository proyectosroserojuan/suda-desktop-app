// ============================================
// SOLUCIÓN: Forzar foco en inputs al volver a la app
// ============================================

// 1. Al cargar la página, enfocar el primer input
document.addEventListener('DOMContentLoaded', () => {
  const firstInput = document.querySelector('input, select, textarea');
  if (firstInput) {
    setTimeout(() => firstInput.focus(), 200);
  }
});

// 2. Cuando vuelves a la ventana, recuperar el foco
window.addEventListener('focus', () => {
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
    active.focus();
  }
});

// 3. Cuando vuelves a la pestaña, recuperar el foco
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'SELECT' || active.tagName === 'TEXTAREA')) {
      active.focus();
    }
  }
});

// 4. Al hacer clic en un input, forzar el foco
document.addEventListener('click', (e) => {
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
    setTimeout(() => {
      e.target.focus();
    }, 50);
  }
});