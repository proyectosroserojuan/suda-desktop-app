// services/pathService.js
const path = require('path');
const fs = require('fs-extra'); // 👈 RECOMENDACIÓN: Usar fs-extra para operaciones asíncronas robustas
const os = require('os');

// NOTA: Instala 'fs-extra' con: npm install fs-extra

class PathService {
    constructor() {
        // Directorio base de la aplicación. En un futuro, podría ser configurable.
        this.baseDir = 'C:\\SUDA';
        this.resultadosDir = path.join(this.baseDir, 'resultados');
        // Cache para la ruta de descargas (por si la necesitamos)
        this.downloadsDir = path.join(os.homedir(), 'Downloads');
        // Flag para saber si la estructura base está creada
        this.isBaseStructureReady = false;
    }

    /**
     * Función principal que debe llamarse UNA SOLA VEZ al iniciar la app.
     * Crea la estructura de carpetas base (C:\SUDA\resultados) si no existe.
     * @returns {Promise<boolean>} - true si la estructura base está lista, false si no.
     */
    async initializeBaseDirectories() {
        if (this.isBaseStructureReady) {
            console.log('📁 Estructura de carpetas base ya inicializada.');
            return true;
        }

        try {
            // Verificar si el directorio base existe, si no, crearlo.
            if (!fs.existsSync(this.baseDir)) {
                console.log(`📁 Creando directorio base: ${this.baseDir}`);
                await fs.mkdir(this.baseDir);
            }

            // Verificar si el directorio de resultados existe, si no, crearlo.
            if (!fs.existsSync(this.resultadosDir)) {
                console.log(`📁 Creando directorio de resultados: ${this.resultadosDir}`);
                await fs.mkdir(this.resultadosDir);
            }

            // Validar que podemos escribir en la carpeta (prueba de permisos)
            const testFilePath = path.join(this.resultadosDir, '.write_test');
            await fs.writeFile(testFilePath, 'test');
            await fs.remove(testFilePath);

            console.log('✅ Estructura de carpetas base lista y con permisos de escritura.');
            this.isBaseStructureReady = true;
            return true;

        } catch (error) {
            console.error('❌ Error al inicializar la estructura de carpetas base:', error);
            // Si falla, no podemos usar la estructura base. La aplicación seguirá usando Downloads.
            this.isBaseStructureReady = false;
            return false;
        }
    }

    /**
     * Obtiene la ruta donde se debe guardar el PDF para un paciente.
     * Esta función se llama CADA VEZ que se guarda un PDF.
     * Verifica si la carpeta del paciente existe y la crea si no.
     * 
     * @param {string} documentoPaciente - El número de documento del paciente.
     * @returns {Promise<{success: boolean, path: string}>} - Objeto con el resultado.
     */
    async getPatientDirectory(documentoPaciente) {
        // Si la estructura base no está lista, devolver un fallo para que se use Downloads.
        if (!this.isBaseStructureReady) {
            console.warn('⚠️ Estructura base no lista. Se usará la carpeta de Descargas.');
            return { success: false, path: this.downloadsDir, reason: 'base_not_ready' };
        }

        if (!documentoPaciente || documentoPaciente.trim() === '') {
            console.warn('⚠️ El documento del paciente está vacío o es inválido. Se usará "SIN_DOCUMENTO".');
            // Usamos un nombre por defecto para no fallar.
            documentoPaciente = 'SIN_DOCUMENTO';
        }

        // Normalizamos el documento para evitar problemas con caracteres especiales.
        const docClean = documentoPaciente.replace(/[^a-zA-Z0-9]/g, '');
        const patientDir = path.join(this.resultadosDir, docClean);

        try {
            // Verificar si la carpeta del paciente existe. Si no, crearla.
            if (!fs.existsSync(patientDir)) {
                console.log(`📁 Creando carpeta para el paciente (DOC: ${docClean})`);
                await fs.mkdir(patientDir);
            }

            // Verificar que tenemos permisos en la carpeta del paciente.
            const testFilePath = path.join(patientDir, '.write_test');
            await fs.writeFile(testFilePath, 'test');
            await fs.remove(testFilePath);

            return { success: true, path: patientDir };
        } catch (error) {
            console.error(`❌ Error al crear/verificar la carpeta para el paciente ${docClean}:`, error);
            // Si falla, devolvemos un fallo para que se use Downloads.
            return { success: false, path: this.downloadsDir, reason: 'patient_dir_error' };
        }
    }

    /**
     * Obtiene la ruta de la carpeta de Descargas del usuario.
     * @returns {string} - Ruta a la carpeta de Descargas.
     */
    getDownloadsPath() {
        return this.downloadsDir;
    }
}

// Exportamos una instancia única (Singleton) del servicio.
module.exports = new PathService();