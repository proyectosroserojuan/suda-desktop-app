// Función para mostrar mensajes (será proporcionada por el scope global)
function mostrarMensaje(texto, tipo) {
  if (window.mostrarMensaje) {
    window.mostrarMensaje(texto, tipo);
  } else {
    alert(texto);
  }
}

export async function cargarPacientes() {
  try {
    const result = await window.api.obtenerPacientes();
    if (result && result.ok) {
      const pacientes = result.pacientes;
      actualizarSelectPacientes(pacientes);
      return pacientes;
    } else {
      mostrarMensaje('Error cargando pacientes: ' + (result?.error || 'Error desconocido'), 'error');
      return [];
    }
  } catch (error) {
    console.error(error);
    mostrarMensaje('Error al conectar con la base de datos', 'error');
    return [];
  }
}

export async function cargarEntidades() {
  try {
    const result = await window.api.obtenerEntidades();
    if (result && result.ok) {
      const entidades = result.entidades;
      const entidadSelect = document.getElementById('entidadSelect');
      if (entidadSelect) {
        entidadSelect.innerHTML = '<option value="">-- Seleccione una entidad --</option>';
        entidades.forEach(entidad => {
          const option = document.createElement('option');
          option.value = entidad.id;
          option.textContent = entidad.nombre;
          entidadSelect.appendChild(option);
        });
      }
      return entidades;
    } else {
      console.error('Error cargando entidades:', result?.error);
      return [];
    }
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
}

function actualizarSelectPacientes(pacientes) {
  const pacientesSelect = document.getElementById('pacientesSelect');
  if (!pacientesSelect) return;
  
  pacientesSelect.innerHTML = '<option value="">-- Seleccione un paciente --</option>';
  pacientes.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.nombre} - ${p.documento}`;
    option.dataset.documento = p.documento;
    option.dataset.telefono = p.telefono || '';
    pacientesSelect.appendChild(option);
  });
}

function configurarBusquedaPaciente(pacientes) {
  const buscarInput = document.getElementById('buscarPaciente');
  const sugerenciasDiv = document.getElementById('resultadosBusqueda');
  const pacientesSelect = document.getElementById('pacientesSelect');
  
  if (!buscarInput) return;
  
  const mostrarSugerencias = (lista) => {
    if (!sugerenciasDiv) return;
    sugerenciasDiv.innerHTML = '';
    
    if (lista.length === 0) {
      sugerenciasDiv.style.display = 'none';
      return;
    }
    
    lista.forEach(p => {
      const item = document.createElement('div');
      item.classList.add('item-sugerencia');
      item.textContent = `${p.nombre} - ${p.documento}`;
      
      item.addEventListener('click', () => {
        buscarInput.value = `${p.nombre} - ${p.documento}`;
        if (pacientesSelect) pacientesSelect.value = p.id;
        
        const documentoInput = document.getElementById('documento');
        const telefonoInput = document.getElementById('telefono');
        if (documentoInput) documentoInput.value = p.documento || '';
        if (telefonoInput) telefonoInput.value = p.telefono || '';
        
        if (sugerenciasDiv) sugerenciasDiv.style.display = 'none';
      });
      
      sugerenciasDiv.appendChild(item);
    });
    
    sugerenciasDiv.style.display = 'block';
  };
  
  buscarInput.addEventListener('input', function() {
    const texto = this.value.toLowerCase().trim();
    
    if (!texto) {
      if (sugerenciasDiv) sugerenciasDiv.style.display = 'none';
      actualizarSelectPacientes(pacientes);
      return;
    }
    
    const coincidencias = pacientes.filter(p =>
      p.nombre.toLowerCase().includes(texto) ||
      String(p.documento).includes(texto)
    );
    
    mostrarSugerencias(coincidencias);
  });
  
  document.addEventListener('click', (e) => {
    if (sugerenciasDiv && !buscarInput.contains(e.target) && !sugerenciasDiv.contains(e.target)) {
      sugerenciasDiv.style.display = 'none';
    }
  });
}

export function configurarFormulario(pacientes) {
  configurarBusquedaPaciente(pacientes);
  
  const pacientesSelect = document.getElementById('pacientesSelect');
  if (pacientesSelect) {
    pacientesSelect.addEventListener('change', (e) => {
      const selected = e.target.selectedOptions[0];
      const documentoInput = document.getElementById('documento');
      const telefonoInput = document.getElementById('telefono');
      
      if (documentoInput) {
        documentoInput.value = selected?.dataset?.documento || '';
      }
      if (telefonoInput) {
        telefonoInput.value = selected?.dataset?.telefono || '';
      }
    });
  }
  
  const form = document.getElementById('formCita');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const pacienteId = pacientesSelect?.value;
      if (!pacienteId) {
        mostrarMensaje('Seleccione un paciente', 'error');
        return;
      }
      
      const entidadId = document.getElementById('entidadSelect')?.value;
      if (!entidadId) {
        mostrarMensaje('Seleccione una entidad', 'error');
        return;
      }
      
      const fechaCita = document.getElementById('fechaCita')?.value;
      const horaCita = document.getElementById('horaCita')?.value;
      
      if (!fechaCita || !horaCita) {
        mostrarMensaje('Complete fecha y hora de la cita', 'error');
        return;
      }
      
      const tipo = document.getElementById('tipoAtencion')?.value;
      const motivoTexto = document.getElementById('motivo')?.value || '';
      const motivo = tipo + (motivoTexto ? ' - ' + motivoTexto : '');
      const estado = document.getElementById('estado')?.value;
      const prioridadCheckbox = document.getElementById('prioridad');
      const prioridad = prioridadCheckbox ? prioridadCheckbox.checked : false;
      
      const citaData = {
        paciente_id: parseInt(pacienteId),
        fecha_cita: fechaCita,
        entidad_id: parseInt(entidadId),
        hora_cita: horaCita,
        motivo: motivo,
        estado: estado,
        prioridad: prioridad
      };
      
      try {
        const result = await window.api.crearCita(citaData);
        if (result.ok) {
          mostrarMensaje('✅ Cita guardada exitosamente', 'exito');
          form.reset();
          if (pacientesSelect) pacientesSelect.value = '';
          const entidadSelect = document.getElementById('entidadSelect');
          if (entidadSelect) entidadSelect.value = '';
          const documentoInput = document.getElementById('documento');
          const telefonoInput = document.getElementById('telefono');
          if (documentoInput) documentoInput.value = '';
          if (telefonoInput) telefonoInput.value = '';
          if (prioridadCheckbox) prioridadCheckbox.checked = false;
          
          if (window.recargarCitas) {
            await window.recargarCitas();
          }
        } else {
          mostrarMensaje('Error: ' + result.error, 'error');
        }
      } catch (error) {
        console.error('Error:', error);
        mostrarMensaje('Error al guardar la cita', 'error');
      }
    });
  }
}