// excelService.js
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

class ExcelService {
    /**
     * Genera un reporte de citas en Excel
     * @param {Array} citas - Lista de citas
     * @param {Object} reporte - Datos del reporte (total, porEntidad, porEstado)
     * @param {number} mes - Mes (0-11)
     * @param {number} año - Año
     * @returns {string} Ruta del archivo generado
     */
    generarReporteCitas(citas, reporte, mes, año) {
        const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        const nombreMes = meses[mes];

        // 1. Crear libro de trabajo
        const wb = XLSX.utils.book_new();

        // 2. Hoja de Resumen
        const resumenData = this._crearHojaResumen(reporte, nombreMes, año);
        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // 3. Hoja de Detalle
        const detalleData = this._crearHojaDetalle(citas);
        const wsDetalle = XLSX.utils.aoa_to_sheet(detalleData);
        XLSX.utils.book_append_sheet(wb, wsDetalle, 'Detalle Citas');

        // 4. Hoja de Entidades
        const entidadesData = this._crearHojaEntidades(reporte.porEntidad);
        const wsEntidades = XLSX.utils.aoa_to_sheet(entidadesData);
        XLSX.utils.book_append_sheet(wb, wsEntidades, 'Por Entidad');

        // 5. Configurar anchos de columnas
        wsResumen['!cols'] = [
            { wch: 30 },
            { wch: 20 }
        ];
        wsDetalle['!cols'] = [
            { wch: 25 }, // Paciente
            { wch: 15 }, // Documento
            { wch: 25 }, // Entidad
            { wch: 15 }, // Fecha
            { wch: 10 }, // Hora
            { wch: 30 }, // Motivo
            { wch: 15 }  // Estado
        ];
        wsEntidades['!cols'] = [
            { wch: 30 },
            { wch: 15 }
        ];

        // 6. Guardar archivo
        const nombreArchivo = `reporte_citas_${nombreMes}_${año}.xlsx`;
        const rutaSalida = path.join(__dirname, 'reportes', nombreArchivo);
        
        // Crear carpeta si no existe
        const dir = path.dirname(rutaSalida);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        XLSX.writeFile(wb, rutaSalida);
        return rutaSalida;
    }

    /**
     * Crea la hoja de resumen
     */
    _crearHojaResumen(reporte, nombreMes, año) {
        const estadoLabels = {
            pendiente: 'Pendiente',
            atendida: 'Atendida',
            cancelada: 'Cancelada',
            no_asistio: 'No asistió'
        };

        const data = [
            ['REPORTE DE CITAS'],
            [''],
            ['Mes:', `${nombreMes} ${año}`],
            ['Total de citas:', reporte.total],
            [''],
            ['📌 POR ESTADO:'],
            ['Estado', 'Cantidad']
        ];

        // Agregar estados
        Object.entries(reporte.porEstado).forEach(([estado, cantidad]) => {
            data.push([estadoLabels[estado] || estado, cantidad]);
        });

        data.push(['']);
        data.push(['📌 POR ENTIDAD:']);
        data.push(['Entidad', 'Cantidad']);

        // Agregar entidades
        reporte.porEntidad.forEach(item => {
            data.push([item.nombre, item.cantidad]);
        });

        data.push(['']);
        data.push(['Fecha de generación:', new Date().toLocaleString('es-ES')]);

        return data;
    }

    /**
     * Crea la hoja de detalle de citas
     */
    _crearHojaDetalle(citas) {
        const header = [
            'Paciente',
            'Documento',
            'Entidad',
            'Fecha',
            'Hora',
            'Motivo',
            'Estado'
        ];

        const rows = citas.map(cita => {
            const fecha = cita.fecha_cita ? new Date(cita.fecha_cita).toLocaleDateString('es-ES') : 'N/A';
            const estadoLabels = {
                pendiente: 'Pendiente',
                atendida: 'Atendida',
                cancelada: 'Cancelada',
                no_asistio: 'No asistió'
            };
            return [
                cita.paciente_nombre || 'N/A',
                cita.documento || 'N/A',
                cita.entidad_nombre || 'Sin entidad',
                fecha,
                cita.hora_cita || 'N/A',
                cita.motivo || 'N/A',
                estadoLabels[cita.estado] || cita.estado || 'Pendiente'
            ];
        });

        return [header, ...rows];
    }

    /**
     * Crea la hoja de entidades
     */
    _crearHojaEntidades(porEntidad) {
        const data = [
            ['ENTIDADES POR CANTIDAD DE CITAS'],
            [''],
            ['Entidad', 'Cantidad']
        ];

        porEntidad.forEach(item => {
            data.push([item.nombre, item.cantidad]);
        });

        data.push(['']);
        data.push(['Total:', porEntidad.reduce((sum, item) => sum + item.cantidad, 0)]);

        return data;
    }
}

module.exports = new ExcelService();