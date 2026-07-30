import { cargarPacientes, cargarEntidades, configurarFormulario } from '../js/citas-filtros.js';
import { cargarCitas, filtrarCitas, obtenerCitasFiltradas } from '../js/citas-tabla.js';
import { configurarAcciones } from '../js/citas-acciones.js';
import { configurarPaginador, actualizarTablaConPaginador } from '../js/citas-paginador.js';

let pacientesLista = [];
let entidadesLista = [];
let todasLasCitas = [];

// Función para mostrar mensajes
export function mostrarMensaje(texto, tipo) {
  const mensajeDiv = document.getElementById('mensaje');
  if (mensajeDiv) {
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    mensajeDiv.style.display = 'block';
    setTimeout(() => {
      mensajeDiv.style.display = 'none';
    }, 3000);
  } else {
    alert(texto);
  }
}

// Función para recargar todas las citas
export async function recargarCitas() {
  try {
    const result = await window.api.obtenerTodasLasCitas();
    if (result.ok) {
      todasLasCitas = result.citas;
      filtrarCitas(todasLasCitas, entidadesLista);
      return todasLasCitas;
    } else {
      mostrarMensaje('Error cargando citas: ' + result.error, 'error');
      return [];
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cargar las citas', 'error');
    return [];
  }
}

// Inicializar select de entidades para filtro
function inicializarFiltroEntidades() {
  const filtroEntidad = document.getElementById('filtroEntidad');
  if (filtroEntidad && entidadesLista.length > 0) {
    filtroEntidad.innerHTML = '<option value="">Todas</option>';
    entidadesLista.forEach(entidad => {
      const option = document.createElement('option');
      option.value = entidad.id;
      option.textContent = entidad.nombre;
      filtroEntidad.appendChild(option);
    });
  }
}

// Configurar eventos de filtros
function configurarFiltros() {
  const busquedaTexto = document.getElementById('busquedaTexto');
  const filtroFecha = document.getElementById('filtroFecha');
  const filtroEntidad = document.getElementById('filtroEntidad');
  const filtroPrioridad = document.getElementById('filtroPrioridad');
  const limpiarBtn = document.getElementById('limpiarFiltros');
  
  const actualizar = () => {
    filtrarCitas(todasLasCitas, entidadesLista);
  };
  
  if (busquedaTexto) busquedaTexto.addEventListener('input', actualizar);
  if (filtroFecha) filtroFecha.addEventListener('change', actualizar);
  if (filtroEntidad) filtroEntidad.addEventListener('change', actualizar);
  if (filtroPrioridad) filtroPrioridad.addEventListener('change', actualizar);
  
  if (limpiarBtn) {
    limpiarBtn.addEventListener('click', () => {
      if (busquedaTexto) busquedaTexto.value = '';
      if (filtroFecha) filtroFecha.value = '';
      if (filtroEntidad) filtroEntidad.value = '';
      if (filtroPrioridad) filtroPrioridad.value = '';
      actualizar();
    });
  }
}

// Inicialización principal
async function init() {
  // Cargar pacientes y entidades
  pacientesLista = await cargarPacientes();
  entidadesLista = await cargarEntidades();
  
  // Configurar el formulario
  configurarFormulario(pacientesLista);
  
  // Inicializar filtro de entidades
  inicializarFiltroEntidades();
  
  // Cargar citas
  await recargarCitas();
  
  // Configurar filtros
  configurarFiltros();
  
  // Configurar acciones de tabla
  configurarAcciones();
  
  // Configurar paginador
  configurarPaginador();
  
  // Configurar botón volver
  const volverBtn = document.getElementById('btnVolverDashboard');
  if (volverBtn) {
    volverBtn.addEventListener('click', () => {
      if (window.api && window.api.volverDashboard) {
        window.api.volverDashboard();
      }
    });
  }
  
  // Manejo de logo fallback
  const logoImg = document.querySelector('.logo-empresa-top img');
  if (logoImg) {
    logoImg.onerror = function() {
      this.style.display = 'none';
      const fallbackDiv = document.getElementById('fallbackLogo');
      if (fallbackDiv) fallbackDiv.style.display = 'block';
    };
  }
  
  // Fecha mínima para el input de fecha
  const hoy = new Date().toISOString().split('T')[0];
  const fechaInput = document.getElementById('fechaCita');
  if (fechaInput) fechaInput.min = hoy;
}

// Exportar para uso en otros módulos
export { pacientesLista, entidadesLista, todasLasCitas };

// Iniciar
init();