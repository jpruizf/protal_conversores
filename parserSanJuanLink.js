/**
 * parserSanJuanLink.js
 *
 * Lee el Resumen de Liquidación de San Juan Link.
 *
 * Funciones principales:
 * - Detecta el formato PAGOS LINK.
 * - Extrae fecha.
 * - Extrae código y nombre del ente.
 * - Extrae entidad adherente.
 * - Lee el detalle por banco emisor.
 * - Extrae fila de totales.
 * - Extrae las dos deducciones de BANCO ADHERENTE.
 * - Extrae TOTAL NETO.
 * - Realiza controles matemáticos.
 */


/* ============================================================
   CONVERSIÓN DE IMPORTES
============================================================ */

function convertirNumeroArgentino(valor) {
    if (valor === null || valor === undefined) {
        return 0;
    }

    let texto = String(valor).trim();

    if (!texto) {
        return 0;
    }

    const esNegativo =
        texto.endsWith("-") ||
        texto.startsWith("-") ||
        texto.startsWith("(");

    texto = texto
        .replace(/[()]/g, "")
        .replace(/-/g, "")
        .replace(/\$/g, "")
        .replace(/\s/g, "")
        .replace(/\./g, "")
        .replace(",", ".");

    const numero = Number.parseFloat(texto);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return esNegativo
        ? -numero
        : numero;
}


/* ============================================================
   NORMALIZACIÓN
============================================================ */

function normalizarContenido(contenidoTXT) {
    return String(contenidoTXT || "")
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .replace(/\u001a/g, "")
        .replace(/\u0000/g, "");
}


/* ============================================================
   VALIDACIÓN DE FORMATO
============================================================ */

function esInformeSanJuanLink(contenido) {
    const texto =
        String(contenido || "").toUpperCase();

    return (
        texto.includes("PAGOS LINK") &&
        texto.includes("CODIGO DE ENTE") &&
        texto.includes("ENTIDAD ADHERENTE") &&
        texto.includes("BANCO EMISOR")
    );
}


/* ============================================================
   CABECERA
============================================================ */

function extraerCabecera(contenido) {
    const fechaMatch =
        contenido.match(
            /PAGOS\s+LINK[\s\S]{0,100}?FECHA\s*:\s*(\d{2}\/\d{2}\/\d{4})/i
        );

    const enteMatch =
        contenido.match(
            /Codigo\s+de\s+Ente:\s*([^\n]+)/i
        );

    const entidadMatch =
        contenido.match(
            /Entidad\s+Adherente:\s*([^\n]+)/i
        );

    let codigoEnte = "";
    let nombreEnte = "";

    if (enteMatch) {
        const texto =
            enteMatch[1].trim();

        const partes =
            texto.match(
                /^([A-Z0-9]+)\s*-\s*(.+)$/i
            );

        if (partes) {
            codigoEnte =
                partes[1].trim();

            nombreEnte =
                partes[2].trim();
        } else {
            nombreEnte = texto;
        }
    }

    let codigoEntidadAdherente = "";
    let entidadAdherente = "";

    if (entidadMatch) {
        const texto =
            entidadMatch[1].trim();

        const partes =
            texto.match(
                /^([A-Z0-9]+)\s*-\s*(.+)$/i
            );

        if (partes) {
            codigoEntidadAdherente =
                partes[1].trim();

            entidadAdherente =
                partes[2].trim();
        } else {
            entidadAdherente =
                texto;
        }
    }

    return {
        fecha:
            fechaMatch
                ? fechaMatch[1]
                : "",

        codigoEnte,
        nombreEnte,

        codigoEntidadAdherente,
        entidadAdherente
    };
}


/* ============================================================
   DETALLE DE BANCO
============================================================ */

/**
 * Ejemplo esperado:
 *
 * BCO DE LA NACION ARG 29 1.011.019,01 1.504,52 315,95
 * 0,00 0,00 0,00 0,00 1.009.198,54
 *
 * Se detecta desde el final de la línea para evitar depender
 * del largo del nombre del banco.
 */
