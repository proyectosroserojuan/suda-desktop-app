const db = require('./connection');

async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        nombre_completo VARCHAR(150) NOT NULL,
        password TEXT NOT NULL,
        rol VARCHAR(50) NOT NULL DEFAULT 'secretaria',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pacientes (
        id SERIAL PRIMARY KEY,
        nombre VARCHAR(150) NOT NULL,
        documento VARCHAR(50) UNIQUE NOT NULL,
        fecha_nacimiento DATE,
        telefono VARCHAR(50),
        email VARCHAR(150),
        direccion TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.query(`
  CREATE TABLE IF NOT EXISTS entidades (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

   // En db/init.js, cambia la tabla citas:
  await db.query(`
  CREATE TABLE IF NOT EXISTS citas (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER REFERENCES pacientes(id),
    entidad_id INTEGER REFERENCES entidades(id),
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    motivo TEXT,
    estado VARCHAR(50) DEFAULT 'pendiente',
    prioridad BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

    
// Agregar la columna si la tabla ya existe (para migración)
await db.query(`
  ALTER TABLE citas 
  ADD COLUMN IF NOT EXISTS entidad_id INTEGER REFERENCES entidades(id);
`);
    // Si la tabla ya existe y necesitas agregar la columna (para migración)
    await db.query(`
      ALTER TABLE citas 
      ADD COLUMN IF NOT EXISTS prioridad BOOLEAN DEFAULT false;
    `);
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS audiometrias (
        id SERIAL PRIMARY KEY,
        paciente_id INTEGER REFERENCES pacientes(id),
        tipo VARCHAR(50) NOT NULL,
        datos JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

     // En db/init.js, modifica la tabla logoaudiometrias:
await db.query(`
  CREATE TABLE IF NOT EXISTS logoaudiometrias (
    id SERIAL PRIMARY KEY,
    paciente_id INTEGER NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    cita_id INTEGER NOT NULL REFERENCES citas(id) ON DELETE CASCADE,
    diagnostico TEXT,
    diagnostico_od TEXT,
    diagnostico_oi TEXT,
    valores_od JSONB NOT NULL,
    valores_oi JSONB NOT NULL,
    grafica_base64 TEXT,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Agregar las columnas si la tabla ya existe (para migración)
await db.query(`
  ALTER TABLE logoaudiometrias 
  ADD COLUMN IF NOT EXISTS diagnostico_od TEXT;
`);

await db.query(`
  ALTER TABLE logoaudiometrias 
  ADD COLUMN IF NOT EXISTS diagnostico_oi TEXT;
`);

    // En db/init.js, agrega después de las tablas existentes:



await db.query(`
  CREATE TABLE IF NOT EXISTS formatos_pdf (
    id SERIAL PRIMARY KEY,
    entidad_id INTEGER REFERENCES entidades(id) ON DELETE CASCADE,
    tipo_formato VARCHAR(50) NOT NULL, -- 'completo' o 'simple'
    header_image TEXT, -- Ruta o URL de la imagen de encabezado
    footer_image TEXT, -- Ruta o URL de la imagen de pie
    configuracion JSONB, -- Configuración adicional del formato
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

// Insertar las entidades por defecto
await db.query(`
  INSERT INTO entidades (nombre) VALUES
    ('CENIT'),
    ('COOSALUD'),
    ('PARTICULAR'),
    ('PROGRESANDO EN SALUD'),
    ('U.D.A')
  ON CONFLICT (nombre) DO NOTHING;
`);

// Insertar configuraciones de formatos por defecto
await db.query(`
  INSERT INTO formatos_pdf (entidad_id, tipo_formato, header_image, footer_image, configuracion)
  SELECT 
    e.id,
    CASE 
      WHEN e.nombre IN ('COOSALUD', 'PROGRESANDO EN SALUD') THEN 'completo'
      ELSE 'simple'
    END,
    '/images/headers/header_default.png',
    CASE 
      WHEN e.nombre IN ('U.D.A', 'CENIT') THEN '/images/footers/footer_default.png'
      ELSE NULL
    END,
    '{}'::jsonb
  FROM entidades e
  WHERE NOT EXISTS (
    SELECT 1 FROM formatos_pdf f WHERE f.entidad_id = e.id
  );
`);



    console.log("Tablas creadas/verificadas");
  } catch (error) {
    console.log(error);
  }
}

module.exports = initDB;