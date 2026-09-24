// services/pdf.service.js

/**
 * Servicio encargado exclusivamente de:
 *
 * PDF (Buffer)
 *      ↓
 * extracción de texto
 *      ↓
 * texto normalizado
 *
 * Este módulo NO parsea conceptos de Pago Mis Cuentas.
 * Solamente extrae el contenido textual del PDF.
 */


// ---------------------------------------------------------
// NORMALIZACIÓN
// ---------------------------------------------------------

function normalizarTexto(texto = '') {
    return String(texto)
        .replace(/\u00a0/g, ' ')       // espacios NBSP
        .replace(/\r/g, '\n')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n[ \t]+/g, '\n')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}


// ---------------------------------------------------------
// VALIDACIÓN BÁSICA DE PDF
// ---------------------------------------------------------

function validarPdf(buffer) {

    if (!buffer) {
        throw new Error(
            'No se recibió contenido del archivo PDF.'
        );
    }

    if (!Buffer.isBuffer(buffer)) {
        throw new Error(
            'El contenido recibido no es un Buffer válido.'
        );
    }

    if (buffer.length === 0) {
        throw new Error(
            'El archivo PDF recibido está vacío.'
        );
    }

    /*
     * La mayoría de los PDF comienzan con:
     *
     * %PDF-
     *
     * Esta validación evita enviar accidentalmente
     * HTML, TXT u otro tipo de archivo al extractor.
     */

    const encabezado = buffer
        .subarray(0, 5)
        .toString('ascii');

    if (encabezado !== '%PDF-') {
        throw new Error(
            'El archivo recibido no parece ser un PDF válido.'
        );
    }
}


// ---------------------------------------------------------
// CARGA DE PDF.JS
// ---------------------------------------------------------

async function cargarPdfJs() {

    /*
     * pdfjs-dist utiliza módulos ES en sus versiones
     * modernas.
     *
     * Como nuestro proyecto utiliza CommonJS
     * (require/module.exports), usamos import dinámico.
     */

    const pdfjsLib = await import(
        'pdfjs-dist/legacy/build/pdf.mjs'
    );

    return pdfjsLib;
}


// ---------------------------------------------------------
// EXTRAER TEXTO DE UNA PÁGINA
// ---------------------------------------------------------

async function extraerTextoPagina(page) {

    const contenido = await page.getTextContent();

    if (
        !contenido ||
        !Array.isArray(contenido.items)
    ) {
        return '';
    }

    /*
     * Cada elemento suele tener:
     *
     * {
     *     str: "RECAUDACION"
     * }
     *
     * Los unimos conservando espacios.
     */

    const partes = contenido.items
        .map(item => {

            if (
                !item ||
                typeof item.str !== 'string'
            ) {
                return '';
            }

            return item.str.trim();
        })
        .filter(Boolean);

    return partes.join(' ');
}


// ---------------------------------------------------------
// EXTRAER TEXTO DE UN PDF
// ---------------------------------------------------------

async function extraerTextoPdf(buffer) {

    validarPdf(buffer);

    const pdfjsLib = await cargarPdfJs();

    /*
     * pdfjs trabaja mejor con Uint8Array.
     */

    const datosPdf = new Uint8Array(buffer);

    let documento = null;

    try {

        const tareaCarga = pdfjsLib.getDocument({
            data: datosPdf,

            /*
             * Estamos ejecutando Node en backend.
             * No necesitamos worker del navegador.
             */
            disableWorker: true
        });

        documento = await tareaCarga.promise;

        if (!documento.numPages) {
            throw new Error(
                'El PDF no contiene páginas.'
            );
        }

        const paginas = [];

        for (
            let numeroPagina = 1;
            numeroPagina <= documento.numPages;
            numeroPagina++
        ) {

            const pagina = await documento.getPage(
                numeroPagina
            );

            const textoPagina =
                await extraerTextoPagina(pagina);

            if (textoPagina) {
                paginas.push(textoPagina);
            }

            /*
             * Liberamos recursos de la página
             * después de procesarla.
             */
            pagina.cleanup();
        }

        const textoCompleto =
            normalizarTexto(
                paginas.join('\n')
            );

        /*
         * Si no encontramos texto, probablemente sea
         * un PDF escaneado/imágenes.
         *
         * En ese caso NO devolvemos silenciosamente
         * texto vacío.
         */

        if (!textoCompleto) {
            throw new Error(
                'No se pudo extraer texto del PDF. ' +
                'El archivo podría ser un PDF escaneado y requerir OCR.'
            );
        }

        return textoCompleto;

    } catch (error) {

        /*
         * Mantenemos nuestro mensaje si ya es uno
         * de los errores controlados.
         */

        if (
            error.message &&
            (
                error.message.includes(
                    'PDF escaneado'
                ) ||
                error.message.includes(
                    'no contiene páginas'
                )
            )
        ) {
            throw error;
        }

        throw new Error(
            `Error al leer el PDF: ${error.message}`
        );

    } finally {

        /*
         * Limpieza de recursos.
         */

        if (documento) {

            try {
                await documento.destroy();
            } catch {
                // No bloqueamos la conversión por
                // un error durante la limpieza.
            }
        }
    }
}


// ---------------------------------------------------------
// EXTRAER TEXTO DE VARIOS PDF
// ---------------------------------------------------------

async function extraerTextoMultiplesPdfs(archivos) {

    if (!Array.isArray(archivos)) {
        throw new Error(
            'La lista de archivos PDF debe ser un array.'
        );
    }

    if (archivos.length === 0) {
        throw new Error(
            'No se recibieron archivos PDF.'
        );
    }

    const resultados = [];

    /*
     * Procesamos secuencialmente de manera intencional.
     *
     * Si mañana llegan 100 PDF de varios MB,
     * Promise.all() podría disparar el consumo de RAM.
     *
     * De esta manera procesamos:
     *
     * PDF 1
     * PDF 2
     * PDF 3
     * ...
     */

    for (let i = 0; i < archivos.length; i++) {

        const archivo = archivos[i];

        if (!archivo) {
            continue;
        }

        /*
         * Con Multer normalmente tendremos:
         *
         * archivo.originalname
         * archivo.mimetype
         * archivo.buffer
         */

        const nombre =
            archivo.originalname ||
            archivo.nombre ||
            `archivo_${i + 1}.pdf`;

        const buffer =
            archivo.buffer || archivo;

        try {

            const texto =
                await extraerTextoPdf(buffer);

            resultados.push({
                nombre,
                texto,
                error: null
            });

        } catch (error) {

            /*
             * Un PDF problemático NO debería hacer
             * perder las otras 30 liquidaciones.
             *
             * Guardamos el error individualmente.
             */

            resultados.push({
                nombre,
                texto: null,
                error: error.message
            });
        }
    }

    return resultados;
}


// ---------------------------------------------------------
// EXPORTACIONES
// ---------------------------------------------------------

module.exports = {
    extraerTextoPdf,
    extraerTextoMultiplesPdfs,
    normalizarTexto
};