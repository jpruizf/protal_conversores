const ENTES_RECAUDADORES = {
    VISA: "VISA",
    MASTERCARD: "MASTERCARD",
    SUPERVIELLE: "SUPERVIELLE",
    AMERICAN_EXPRESS: "AMERICAN_EXPRESS",
    MAESTRO: "MAESTRO",
    DESCONOCIDO: "DESCONOCIDO"
};



/**
 * Firmas visuales conocidas.
 *
 * IMPORTANTE:
 * completar cuando validemos cuál
 * corresponde a VISA y cuál a MASTERCARD.
 */
const HASHES_ENTES = {

    VISA: [
        // "hash_visa"
    ],

    MASTERCARD: [
        "3eae293c5b5092c7fe0820ef87694421a462584ea99b78f235cbd9b0744c55f7"
        // "hash_mastercard"
    ],

    AMERICAN_EXPRESS: [
        // acá pondremos el hash visual de AMEX
    ],

    MAESTRO: [
         "aa0031836e72352138455f5c96db5b0e03c30392dd16be250eaa804d7a1d0f81"
        // firma visual Maestro
    ]
};

/**
 * Normaliza cualquier texto para
 * facilitar las comparaciones.
 */
function normalizarTexto(
    valor
) {

    return String(
        valor || ""
    )
        .toUpperCase()
        .replace(/\r/g, " ")
        .replace(/\n/g, " ")
        .replace(/\u00a0/g, " ")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/**
 * Calcula cuántos bits son diferentes
 * entre dos hashes perceptuales.
 */
function distanciaHamming(
    hashA,
    hashB
) {

    if (
        !hashA ||
        !hashB ||
        hashA.length !== hashB.length
    ) {
        return Infinity;
    }


    let distancia = 0;


    for (
        let i = 0;
        i < hashA.length;
        i++
    ) {

        const a =
            parseInt(
                hashA[i],
                16
            );

        const b =
            parseInt(
                hashB[i],
                16
            );


        let xor =
            a ^ b;


        while (xor) {

            distancia +=
                xor & 1;

            xor >>=
                1;
        }
    }


    return distancia;
}

/**
 * Detecta el ente recaudador utilizando:
 *
 * 1. Contenido textual del PDF.
 * 2. Nombre original del archivo.
 *
 * @param {String} contenidoPDF
 * @param {String} nombreArchivo
 * @returns {String}
 */
function detectarEnteRecaudador(
    contenidoPDF,
    nombreArchivo = "",
    firmasVisuales= []
) {

    const texto =
        normalizarTexto(
            contenidoPDF
        );


    const nombre =
        normalizarTexto(
            nombreArchivo
        );


    /**
     * ==============================
     * VISA
     * ==============================
     */

    if (
        /\bVISA\b/.test(texto)
    ) {

        return ENTES_RECAUDADORES.VISA;
    }


    if (
        /\bVISA\b/.test(nombre)
    ) {

        return ENTES_RECAUDADORES.VISA;
    }


    /**
     * ==============================
     * MASTERCARD
     * ==============================
     */

    if (
        /\bMASTER\s*CARD\b/.test(texto) ||
        /\bMASTERCARD\b/.test(texto) ||
        /\bMASTER\s+MAC\b/.test(texto)
    ) {

        return ENTES_RECAUDADORES.MASTERCARD;
    }


    if (
        /\bMASTER\s*CARD\b/.test(nombre) ||
        /\bMASTERCARD\b/.test(nombre) ||
        /\bMASTER\b/.test(nombre)
    ) {

        return ENTES_RECAUDADORES.MASTERCARD;
    }



    /**
    * ==============================
    * AMERICAN EXPRESS - TEXTO
    * ==============================
    */
    if (
        /\bAMERICAN\s+EXPRESS\b/.test(texto) ||
        /\bAMEX\b/.test(texto)
    ) {

        return ENTES_RECAUDADORES.AMERICAN_EXPRESS;
    }


    /**
    * ==============================
    * AMERICAN EXPRESS - NOMBRE
    * ==============================
    */
    if (
        /\bAMERICAN\s+EXPRESS\b/.test(nombre) ||
        /\bAMERICA\b/.test(nombre) ||
        /\bAMEX\b/.test(nombre)
    ){

        return ENTES_RECAUDADORES.AMERICAN_EXPRESS;
    }

    if (/\bMAESTRO\b/.test(texto)){
            return ENTES_RECAUDADORES.MAESTRO;
        }


if (
    /\bMAESTRO\b/.test(nombre)
) {
    return ENTES_RECAUDADORES.MAESTRO;
}


    /**
     * ==============================
     * VISA - FIRMA VISUAL
     * ==============================
     */
    const tieneFirmaVisa =
        firmasVisuales.some(
            firma =>
                firma.hash &&
                HASHES_ENTES.VISA.includes(
                    firma.hash
                )
        );


    if (
        tieneFirmaVisa
    ) {

        return ENTES_RECAUDADORES.VISA;
    }


    /**
     * ==============================
     * MASTERCARD - FIRMA VISUAL
     * ==============================
     */
    const tieneFirmaMastercard =
        firmasVisuales.some(
            firma =>
                firma.hash &&
                HASHES_ENTES.MASTERCARD.includes(
                    firma.hash
                )
        );


    if (
        tieneFirmaMastercard
    ) {

        return ENTES_RECAUDADORES.MASTERCARD;
    }



    const tieneFirmaAmericanExpress =
    firmasVisuales.some(
        firma =>
            firma.hash &&
            HASHES_ENTES.AMERICAN_EXPRESS.includes(
                firma.hash
            )
    );


if (
    tieneFirmaAmericanExpress
) {
    return ENTES_RECAUDADORES.AMERICAN_EXPRESS;
}


/**
    * ==============================
    * MAESTRO - FIRMA VISUAL
    * ==============================
    */
    const tieneFirmaMaestro =
        firmasVisuales.some(
        firma =>
            firma.hash &&
            HASHES_ENTES.MAESTRO.includes(
                firma.hash
            )
    );


    if (
        tieneFirmaMaestro
    ){
        return ENTES_RECAUDADORES.MAESTRO;
    }


    /**
     * Si no encontramos una señal
     * confiable, no inventamos el ente.
     */
    return ENTES_RECAUDADORES.DESCONOCIDO;
}

    




module.exports = {
    ENTES_RECAUDADORES,
    detectarEnteRecaudador
};