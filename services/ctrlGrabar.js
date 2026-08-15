// ============================================
// ATAJO Ctrl+G PARA GRABAR (reutilizable)
// Uso: CtrlGService.init(funcionQueGraba)
// ============================================
(function () {

    let inicializado = false;

    function init(callback) {
        if (typeof callback !== 'function') {
            console.warn('CtrlGService.init requiere una función callback');
            return;
        }

        if (inicializado) return; // evita registrar el listener dos veces
        inicializado = true;

        document.addEventListener('keydown', function (e) {
            const esCtrlG = (e.ctrlKey || e.metaKey) && (e.key === 'g' || e.key === 'G');
            if (!esCtrlG) return;

            e.preventDefault();
            e.stopPropagation();
            callback();
        });
    }

    window.CtrlGService = { init };
})();