// servicios/normalizadores/importe.js

/**
 * Convierte un importe extraído del PDF a número.
 *
 * Soporta ejemplos como:
 * "2,231,700.61"  -> 2231700.61
 * "46,865.71-"    -> -46865.71
 * "-1,524.65"     -> -1524.65
 * "$ 4.497,17"    -> 4497.17
 * "4497.17"       -> 4497.17
 *
 * @param {string|number|null|undefined} valor
 * @returns {number}
 */
function convertirImporte(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return 0;
    }

    if (typeof valor === "number") {
        if (!Number.isFinite(valor)) {
            throw new Error(
                `Importe inválido encontrado: ${valor}`
            );
        }

        return valor;
    }

    let texto = String(valor).trim();

    if (!texto) {
        return 0;
    }

    const esNegativo =
        texto.startsWith("-") ||
        texto.endsWith("-");

    texto = texto
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .replace(/-/g, "");

    /*
     * Detectamos formato:
     *
     * 1.234,56  -> formato argentino
     * 1,234.56  -> formato internacional
     * 4497.17   -> decimal con punto
     * 4497,17   -> decimal con coma
     */
    const tienePunto = texto.includes(".");
    const tieneComa = texto.includes(",");

    if (tienePunto && tieneComa) {
        const ultimaComa = texto.lastIndexOf(",");
        const ultimoPunto = texto.lastIndexOf(".");

        if (ultimaComa > ultimoPunto) {
            // Ejemplo: 1.234.567,89
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");
        } else {
            // Ejemplo: 1,234,567.89
            texto = texto.replace(/,/g, "");
        }
    } else if (tieneComa && !tienePunto) {
        /*
         * Si hay una sola coma y dos dígitos después,
         * la consideramos separador decimal.
         */
        const partes = texto.split(",");

        if (
            partes.length === 2 &&
            partes[1].length <= 2
        ) {
            texto = texto.replace(",", ".");
        } else {
            texto = texto.replace(/,/g, "");
        }
    }

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `Importe inválido encontrado: ${valor}`
        );
    }

    return esNegativo
        ? -numero
        : numero;
}


/**
 * Redondea un importe a dos decimales.
 *
 * @param {number} valor
 * @returns {number}
 */
function redondearImporte(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return Number(numero.toFixed(2));
}


/**
 * Suma una lista de importes y devuelve
 * el resultado redondeado a 2 decimales.
 *
 * @param {number[]} valores
 * @returns {number}
 */
function sumarImportes(valores = []) {
    if (!Array.isArray(valores)) {
        throw new Error(
            "sumarImportes esperaba un arreglo."
        );
    }

    const total = valores.reduce(
        (acumulado, valor) => {
            const numero = Number(valor);

            return acumulado +
                (
                    Number.isFinite(numero)
                        ? numero
                        : 0
                );
        },
        0
    );

    return redondearImporte(total);
}


/**
 * Calcula la diferencia entre dos importes.
 *
 * @param {number} calculado
 * @param {number} informado
 * @returns {number}
 */
function calcularDiferencia(
    calculado,
    informado
) {
    return redondearImporte(
        Number(calculado || 0) -
        Number(informado || 0)
    );
}


/**
 * Devuelve CORRECTO o REVISAR según
 * la diferencia esté dentro de la tolerancia.
 *
 * @param {number} diferencia
 * @param {number} tolerancia
 * @returns {"CORRECTO"|"REVISAR"}
 */
function controlarDiferencia(
    diferencia,
    tolerancia = 0.01
) {
    return Math.abs(diferencia) <= tolerancia
        ? "CORRECTO"
        : "REVISAR";
}


module.exports = {
    convertirImporte,
    redondearImporte,
    sumarImportes,
    calcularDiferencia,
    controlarDiferencia
};