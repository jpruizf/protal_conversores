const TIPOS_TARJETA = {
    CREDITO: "CREDITO",
    DEBITO: "DEBITO",
    DESCONOCIDO: "DESCONOCIDO"
};


/**
 * Normaliza texto para facilitar la detección.
 */
function normalizarTexto(texto) {
    return String(texto || "")
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}


/**
 * Detecta si el resumen corresponde
 * a tarjeta de crédito o débito.
 *
 * @param {String} contenidoPDF
 * @returns {String}
 */
function detectarTipoTarjeta(contenidoPDF) {
    const texto = normalizarTexto(contenidoPDF);

    if (
        texto.includes(
            "TARJETA DE CREDITO PESOS"
        )
    ) {
        return TIPOS_TARJETA.CREDITO;
    }

    if (
        texto.includes(
            "TARJETA DE DEBITO PESOS"
        )
    ) {
        return TIPOS_TARJETA.DEBITO;
    }

    return TIPOS_TARJETA.DESCONOCIDO;
}


module.exports = {
    TIPOS_TARJETA,
    detectarTipoTarjeta
};