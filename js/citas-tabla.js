import { actualizarTablaConPaginador } from './citas-paginador.js';

let citasFiltradas = [];

function obtenerValoresFiltros() {
  const busqueda = document.getElementById('busquedaTexto')?.value.toLowerCase() || '';
  const fecha = document.getElementById('filtroFecha')?.value || '';
  const entidadId = document.getElementById('filtroEntidad')?.value || '';
  const prioridad = document.getElementById('filtroPrioridad')?.value || '';
  
  return { busqueda, fecha, entidadId, prioridad };
}

export function filtrarCitas(todasLasCitas, entidades) {
  const { busqueda, fecha, entidadId, prioridad } = obtenerValoresFiltros();
  
  citasFiltradas = todasLasCitas.filter(cita => {
    if (busqueda) {
      const nombreMatch = cita.paciente_nombre?.toLowerCase().includes(busqueda);
      const documentoMatch = cita.documento?.toLowerCase().includes(busqueda);
      if (!nombreMatch && !documentoMatch) return false;
    }
    
    if (fecha) {
      const citaFecha = new Date(cita.fecha_cita).toISOString().split('T')[0];
      if (citaFecha !== fecha) return false;
    }
    
    if (entidadId) {
      if (cita.entidad_id != entidadId) return false;
    }
    
    if (prioridad !== '') {
      const esPrioritaria = prioridad === 'true';
      if (cita.prioridad !== esPrioritaria) return false;
    }
    
    return true;
  });
  
  citasFiltradas.sort((a, b) => {
    if (a.prioridad !== b.prioridad) {
      return b.prioridad ? 1 : -1;
    }
    return new Date(b.fecha_cita) - new Date(a.fecha_cita);
  });
  
  actualizarTablaConPaginador(citasFiltradas);
  
  return citasFiltradas;
}

export function obtenerCitasFiltradas() {
  return citasFiltradas;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatearFecha(fecha) {
  if (!fecha) return 'N/A';
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES');
}

function getEstadoBadge(estado) {
  const estados = {
    'pendiente': '<span style="background:#fef3c7; color:#d97706; padding:4px 8px; border-radius:20px; font-size:0.7rem;">⏳ Pendiente</span>',
    'atendida': '<span style="background:#d1fae5; color:#059669; padding:4px 8px; border-radius:20px; font-size:0.7rem;">✓ Atendida</span>',
    'cancelada': '<span style="background:#fee2e2; color:#dc2626; padding:4px 8px; border-radius:20px; font-size:0.7rem;">✗ Cancelada</span>',
    'no_asistio': '<span style="background:#f1f5f9; color:#64748b; padding:4px 8px; border-radius:20px; font-size:0.7rem;">◌ No asistió</span>'
  };
  return estados[estado] || `<span style="background:#e2e8f0; color:#475569; padding:4px 8px; border-radius:20px;">${estado}</span>`;
}

export function renderizarFilas(citasMostrar) {
  const tbody = document.getElementById('tablaCitasBody');
  if (!tbody) return;
  
  if (!citasMostrar || citasMostrar.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay citas registradas</td></tr>';
    return;
  }
  
  tbody.innerHTML = citasMostrar.map(cita => `
    <tr data-cita-id="${cita.id}">
      <td>${escapeHtml(cita.paciente_nombre || 'N/A')}</td>
      <td>${escapeHtml(cita.documento || 'N/A')}</td>
      <td>${formatearFecha(cita.fecha_cita)}</td>
      <td>${cita.hora_cita || 'N/A'}</td>
      <td>${escapeHtml(cita.entidad_nombre || 'N/A')}</td>
      <td>
        <span class="${cita.prioridad ? 'prioridad-alta' : 'prioridad-normal'}">
          ${cita.prioridad ? '⭐ Prioritaria' : 'Normal'}
        </span>
      </td>
      <td>${getEstadoBadge(cita.estado)}</td>
      <td>
        <button class="btn-accion btn-cancelar" data-action="cancelar" data-id="${cita.id}">Cancelar</button>
        <button class="btn-accion btn-postergar" data-action="postergar" data-id="${cita.id}">Postergar</button>
        <button class="btn-accion btn-editar" data-action="editar" data-id="${cita.id}">Editar</button>
      </td>
    </tr>
  `).join('');
}