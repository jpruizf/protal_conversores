// servicios/normalizadores/fecha.js

/**
 * Normaliza fechas al formato DD/MM/AAAA.
 *
 * Soporta:
 * 06/07/2026
 * 6/7/2026
 * 06/07/26
 *
 * @param {string|null|undefined} fecha
 * @returns {string}
 */
function normalizarFecha(fecha) {
    if (!fecha) {
        return "";
    }

    const texto = String(fecha).trim();

    const resultado = texto.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/
    );

    if (!resultado) {
        return texto;
    }

    let [, dia, mes, anio] = resultado;

    if (anio.length === 2) {
        anio = `20${anio}`;
    }

    return (
        `${dia.padStart(2, "0")}/` +
        `${mes.padStart(2, "0")}/` +
        `${anio}`
    );
}


/**
 * Convierte períodos tipo YYYY/MM.
 *
 * Ejemplo:
 * 2026/04 -> 04/2026
 *
 * @param {string} periodo
 * @returns {string}
 */
function normalizarPeriodoAnioMes(periodo) {
    if (!periodo) {
        return "";
    }

    const texto = String(periodo).trim();

    const resultado = texto.match(
        /^(\d{4})\/(\d{1,2})$/
    );

    if (!resultado) {
        return texto;
    }

    const [, anio, mes] = resultado;

    return `${mes.padStart(2, "0")}/${anio}`;
}


/**
 * Convierte períodos MM/AA o MM/AAAA
 * a MM/AAAA.
 *
 * Ejemplo:
 * 06/26 -> 06/2026
 *
 * @param {string} periodo
 * @returns {string}
 */
function normalizarPeriodoMesAnio(periodo) {
    if (!periodo) {
        return "";
    }

    const texto = String(periodo)
        .trim()
        .replace(/\s+/g, "");

    const resultado = texto.match(
        /^(\d{1,2})\/(\d{2,4})$/
    );

    if (!resultado) {
        return texto;
    }

    let [, mes, anio] = resultado;

    if (anio.length === 2) {
        anio = `20${anio}`;
    }

    return `${mes.padStart(2, "0")}/${anio}`;
}


/**
 * Comprueba que una fecha tenga estructura válida
 * DD/MM/AAAA.
 *
 * No intenta hacer validaciones de calendario
 * extremadamente estrictas, pero sí evita fechas
 * evidentemente imposibles.
 *
 * @param {string} fecha
 * @returns {boolean}
 */
function esFechaValida(fecha) {
    const normalizada = normalizarFecha(fecha);

    const resultado = normalizada.match(
        /^(\d{2})\/(\d{2})\/(\d{4})$/
    );

    if (!resultado) {
        return false;
    }

    const dia = Number(resultado[1]);
    const mes = Number(resultado[2]);
    const anio = Number(resultado[3]);

    if (
        dia < 1 ||
        dia > 31 ||
        mes < 1 ||
        mes > 12 ||
        anio < 2000
    ) {
        return false;
    }

    return true;
}


module.exports = {
    normalizarFecha,
    normalizarPeriodoAnioMes,
    normalizarPeriodoMesAnio,
    esFechaValida
};