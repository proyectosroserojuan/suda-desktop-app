

/*const pool = require('./connection');

async function migrarTablaUnificada() {
    const client = await pool.connect();
    
    try {
        // Crear tabla unificada
        await client.query(`
            CREATE TABLE IF NOT EXISTS examenes_audiologicos (
                id SERIAL PRIMARY KEY,
                tipo_examen VARCHAR(50) NOT NULL,
                paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
                cita_id INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
                entidad_id INTEGER REFERENCES entidades(id),
                
                -- Campos comunes
                diagnostico_od TEXT,
                diagnostico_oi TEXT,
                observaciones TEXT,
                otoscopia TEXT,  // ← AGREGAR ESTA LÍNEA
                grafica_base64 TEXT,
                fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                
                -- Campos específicos de AUDIOMETRÍA
                valores_od JSONB,
                valores_oi JSONB,

                -- NUEVOS CAMPOS PTA (Promedio de Tonos Puros)
                pta_via_aerea_od DECIMAL(5,1),
                pta_via_osea_od DECIMAL(5,1),
                pta_via_aerea_oi DECIMAL(5,1),
                pta_via_osea_oi DECIMAL(5,1),


                
                -- Campos específicos de LOGOAUDIOMETRÍA
                diagnostico TEXT,
                urv_od INTEGER,
                urv_oi INTEGER,
                upalabra_od INTEGER,
                upalabra_oi INTEGER,
                udisc_od INTEGER,
                udisc_oi INTEGER,
                pmax_od INTEGER,
                pmax_oi INTEGER
            )
        `);
        
        console.log('✅ Tabla examenes_audiologicos creada');
        
        // Migrar datos existentes de audiometrias
        const audiometrias = await client.query(`
            SELECT * FROM audiometrias
        `);
        
        for (const a of audiometrias.rows) {
            await client.query(`
                INSERT INTO examenes_audiologicos 
                (tipo_examen, paciente_id, cita_id, entidad_id,
                 diagnostico_od, diagnostico_oi, observaciones,otoscopia, grafica_tonal_base64,
                 valores_od, valores_oi, fecha_registro)
                VALUES ('audiometria', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,)
            `, [
                a.paciente_id, a.cita_id, a.entidad_id,
                a.diagnostico_od,   a.otoscopia || null, a.diagnostico_oi, a.observaciones, a.grafica_base64,
                a.valores_od, a.valores_oi,                a.pta_via_aerea_od || null,
                a.pta_via_osea_od || null,
                a.pta_via_aerea_oi || null,
                a.pta_via_osea_oi || null, a.fecha_registro
            ]);
        }
        
        console.log(`✅ Migradas ${audiometrias.rows.length} audiometrías`);
        
        // Migrar datos existentes de logoaudiometrias
        const logoaudiometrias = await client.query(`
            SELECT * FROM logoaudiometrias
        `);
        
        for (const l of logoaudiometrias.rows) {
            // Parsear valores_od y valores_oi que pueden ser JSON
            let valoresOD = l.valores_od;
            let valoresOI = l.valores_oi;
            
            if (typeof valoresOD === 'string') {
                try { valoresOD = JSON.parse(valoresOD); } catch(e) { valoresOD = {}; }
            }
            if (typeof valoresOI === 'string') {
                try { valoresOI = JSON.parse(valoresOI); } catch(e) { valoresOI = {}; }
            }
            
            await client.query(`
                INSERT INTO examenes_audiologicos 
                (tipo_examen, paciente_id, cita_id,
                 diagnostico, diagnostico_od, diagnostico_oi, grafica_logo_base64, fecha_registro,
                 urv_od, urv_oi, upalabra_od, upalabra_oi, udisc_od, udisc_oi, pmax_od, pmax_oi)
                VALUES ('logoaudiometria', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            `, [
                l.paciente_id, l.cita_id,
                l.diagnostico, l.diagnostico_od, l.diagnostico_oi, l.grafica_base64, l.fecha_registro,
                valoresOD?.urv || null, valoresOI?.urv || null,
                valoresOD?.upalabra || null, valoresOI?.upalabra || null,
                valoresOD?.udisc || null, valoresOI?.udisc || null,
                valoresOD?.pmax || null, valoresOI?.pmax || null
            ]);
        }
        
        console.log(`✅ Migradas ${logoaudiometrias.rows.length} logoaudiometrías`);
        
        console.log('🎉 Migración completada exitosamente');
        
    } catch (error) {
        console.error('❌ Error en migración:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Ejecutar migración
migrarTablaUnificada().then(() => {
    console.log('Migración finalizada');
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

*/