// services/cloudinaryService.js
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

/**
 * Sube una imagen en base64 (formato data:image/png;base64,....) a Cloudinary.
 * Usa un public_id fijo + overwrite:true para que, si el examen se vuelve a
 * guardar (modo edición / "ACTUALIZAR CITA"), se sobreescriba la MISMA imagen
 * en vez de crear archivos huérfanos en tu cuenta de Cloudinary.
 */
async function subirImagenBase64(base64Data, folder, publicIdSugerido) {
    if (!base64Data) return null;

    try {
        const resultado = await cloudinary.uploader.upload(base64Data, {
            folder: folder,
            public_id: publicIdSugerido,
            overwrite: true,
            invalidate: true, // fuerza a refrescar el CDN si se sobreescribe
            resource_type: 'image',
            format: 'png'
        });

        return {
            url: resultado.secure_url,
            public_id: resultado.public_id
        };
    } catch (error) {
        console.error('❌ Error subiendo imagen a Cloudinary:', error);
        throw error;
    }
}

/**
 * Elimina una imagen de Cloudinary por su public_id.
 * No es crítico: si falla, no debe tumbar el flujo de la app.
 */
async function eliminarImagen(publicId) {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId);
        console.log('🗑️ Imagen eliminada de Cloudinary:', publicId);
    } catch (error) {
        console.error('⚠️ No se pudo eliminar la imagen de Cloudinary:', publicId, error);
    }
}

/**
 * Descarga una imagen de Cloudinary (o cualquier URL https) y la convierte
 * a base64 con el formato data:image/png;base64,.... Esto es lo que usamos
 * para que el generador de PDF (que ya sabe trabajar con base64) siga
 * funcionando SIN CAMBIOS cuando el examen viene de la base de datos.
 */
function descargarImagenComoBase64(url) {
    const https = require('https');
    return new Promise((resolve, reject) => {
        if (!url) return resolve(null);
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error(`Error descargando imagen: ${res.statusCode}`));
            }
            const chunks = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(`data:image/png;base64,${buffer.toString('base64')}`);
            });
        }).on('error', reject);
    });
}

module.exports = {
    subirImagenBase64,
    eliminarImagen,
    descargarImagenComoBase64
};