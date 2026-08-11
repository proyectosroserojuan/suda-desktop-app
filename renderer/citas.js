window.addEventListener('DOMContentLoaded', async () => {
  const select = document.getElementById('pacientesSelect');
  const documentoInput = document.querySelector('input[placeholder="CC / DNI"]');
  const telefonoInput = document.querySelector('input[type="tel"]');
  const fechaInput = document.getElementById('fechaCita');
  const horaInput = document.getElementById('horaCita');
  const motivoTextarea = document.getElementById('motivo');
  const estadoSelect = document.getElementById('estado');
  const tipoAtencionSelect = document.getElementById('tipoAtencion');
  const observacionesTextarea = document.getElementById('observaciones');
  const form = document.getElementById('formCita');
  const mensajeDiv = document.getElementById('mensaje');

  // Establecer fecha mínima (hoy)
  if (fechaInput) {
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.min = hoy;
  }

  // Cargar pacientes
  async function cargarPacientes() {
    try {
      const res = await window.api.obtenerPacientes();

      if (res.ok) {
        select.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
        
        res.pacientes.forEach(p => {
          const option = document.createElement('option');
          option.value = p.id;
          option.textContent = `${p.nombre} - ${p.documento}`;
          option.dataset.documento = p.documento;
          option.dataset.telefono = p.telefono || '';
          select.appendChild(option);
        });
      } else {
        mostrarMensaje('Error cargando pacientes: ' + res.error, 'error');
      }
    } catch (error) {
      console.error('Error:', error);
      mostrarMensaje('Error al conectar con la base de datos', 'error');
    }
  }

  async function cargarTiposAtencion() {
    try {
        const result = await window.api.obtenerTiposAtencion();
        if (result && result.ok) {
            const select = document.getElementById('tipoAtencion');
            select.innerHTML = '<option value="">-- Seleccione --</option>';
            result.tipos.forEach(tipo => {
                const option = document.createElement('option');
                option.value = tipo.id;
                option.textContent = tipo.nombre;
                select.appendChild(option);
            });
            console.log('✅ Tipos de atención cargados:', result.tipos.length);
        } else {
            console.error('❌ Error cargando tipos:', result?.error);
        }
    } catch (error) {
        console.error('❌ Error cargando tipos de atención:', error);
    }
}

  // Mostrar mensaje
  function mostrarMensaje(texto, tipo) {
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

  // Auto-completar documento y teléfono al seleccionar paciente
  if (select) {
    select.addEventListener('change', (e) => {
      const selected = e.target.selectedOptions[0];

      if (documentoInput) {
        documentoInput.value = selected?.dataset?.documento || '';
      }

      if (telefonoInput) {
        telefonoInput.value = selected?.dataset?.telefono || '';
      }
    });
  }

  // Guardar cita
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const pacienteId = select.value;
      if (!pacienteId) {
        mostrarMensaje('Seleccione un paciente', 'error');
        return;
      }

      const fecha = fechaInput?.value;
      const hora = horaInput?.value;

      if (!fecha || !hora) {
        mostrarMensaje('Complete fecha y hora de la cita', 'error');
        return;
      }

      const tipo = tipoAtencionSelect?.value || 'Consulta';
      const motivoTexto = motivoTextarea?.value || '';
      const motivo = tipo + (motivoTexto ? ' - ' + motivoTexto : '');
      const estado = estadoSelect?.value || 'pendiente';
      const observaciones = observacionesTextarea?.value || '';

          // OBTENER VALOR DEL CHECKBOX DE PRIORIDAD
    const prioridadCheckbox = document.getElementById('prioridad');
    const prioridad = prioridadCheckbox ? prioridadCheckbox.checked : false;

      // IMPORTANTE: usar "fecha" y "hora" (no "fecha_cita" / "hora_cita")
const citaData = {
  paciente_id: parseInt(pacienteId),
  fecha_cita: fecha,    // ← CORREGIDO
  hora_cita: hora,      // ← CORREGIDO
  motivo: motivo + (observaciones ? ' | Obs: ' + observaciones : ''),
  estado: estado,
 prioridad: prioridad  // ← NUEVO CAMPO BOOLEANO
};

      try {
        const res = await window.api.crearCita(citaData);

        if (res.ok) {
          mostrarMensaje('✅ Cita guardada exitosamente', 'exito');

             try {
        const entidadSelect = document.getElementById('entidadSelect');
        const entidadNombre = entidadSelect?.selectedOptions[0]?.text || 'Sin entidad';
        
        window.api.notificarNuevaCita({
            id: res.id,
            paciente_nombre: select?.selectedOptions[0]?.text?.split(' - ')[0] || 'Paciente',
            fecha_cita: fecha,
            hora_cita: hora,
            entidad_nombre: entidadNombre,
            prioridad: prioridad || false
        });
        console.log('Notificación enviada para recargar citas');
    } catch (notifError) {
        console.warn('Error en notificación:', notifError);
    }
          
          // Resetear formulario
          select.value = '';
          if (documentoInput) documentoInput.value = '';
          if (telefonoInput) telefonoInput.value = '';
          if (fechaInput) fechaInput.value = '';
          if (horaInput) horaInput.value = '';
          if (motivoTextarea) motivoTextarea.value = '';
          if (observacionesTextarea) observacionesTextarea.value = '';
          if (tipoAtencionSelect) tipoAtencionSelect.value = 'Audiometría';
          if (estadoSelect) estadoSelect.value = 'pendiente';
          if (prioridadCheckbox) prioridadCheckbox.checked = false; // Resetear checkbox
        } else {
          mostrarMensaje('Error: ' + res.error, 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al guardar la cita', 'error');
      }
    });
  }

  // Botón volver al Dashboard
  const volverBtn = document.getElementById('btnVolverDashboard');
  if (volverBtn) {
    volverBtn.addEventListener('click', () => {
      if (window.api && window.api.volverDashboard) {
        window.api.volverDashboard();
      } else if (window.api && window.api.navegar) {
        window.api.navegar('dashboard.html');
      } else {
        alert('No se puede navegar al dashboard');
      }
    });
  }

  // Inicializar
  await cargarPacientes();
});