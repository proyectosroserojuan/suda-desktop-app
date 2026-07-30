import { renderizarFilas } from './citas-tabla.js';

let paginaActual = 1;
let totalPaginas = 1;
let citasActuales = [];
const ITEMS_POR_PAGINA = 10;

export function actualizarTablaConPaginador(citas) {
  citasActuales = citas || [];
  totalPaginas = Math.ceil(citasActuales.length / ITEMS_POR_PAGINA);
  
  if (paginaActual > totalPaginas) {
    paginaActual = totalPaginas > 0 ? totalPaginas : 1;
  }
  if (paginaActual < 1) {
    paginaActual = 1;
  }
  
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const citasPagina = citasActuales.slice(inicio, fin);
  
  renderizarFilas(citasPagina);
  actualizarInfoPaginador();
}

function actualizarInfoPaginador() {
  const infoSpan = document.getElementById('infoPagina');
  const btnPrimera = document.getElementById('btnPrimera');
  const btnAnterior = document.getElementById('btnAnterior');
  const btnSiguiente = document.getElementById('btnSiguiente');
  const btnUltima = document.getElementById('btnUltima');
  
  if (infoSpan) {
    if (citasActuales.length === 0) {
      infoSpan.textContent = 'Página 0 de 0';
    } else {
      infoSpan.textContent = `Página ${paginaActual} de ${totalPaginas} (${citasActuales.length} citas)`;
    }
  }
  
  if (btnPrimera) btnPrimera.disabled = paginaActual === 1 || totalPaginas === 0;
  if (btnAnterior) btnAnterior.disabled = paginaActual === 1 || totalPaginas === 0;
  if (btnSiguiente) btnSiguiente.disabled = paginaActual === totalPaginas || totalPaginas === 0;
  if (btnUltima) btnUltima.disabled = paginaActual === totalPaginas || totalPaginas === 0;
}

function cambiarPagina(direccion) {
  if (direccion === 'primera') {
    paginaActual = 1;
  } else if (direccion === 'anterior') {
    paginaActual = Math.max(1, paginaActual - 1);
  } else if (direccion === 'siguiente') {
    paginaActual = Math.min(totalPaginas, paginaActual + 1);
  } else if (direccion === 'ultima') {
    paginaActual = totalPaginas;
  }
  
  actualizarTablaConPaginador(citasActuales);
}

export function configurarPaginador() {
  const btnPrimera = document.getElementById('btnPrimera');
  const btnAnterior = document.getElementById('btnAnterior');
  const btnSiguiente = document.getElementById('btnSiguiente');
  const btnUltima = document.getElementById('btnUltima');
  
  if (btnPrimera) {
    btnPrimera.addEventListener('click', () => cambiarPagina('primera'));
  }
  if (btnAnterior) {
    btnAnterior.addEventListener('click', () => cambiarPagina('anterior'));
  }
  if (btnSiguiente) {
    btnSiguiente.addEventListener('click', () => cambiarPagina('siguiente'));
  }
  if (btnUltima) {
    btnUltima.addEventListener('click', () => cambiarPagina('ultima'));
  }
}