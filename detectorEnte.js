const crypto = require("crypto");


/**
 * Hashes conocidos de logos.
 * 
 * Cuando obtengamos los hash reales de los PDF,
 * los agregamos dentro de estos arrays.
 */
const HASHES_ENTES = {

    VISA: [
        "1908e313a5f60d81e72a208199f3081e5bfa208d8b9ccf811ed790ba2fe7827a"
        // "hash_logo_visa"


    ],

    GALICIA: [
        "b2cda459991a0a286f0903a7d06de9ad3ee578116062f3f92643ca5d7c416700"
        // "hash_logo_galicia"


    ]

};


/**
 * Genera un hash SHA256 a partir de un Buffer.
 *
 * @param {Buffer} buffer
 * @returns {String}
 */
function generarHash(buffer) {

    return crypto
        .createHash("sha256")
        .update(buffer)
        .digest("hex");

}


/**
 * Busca firmas textuales características
 * del resumen Galicia Visa Business.
 *
 * @param {String} texto
 * @returns {Object}
 */
function detectarFirmasTexto(texto) {

    if (!texto) {

        return {
            visaBusiness: false,
            resumenVisaBusiness: false,
            detalleConsumo: false,
            totalPagar: false,
            numeroResumen: false
        };

    }


    const textoNormalizado =
        texto
            .replace(/\s+/g, " ")
            .trim();


    return {

        visaBusiness:
            /Tarjeta\s+Cr[eé]dito\s+VISA\s+BUSINESS/i
                .test(textoNormalizado),

        resumenVisaBusiness:
            /Resumen\s+de\s+tarjeta\s+de\s+cr[eé]dito\s+VISA\s+BUSINESS/i
                .test(textoNormalizado),

        detalleConsumo:
            /DETALLE\s+DEL\s+CONSUMO/i
                .test(textoNormalizado),

        totalPagar:
            /TOTAL\s+A\s+PAGAR/i
                .test(textoNormalizado),

        numeroResumen:
            /Resumen\s+N[°º]?\s+VI\d+/i
                .test(textoNormalizado)

    };

}


/**
 * Analiza las imágenes extraídas del PDF
 * y genera firmas visuales.
 *
 * Espera recibir un array con objetos tipo:
 *
 * {
 *     id: "img_p0_1",
 *     width: 300,
 *     height: 100,
 *     buffer: <Buffer>
 * }
 *
 * @param {Array} imagenes
 * @returns {Array}
 */
function generarFirmasImagenes(imagenes = []) {

    const firmas = [];


    for (const imagen of imagenes) {

        if (
            !imagen ||
            !imagen.buffer ||
            !Buffer.isBuffer(imagen.buffer)
        ) {
            continue;
        }


        const hash =
            generarHash(
                imagen.buffer
            );


        firmas.push({

            id:
                imagen.id ||
                null,

            width:
                imagen.width ||
                null,

            height:
                imagen.height ||
                null,

            hash

        });

    }


    return firmas;

}


/**
 * Verifica si algún hash encontrado
 * coincide con un hash conocido.
 *
 * @param {Array} firmasVisuales
 * @param {Array} hashesConocidos
 * @returns {Boolean}
 */
function contieneHash(
    firmasVisuales,
    hashesConocidos
) {

    if (
        !Array.isArray(firmasVisuales) ||
        !Array.isArray(hashesConocidos)
    ) {
        return false;
    }


    return firmasVisuales.some(

        firma =>

            firma.hash &&

            hashesConocidos.includes(
                firma.hash
            )

    );

}


/**
 * Detecta el ente / tipo de documento.
 *
 * datosPdf debe contener:
 *
 * {
 *     texto: "...",
 *     imagenes: [...]
 * }
 *
 * @param {Object} datosPdf
 * @returns {Object}
 */
function detectarEnte(datosPdf) {

    if (!datosPdf) {

        throw new Error(
            "No se recibieron datos del PDF."
        );

    }


    const texto =
        datosPdf.texto ||
        datosPdf.textoCompleto ||
        "";


    const imagenes =
        datosPdf.imagenes ||
        [];


    /**
     * Detectamos firmas de texto.
     */
    const firmasTexto =
        detectarFirmasTexto(
            texto
        );


    /**
     * Generamos hash de imágenes.
     */
    const firmasVisuales =
        generarFirmasImagenes(
            imagenes
        );


    /**
     * Logs temporales.
     *
     * Nos sirven para descubrir
     * los hash reales de Visa y Galicia.
     */
    console.log(
        "========================================"
    );

    console.log(
        "FIRMAS VISUALES DETECTADAS"
    );

    console.log(
        "========================================"
    );


    firmasVisuales.forEach(
        firma => {

            console.log(firma);

        }
    );


    /**
     * Detección por hash.
     */
    const tieneVisaHash =
        contieneHash(
            firmasVisuales,
            HASHES_ENTES.VISA
        );


    const tieneGaliciaHash =
        contieneHash(
            firmasVisuales,
            HASHES_ENTES.GALICIA
        );


    /**
     * Por ahora hacemos una detección híbrida:
     *
     * texto + hash cuando exista.
     *
     * Como todavía no cargamos hashes,
     * el texto nos permite avanzar.
     */
    const tieneVisaTexto =
        firmasTexto.visaBusiness ||
        firmasTexto.resumenVisaBusiness;


    const esVisa =
        tieneVisaHash ||
        tieneVisaTexto;


    /**
     * Galicia todavía lo validamos
     * principalmente por contexto.
     *
     * Cuando agreguemos su hash,
     * esta detección quedará mucho más fuerte.
     */
    const tieneGaliciaTexto =

        /Galicia/i.test(texto) ||

        /CUIT\s+Banco:\s*30-50000173-5/i
            .test(texto);


    const esGalicia =
        tieneGaliciaHash ||
        tieneGaliciaTexto;


    /**
     * Validaciones estructurales
     * características del resumen.
     */
    const estructuraValida =

        firmasTexto.detalleConsumo &&

        firmasTexto.totalPagar &&

        firmasTexto.numeroResumen;


    /**
     * Resultado final.
     */
    if (
        esVisa &&
        esGalicia &&
        estructuraValida
    ) {

        return {

            detectado:
                true,

            ente:
                "GALICIA",

            tarjeta:
                "VISA",

            tipo:
                "VISA_BUSINESS",

            firmasTexto,

            firmasVisuales

        };

    }


    return {

        detectado:
            false,

        ente:
            "DESCONOCIDO",

        tarjeta:
            null,

        tipo:
            null,

        firmasTexto,

        firmasVisuales

    };

}


module.exports = {

    detectarEnte,

    detectarFirmasTexto,

    generarFirmasImagenes,

    HASHES_ENTES

};