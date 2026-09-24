/**
 * detectorLiquidacion.js
 *
 * Detecta automáticamente el tipo de informe de liquidación
 * a partir del contenido TXT.
 *
 * Tipos soportados:
 * - PAGO_FACIL
 * - SAN_JUAN_LINK
 * - DESCONOCIDO
 */


/* ============================================================
   TIPOS DE INFORME
============================================================ */

const TIPOS_INFORME = Object.freeze({
    PAGO_FACIL: "PAGO_FACIL",
    SAN_JUAN_LINK: "SAN_JUAN_LINK",
    DESCONOCIDO: "DESCONOCIDO"
});


/* ============================================================
   NORMALIZACIÓN
============================================================ */

/**
 * Normaliza el contenido únicamente para detección.
 *
 * No modifica el TXT original que luego será enviado
 * al parser correspondiente.
 */
function normalizarParaDeteccion(contenidoTXT) {
    return String(contenidoTXT || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u001a/g, "")
        .replace(/\u0000/g, "")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ")
        .toUpperCase()
        .trim();
}


/* ============================================================
   DETECCIÓN SAN JUAN LINK
============================================================ */

/**
 * Identifica informes similares a:
 *
 * PAGOS LINK
 * Codigo de Ente:
 * Entidad Adherente:
 * BANCO EMISOR
 * TOTAL NETO
 */
function esSanJuanLink(contenidoNormalizado) {
    if (!contenidoNormalizado) {
        return false;
    }

    const tienePagosLink =
        contenidoNormalizado.includes(
            "PAGOS LINK"
        );

    const tieneCodigoEnte =
        contenidoNormalizado.includes(
            "CODIGO DE ENTE"
        );

    const tieneEntidadAdherente =
        contenidoNormalizado.includes(
            "ENTIDAD ADHERENTE"
        );

    const tieneBancoEmisor =
        contenidoNormalizado.includes(
            "BANCO EMISOR"
        );

    const tieneTotalNeto =
        contenidoNormalizado.includes(
            "TOTAL NETO"
        );

    return (
        tienePagosLink &&
        tieneCodigoEnte &&
        tieneEntidadAdherente &&
        tieneBancoEmisor &&
        tieneTotalNeto
    );
}


/* ============================================================
   DETECCIÓN PAGO FÁCIL
============================================================ */

/**
 * Identifica el informe actualmente procesado por
 * parserService.js.
 *
 * Marcadores característicos:
 *
 * Informe de Transferencia de Fondos
 * SERVICIO ELECTRONICO DE PAGO SA
 * Pagador nro.
 * Total a depositar
 *
 * Adicionalmente puede contener registros:
 * PX ... BRUTO
 */
function esPagoFacil(contenidoNormalizado) {
    if (!contenidoNormalizado) {
        return false;
    }

    const tieneTransferenciaFondos =
        contenidoNormalizado.includes(
            "INFORME DE TRANSFERENCIA DE FONDOS"
        );

    const tieneServicioElectronico =
        contenidoNormalizado.includes(
            "SERVICIO ELECTRONICO DE PAGO"
        );

    const tienePagador =
        contenidoNormalizado.includes(
            "PAGADOR NRO."
        );

    const tieneTotalDepositar =
        contenidoNormalizado.includes(
            "TOTAL A DEPOSITAR"
        );

    /*
     * Este patrón ayuda a confirmar que se trata
     * del informe con registros PX BRUTO.
     */
    const tienePxBruto =
        /\bPX\s+\d{2}\s+(CYBA|INTE)\s+BRUTO\b/i
            .test(
                contenidoNormalizado
            );

    return (
        tieneTransferenciaFondos &&
        tieneServicioElectronico &&
        tienePagador &&
        (
            tieneTotalDepositar ||
            tienePxBruto
        )
    );
}


/* ============================================================
   DETECCIÓN PRINCIPAL
============================================================ */

function detectarTipoLiquidacion(contenidoTXT) {
    if (
        contenidoTXT === null ||
        contenidoTXT === undefined
    ) {
        return TIPOS_INFORME.DESCONOCIDO;
    }

    const contenidoOriginal =
        String(contenidoTXT);

    if (!contenidoOriginal.trim()) {
        return TIPOS_INFORME.DESCONOCIDO;
    }

    const contenido =
        normalizarParaDeteccion(
            contenidoOriginal
        );

    /*
     * Primero se comprueba San Juan Link
     * porque posee marcadores muy específicos.
     */
    if (
        esSanJuanLink(
            contenido
        )
    ) {
        return TIPOS_INFORME.SAN_JUAN_LINK;
    }

    /*
     * Luego el informe de Pago Fácil.
     */
    if (
        esPagoFacil(
            contenido
        )
    ) {
        return TIPOS_INFORME.PAGO_FACIL;
    }

    /*
     * No reconocido.
     */
    return TIPOS_INFORME.DESCONOCIDO;
}


/* ============================================================
   INFORMACIÓN DE DIAGNÓSTICO
============================================================ */

/**
 * Opcional.
 *
 * Resulta útil durante pruebas y logs porque informa qué
 * marcadores se encontraron sin alterar la detección principal.
 */
function obtenerDiagnosticoDeteccion(
    contenidoTXT
) {
    const contenido =
        normalizarParaDeteccion(
            contenidoTXT
        );

    const tipo =
        detectarTipoLiquidacion(
            contenidoTXT
        );

    return {
        tipo,

        sanJuanLink: {
            pagosLink:
                contenido.includes(
                    "PAGOS LINK"
                ),

            codigoEnte:
                contenido.includes(
                    "CODIGO DE ENTE"
                ),

            entidadAdherente:
                contenido.includes(
                    "ENTIDAD ADHERENTE"
                ),

            bancoEmisor:
                contenido.includes(
                    "BANCO EMISOR"
                ),

            totalNeto:
                contenido.includes(
                    "TOTAL NETO"
                )
        },

        pagoFacil: {
            transferenciaFondos:
                contenido.includes(
                    "INFORME DE TRANSFERENCIA DE FONDOS"
                ),

            servicioElectronico:
                contenido.includes(
                    "SERVICIO ELECTRONICO DE PAGO"
                ),

            pagador:
                contenido.includes(
                    "PAGADOR NRO."
                ),

            totalDepositar:
                contenido.includes(
                    "TOTAL A DEPOSITAR"
                ),

            pxBruto:
                /\bPX\s+\d{2}\s+(CYBA|INTE)\s+BRUTO\b/i
                    .test(
                        contenido
                    )
        }
    };
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    TIPOS_INFORME,

    detectarTipoLiquidacion,

    obtenerDiagnosticoDeteccion,

    esSanJuanLink,

    esPagoFacil
};