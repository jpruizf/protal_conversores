/**
 * Convierte un importe argentino a Number.
 *
 * Ejemplos:
 * "257.500,00" -> 257500
 * "2.575,00"   -> 2575
 * "77,25"      -> 77.25
 */
function convertirImporte(valor) {
    if (valor === undefined || valor === null) {
        return 0;
    }

    const texto = String(valor)
        .trim()
        .replace(/\./g, "")
        .replace(",", ".");

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `Importe inválido encontrado: ${valor}`
        );
    }

    return numero;
}


/**
 * Extrae un importe asociado a un concepto
 * dentro de un bloque de liquidación.
 *
 * @param {String} bloque
 * @param {RegExp} patron
 * @param {Boolean} opcional
 * @returns {Number|null}
 */
function extraerImporte(
    bloque,
    patron,
    opcional = false,
    nombreCampo= "DESCONOCIDO"
) {
    const coincidencia =
        bloque.match(patron);

    if (!coincidencia) {
        if (opcional) {
            return null;
        }

        throw new Error(
            `No se encontró un campo obligatorio: ${nombreCampo}.`
        );
    }

    return convertirImporte(
        coincidencia[1]
    );
}


/**
 * Extrae todas las liquidaciones encontradas
 * en el texto completo del PDF.
 *
 * Cada bloque comienza en:
 * + VENTAS C/DESCUENTO CONTADO
 *
 * y termina en:
 * IMPORTE NETO DE PAGOS
 *
 * @param {String} contenidoPDF
 * @returns {Array}
 */
function parsearLiquidacionesTarjetas(
    contenidoPDF
) {
    if (
        !contenidoPDF ||
        typeof contenidoPDF !== "string"
    ) {
        throw new Error(
            "El contenido del PDF es inválido."
        );
    }

    const texto = contenidoPDF
        .replace(/\r/g, "")
        .replace(/\u00a0/g, " ");

    /*
     * Busca cada bloque de liquidación.
     *
     * [\s\S]*? permite abarcar múltiples líneas
     * sin avanzar hasta la siguiente liquidación.
     */
    const patronBloque =
    /VENTAS\s+C\s*\/\s*DESCUENTO\s+CONTADO[\s\S]*?IMPORTE\s+NETO\s+DE\s+PAGOS\s*\$?\s*[\d.]+,\d{2}/gi;
    
    const bloques =
        texto.match(patronBloque) || [];

    if (bloques.length === 0) {
        throw new Error(
            "No se encontraron liquidaciones de tarjetas en el PDF."
        );
    }

    const resultados = [];

    bloques.forEach(
        (bloque, indice) => {
            try {
                    const ventasDescuentoContado =
                        extraerImporte(
                            bloque, /VENTAS\s+C\s*\/\s*DESCUENTO\s+CONTADO\s*\+\s*\$\s*([\d.]+,\d{2})/i,
                            false,
                            "VENTAS C/DESCUENTO CONTADO"
                    );

                    const arancel =
                        extraerImporte(
                            bloque,
                            /ARANCEL\s*-\s*\$\s*([\d.]+,\d{2})/i
                    );

                    const ivaArancel =
                        extraerImporte(
                            bloque,
                            /IVA\s+CRED\.?\s*FISC\.?\s*COMERCIO\s+S\s*\/\s*ARANC\s+21,00\s*%\s*-\s*\$\s*([\d.]+,\d{2})/i,
                            false,
                            "ARANCEL"
                    );

                    const retencionSirtac =
                        extraerImporte(
                            bloque,
                            /RETENCION\s+ING\.?\s*BRUTOS\s+SIRTAC\s*-\s*\$\s*([\d.]+,\d{2})/i,
                            false,
                            "RETENCION"
                    );

                    const percepcionIva =
                        extraerImporte(
                            bloque,
                            /PERCEPCION\s+IVA\s+R\.?\s*G\.?\s*2408\s+3,00\s*%\s*-\s*\$\s*([\d.]+,\d{2})/i,
                            true
                    );

                    const importeNetoPagos =
                    extraerImporte(
                        bloque,
                        /IMPORTE\s+NETO\s+DE\s+PAGOS\s*\$\s*([\d.]+,\d{2})/i
                    );

                resultados.push({
                    numeroLiquidacion:
                        indice + 1,

                    ventasDescuentoContado,

                    arancel,

                    ivaArancel,

                    retencionSirtac,

                    percepcionIva:
                        percepcionIva ?? 0,

                    importeNetoPagos
                });

            } catch (error) {
                throw new Error(
                    `Error en liquidación ${
                        indice + 1
                    }: ${error.message}`
                );
            }
        }
    );

    return resultados;
}


module.exports = {
    convertirImporte,
    parsearLiquidacionesTarjetas
};