function extraerDetalleBanco(linea) {
    const expresion =
        /^\s*(.+?)\s+(\d+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/;

    const coincidencia =
        linea.match(expresion);

    if (!coincidencia) {
        return null;
    }

    const bancoEmisor =
        coincidencia[1]
            .trim()
            .replace(/\s+/g, " ");

    /*
     * Evitar que la fila TOTAL se trate como banco.
     */
    if (
        /^T\s*O\s*T\s*A\s*L\s*E\s*S$/i.test(
            bancoEmisor.replace(/\s+/g, "")
        ) ||
        /TOTAL/i.test(bancoEmisor)
    ) {
        return null;
    }

    return {
        bancoEmisor,

        cantidad:
            Number.parseInt(
                coincidencia[2],
                10
            ) || 0,

        importeCobrar:
            convertirNumeroArgentino(
                coincidencia[3]
            ),

        comisionesPagadas:
            convertirNumeroArgentino(
                coincidencia[4]
            ),

        comisionesIVA:
            convertirNumeroArgentino(
                coincidencia[5]
            ),

        percepcionIVA:
            convertirNumeroArgentino(
                coincidencia[6]
            ),

        retencionIVA:
            convertirNumeroArgentino(
                coincidencia[7]
            ),

        retencionGanancias:
            convertirNumeroArgentino(
                coincidencia[8]
            ),

        retencionIIBB:
            convertirNumeroArgentino(
                coincidencia[9]
            ),

        importeNetoCobrar:
            convertirNumeroArgentino(
                coincidencia[10]
            )
    };
}


/* ============================================================
   FILA DE TOTALES
============================================================ */

function extraerTotales(linea) {
    /*
     * La palabra TOTALES puede venir con espacios:
     *
     * T O T A L E S
     */
    const expresion =
        /^\s*T\s*O\s*T\s*A\s*L\s*E\s*S\s+(\d+)\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/i;

    const coincidencia =
        linea.match(expresion);

    if (!coincidencia) {
        return null;
    }

    return {
        cantidad:
            Number.parseInt(
                coincidencia[1],
                10
            ) || 0,

        importeCobrar:
            convertirNumeroArgentino(
                coincidencia[2]
            ),

        comisionesPagadas:
            convertirNumeroArgentino(
                coincidencia[3]
            ),

        comisionesIVA:
            convertirNumeroArgentino(
                coincidencia[4]
            ),

        percepcionIVA:
            convertirNumeroArgentino(
                coincidencia[5]
            ),

        retencionIVA:
            convertirNumeroArgentino(
                coincidencia[6]
            ),

        retencionGanancias:
            convertirNumeroArgentino(
                coincidencia[7]
            ),

        retencionIIBB:
            convertirNumeroArgentino(
                coincidencia[8]
            ),

        importeNetoCobrar:
            convertirNumeroArgentino(
                coincidencia[9]
            )
    };
}


/* ============================================================
   BANCO ADHERENTE
============================================================ */

function extraerBancoAdherente(linea) {
    const coincidencia =
        linea.match(
            /^\s*BANCO\s+ADHERENTE\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/i
        );

    if (!coincidencia) {
        return null;
    }

    return {
        comisionRetencionBancoSanJuan:
            convertirNumeroArgentino(
                coincidencia[1]
            ),

        comisionImportesNetosIVA:
            convertirNumeroArgentino(
                coincidencia[2]
            )
    };
}


/* ============================================================
   TOTAL NETO
============================================================ */

function extraerTotalNeto(linea) {
    const coincidencia =
        linea.match(
            /^\s*TOTAL\s+NETO\s+([\d.]+,\d{2})\s*$/i
        );

    if (!coincidencia) {
        return null;
    }

    return convertirNumeroArgentino(
        coincidencia[1]
    );
}


/* ============================================================
   REDONDEO
============================================================ */

function redondear(valor) {
    return Number(
        Number(valor || 0)
            .toFixed(2)
    );
}


/* ============================================================
   PROCESAMIENTO PRINCIPAL
============================================================ */

function procesarSanJuanLink(contenidoTXT) {
    const contenido =
        normalizarContenido(
            contenidoTXT
        );

    if (!contenido.trim()) {
        throw new Error(
            "El informe San Juan Link está vacío."
        );
    }

    if (
        !esInformeSanJuanLink(
            contenido
        )
    ) {
        throw new Error(
            "El archivo no corresponde al formato San Juan Link."
        );
    }

    const cabecera =
        extraerCabecera(
            contenido
        );

    const lineas =
        contenido.split("\n");

    const detalles = [];

    let totales = null;

    let bancoAdherente = null;

    let totalNeto = null;

    for (
        let indice = 0;
        indice < lineas.length;
        indice++
    ) {
        const linea =
            lineas[indice];

        /*
         * TOTAL GENERAL
         */
        const filaTotales =
            extraerTotales(
                linea
            );

        if (filaTotales) {
            totales =
                filaTotales;

            continue;
        }

        /*
         * BANCO ADHERENTE
         */
        const cierreBanco =
            extraerBancoAdherente(
                linea
            );

        if (cierreBanco) {
            bancoAdherente =
                cierreBanco;

            continue;
        }

        /*
         * TOTAL NETO
         */
        const totalNetoDetectado =
            extraerTotalNeto(
                linea
            );

        if (
            totalNetoDetectado !== null
        ) {
            totalNeto =
                totalNetoDetectado;

            continue;
        }

        /*
         * DETALLE DE BANCO
         */
        const detalle =
            extraerDetalleBanco(
                linea
            );

        if (detalle) {
            detalles.push(
                detalle
            );
        }
    }


    /* ========================================================
       VALIDACIONES
    ======================================================== */

    if (
        detalles.length === 0
    ) {
        throw new Error(
            "No se encontraron registros de bancos emisores en el informe San Juan Link."
        );
    }

    if (!totales) {
        throw new Error(
            "No se encontró la fila TOTALES del informe San Juan Link."
        );
    }

    if (!bancoAdherente) {
        throw new Error(
            "No se encontró la línea BANCO ADHERENTE."
        );
    }

    if (
        totalNeto === null
    ) {
        throw new Error(
            "No se encontró el TOTAL NETO del informe."
        );
    }


    /* ========================================================
       TOTALES CALCULADOS DESDE DETALLE
    ======================================================== */

    const calculados =
        detalles.reduce(
            (
                acumulado,
                detalle
            ) => {
                acumulado.cantidad +=
                    detalle.cantidad;

                acumulado.importeCobrar +=
                    detalle.importeCobrar;

                acumulado.comisionesPagadas +=
                    detalle.comisionesPagadas;

                acumulado.comisionesIVA +=
                    detalle.comisionesIVA;

                acumulado.percepcionIVA +=
                    detalle.percepcionIVA;

                acumulado.retencionIVA +=
                    detalle.retencionIVA;

                acumulado.retencionGanancias +=
                    detalle.retencionGanancias;

                acumulado.retencionIIBB +=
                    detalle.retencionIIBB;

                acumulado.importeNetoCobrar +=
                    detalle.importeNetoCobrar;

                return acumulado;
            },
            {
                cantidad: 0,
                importeCobrar: 0,
                comisionesPagadas: 0,
                comisionesIVA: 0,
                percepcionIVA: 0,
                retencionIVA: 0,
                retencionGanancias: 0,
                retencionIIBB: 0,
                importeNetoCobrar: 0
            }
        );


    /* ========================================================
       CIERRE
    ======================================================== */

    const totalDeduccionesBancoAdherente =
        bancoAdherente
            .comisionRetencionBancoSanJuan +
        bancoAdherente
            .comisionImportesNetosIVA;

    const totalNetoCalculado =
        totales.importeNetoCobrar -
        totalDeduccionesBancoAdherente;

    const diferenciaTotalNeto =
        redondear(
            totalNetoCalculado -
            totalNeto
        );


    /* ========================================================
       DIFERENCIAS ENTRE DETALLE Y FILA TOTAL
    ======================================================== */

    const diferenciaCantidad =
        calculados.cantidad -
        totales.cantidad;

    const diferenciaImporteCobrar =
        redondear(
            calculados.importeCobrar -
            totales.importeCobrar
        );

    const diferenciaComisionesPagadas =
        redondear(
            calculados.comisionesPagadas -
            totales.comisionesPagadas
        );

    const diferenciaComisionesIVA =
        redondear(
            calculados.comisionesIVA -
            totales.comisionesIVA
        );

    const diferenciaImporteNeto =
        redondear(
            calculados.importeNetoCobrar -
            totales.importeNetoCobrar
        );


    /* ========================================================
       RESULTADO
    ======================================================== */

    return {
        tipo:
            "SAN_JUAN_LINK",

        cabecera,

        detalles,

        totales: {
            cantidad:
                totales.cantidad,

            importeCobrar:
                redondear(
                    totales.importeCobrar
                ),

            comisionesPagadas:
                redondear(
                    totales.comisionesPagadas
                ),

            comisionesIVA:
                redondear(
                    totales.comisionesIVA
                ),

            percepcionIVA:
                redondear(
                    totales.percepcionIVA
                ),

            retencionIVA:
                redondear(
                    totales.retencionIVA
                ),

            retencionGanancias:
                redondear(
                    totales.retencionGanancias
                ),

            retencionIIBB:
                redondear(
                    totales.retencionIIBB
                ),

            importeNetoCobrar:
                redondear(
                    totales.importeNetoCobrar
                )
        },

        cierre: {
            comisionRetencionBancoSanJuan:
                redondear(
                    bancoAdherente
                        .comisionRetencionBancoSanJuan
                ),

            comisionImportesNetosIVA:
                redondear(
                    bancoAdherente
                        .comisionImportesNetosIVA
                ),

            totalDeduccionesBancoAdherente:
                redondear(
                    totalDeduccionesBancoAdherente
                ),

            totalNeto:
                redondear(
                    totalNeto
                )
        },

        controles: {
            totalCantidadCalculada:
                calculados.cantidad,

            totalImporteCobrarCalculado:
                redondear(
                    calculados.importeCobrar
                ),

            totalComisionesPagadasCalculado:
                redondear(
                    calculados.comisionesPagadas
                ),

            totalComisionesIVACalculado:
                redondear(
                    calculados.comisionesIVA
                ),

            totalImporteNetoCalculadoDetalle:
                redondear(
                    calculados.importeNetoCobrar
                ),

            diferenciaCantidad,

            diferenciaImporteCobrar,

            diferenciaComisionesPagadas,

            diferenciaComisionesIVA,

            diferenciaImporteNeto,

            detalleCoincide:
                diferenciaCantidad === 0 &&
                Math.abs(
                    diferenciaImporteCobrar
                ) < 0.01 &&
                Math.abs(
                    diferenciaComisionesPagadas
                ) < 0.01 &&
                Math.abs(
                    diferenciaComisionesIVA
                ) < 0.01 &&
                Math.abs(
                    diferenciaImporteNeto
                ) < 0.01,

            totalNetoCalculado:
                redondear(
                    totalNetoCalculado
                ),

            diferenciaTotalNeto,

            totalNetoCoincide:
                Math.abs(
                    diferenciaTotalNeto
                ) < 0.01
        }
    };
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    procesarSanJuanLink,
    convertirNumeroArgentino,
    esInformeSanJuanLink
};