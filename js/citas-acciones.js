function mostrarMensaje(texto, tipo) {
  if (window.mostrarMensaje) {
    window.mostrarMensaje(texto, tipo);
  } else {
    alert(texto);
  }
}

async function cancelarCita(id) {
  const confirmar = confirm('¿Está seguro de cancelar esta cita?');
  if (!confirmar) return;
  
  try {
    const result = await window.api.actualizarEstadoCita(id, 'cancelada');
    if (result.ok) {
      mostrarMensaje('✅ Cita cancelada exitosamente', 'exito');
      if (window.recargarCitas) {
        await window.recargarCitas();
      }
    } else {
      mostrarMensaje('Error al cancelar: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al cancelar la cita', 'error');
  }
}

async function postergarCita(id, fechaActual, horaActual) {
  const nuevaFecha = prompt('Ingrese la nueva fecha (YYYY-MM-DD):', fechaActual);
  if (!nuevaFecha) return;
  
  const nuevaHora = prompt('Ingrese la nueva hora (HH:MM):', horaActual);
  if (!nuevaHora) return;
  
  const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!fechaRegex.test(nuevaFecha)) {
    mostrarMensaje('Formato de fecha inválido. Use YYYY-MM-DD', 'error');
    return;
  }
  
  const horaRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!horaRegex.test(nuevaHora)) {
    mostrarMensaje('Formato de hora inválido. Use HH:MM', 'error');
    return;
  }
  
  try {
    const citaResult = await window.api.obtenerCitaPorId(id);
    if (!citaResult.ok) {
      mostrarMensaje('Error al obtener la cita', 'error');
      return;
    }
    
    const cita = citaResult.cita;
    
    const citaActualizada = {
      paciente_id: cita.paciente_id,
      fecha_cita: nuevaFecha,
      hora_cita: nuevaHora,
      entidad_id: cita.entidad_id,
      motivo: cita.motivo,
      estado: cita.estado,
      prioridad: cita.prioridad
    };
    
    const result = await window.api.actualizarCita(id, citaActualizada);
    if (result.ok) {
      mostrarMensaje('✅ Cita postergada exitosamente', 'exito');
      if (window.recargarCitas) {
        await window.recargarCitas();
      }
    } else {
      mostrarMensaje('Error al postergar: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al postergar la cita', 'error');
  }
}

async function editarCita(id) {
  try {
    const result = await window.api.obtenerCitaPorId(id);
    if (!result.ok) {
      mostrarMensaje('Error al obtener la cita', 'error');
      return;
    }
    
    const cita = result.cita;
    
    const pacientesSelect = document.getElementById('pacientesSelect');
    if (pacientesSelect) {
      pacientesSelect.value = cita.paciente_id;
      pacientesSelect.dispatchEvent(new Event('change'));
    }
    
    const entidadSelect = document.getElementById('entidadSelect');
    if (entidadSelect) entidadSelect.value = cita.entidad_id || '';
    
    const fechaInput = document.getElementById('fechaCita');
    if (fechaInput) fechaInput.value = cita.fecha_cita;
    
    const horaInput = document.getElementById('horaCita');
    if (horaInput) horaInput.value = cita.hora_cita;
    
    const motivoCompleto = cita.motivo || '';
    const tipoPosible = motivoCompleto.split(' - ')[0];
    const tipoAtencionSelect = document.getElementById('tipoAtencion');
    if (tipoAtencionSelect && ['Audiometría', 'Logoaudiometria', 'Impedanciometria', 'Control'].includes(tipoPosible)) {
      tipoAtencionSelect.value = tipoPosible;
    }
    
    const estadoSelect = document.getElementById('estado');
    if (estadoSelect) estadoSelect.value = cita.estado || 'pendiente';
    
    const prioridadCheckbox = document.getElementById('prioridad');
    if (prioridadCheckbox) prioridadCheckbox.checked = cita.prioridad || false;
    
    const motivoTextarea = document.getElementById('motivo');
    if (motivoTextarea) {
      const descripcion = motivoCompleto.includes(' - ') ? motivoCompleto.split(' - ')[1] : '';
      motivoTextarea.value = descripcion || '';
    }
    
    const form = document.getElementById('formCita');
    if (form) {
      form.dataset.editandoId = id;
    }
    
    mostrarMensaje('Datos cargados para edición. Modifique y presione Guardar', 'exito');
    document.querySelector('.form-wrapper').scrollIntoView({ behavior: 'smooth' });
    
  } catch (error) {
    console.error('Error:', error);
    mostrarMensaje('Error al editar la cita', 'error');
  }
}

export function configurarAcciones() {
  const tbody = document.getElementById('tablaCitasBody');
  if (!tbody) return;
  
  tbody.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    
    const action = btn.dataset.action;
    const id = parseInt(btn.dataset.id);
    
    if (action === 'cancelar') {
      await cancelarCita(id);
    } else if (action === 'postergar') {
      const fila = btn.closest('tr');
      const fechaCelda = fila?.children[2]?.textContent;
      const horaCelda = fila?.children[3]?.textContent;
      let fechaFormateada = '';
      if (fechaCelda && fechaCelda !== 'N/A') {
        const [dia, mes, año] = fechaCelda.split('/');
        fechaFormateada = `${año}-${mes}-${dia}`;
      }
      await postergarCita(id, fechaFormateada, horaCelda);
    } else if (action === 'editar') {
      await editarCita(id);
    }
  });
}