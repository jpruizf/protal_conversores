/**
 * parserService.js
 *
 * Lee el Informe de Liquidación TXT de Pago Fácil.
 *
 * Funciones principales:
 * - Extrae los datos generales de la liquidación.
 * - Ignora cabeceras repetidas por cambio de página.
 * - Detecta las zonas CYBA e INTE.
 * - Mantiene activa la fecha de cada bloque diario.
 * - Detecta registros PX con concepto BRUTO.
 * - Detecta gastos bancarios, IVA, FEE e IVA de FEE.
 * - Consolida importes y cantidades por fecha.
 * - Calcula total de retenciones e importe neto.
 * - Extrae totales de zona, ajuste RT y total a depositar.
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

    return esNegativo ? -numero : numero;
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

function obtenerPrimeraCoincidencia(contenido, expresion) {
    const coincidencia = contenido.match(expresion);

    return coincidencia
        ? coincidencia[1].trim()
        : "";
}


/* ============================================================
   FECHAS
============================================================ */

function esFechaValida(fecha) {
    if (!fecha) {
        return false;
    }

    const coincidencia = fecha.match(
        /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/
    );

    if (!coincidencia) {
        return false;
    }

    const dia = Number(coincidencia[1]);
    const mes = Number(coincidencia[2]);

    return (
        dia >= 1 &&
        dia <= 31 &&
        mes >= 1 &&
        mes <= 12
    );
}

function obtenerClaveFecha(fecha) {
    const coincidencia = fecha.match(
        /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/
    );

    if (!coincidencia) {
        return fecha;
    }

    const dia = coincidencia[1];
    const mes = coincidencia[2];

    let anio = Number(coincidencia[3]);

    if (anio < 100) {
        anio += 2000;
    }

    return `${anio}-${mes}-${dia}`;
}

/**
 * IMPORTANTE:
 *
 * Esta función conserva la lógica del parser anterior.
 * Solo toma fechas ubicadas en:
 *
 * CYBA Capital y Gran Buenos Aires 25/06/26
 * INTE Interior del País          25/06/26
 * ---- -------------------------- 26/06/26
 *
 * No toma como fecha activa la fecha general de pago
 * ubicada en la cabecera del informe.
 */
function detectarFechaDeBloque(linea) {
    const esEncabezadoZona =
        /^\s*(CYBA|INTE)\b/i.test(linea);

    const esSeparadorFecha =
        /^\s*-{4}\s+/i.test(linea);

    if (!esEncabezadoZona && !esSeparadorFecha) {
        return "";
    }

    const coincidencia = linea.match(
        /(\d{2}\/\d{2}\/(?:\d{2}|\d{4}))/
    );

    if (!coincidencia) {
        return "";
    }

    const fecha = coincidencia[1];

    return esFechaValida(fecha)
        ? fecha
        : "";
}


/* ============================================================
   ZONAS
============================================================ */

function detectarZona(linea) {
    const coincidencia = linea.match(
        /^\s*(CYBA|INTE)\b/i
    );

    return coincidencia
        ? coincidencia[1].toUpperCase()
        : "";
}


/* ============================================================
   REGISTROS BRUTOS
============================================================ */

function extraerRegistroBruto(linea) {

    const expresion =
        /^\s*PX\s+(?:\d{1,2}\s+)?(CYBA|INTE)\s+BRUTO\s+(\d+)\s+(\d{3})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/i;

    const coincidencia = linea.match(expresion);

    if (!coincidencia) {
        return null;
    }

    return {
        tipo: "PX",

        zona:
            coincidencia[1].toUpperCase(),

        concepto:
            "BRUTO",

        numeroDocumento:
            coincidencia[2],

        secuencia:
            coincidencia[3],

        cantidadTransacciones:
            convertirNumeroArgentino(
                coincidencia[4]
            ),

        importeBruto:
            convertirNumeroArgentino(
                coincidencia[5]
            ),
    };
}


/* ============================================================
   RETENCIONES
============================================================ */

/**
 * Detecta registros como:
 *
 * GC 02 CYBA GASTOS BANCARIOS 99309537 001 3.002,23-
 * GC 02 CYBA IVA              99309538 001   630,47-
 * P0 02 CYBA FEE              22927747 001 31.523,40-
 * P0 02 CYBA IVA              22927748 001  6.619,91-
 *
 * También funciona para INTE.
 */
function extraerRegistroRetencion(linea) {
    const expresion =
        /^\s*(GC|P0)\s+(?:\d{1,2}\s+)?(CYBA|INTE)\s+(.+?)\s+(\d+)\s+(\d{3})\s+([\d.]+,\d{2}-?)\s*$/i;

    const coincidencia = linea.match(expresion);

    if (!coincidencia) {
        return null;
    }

    const tipo =
        coincidencia[1].toUpperCase();

    const zona =
        coincidencia[2].toUpperCase();

    const concepto = coincidencia[3]
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();

    let campo = "";

    if (
        tipo === "GC" &&
        concepto === "GASTOS BANCARIOS"
    ) {
        campo = "gastosBancarios";
    } else if (
        tipo === "GC" &&
        concepto === "IVA"
    ) {
        campo = "ivaGastosBancarios";
    } else if (
        tipo === "P0" &&
        concepto === "FEE"
    ) {
        campo = "fee";
    } else if (
        tipo === "P0" &&
        concepto === "IVA"
    ) {
        campo = "ivaFee";
    }

    if (!campo) {
        return null;
    }

    return {
        tipo,
        zona,
        concepto,
        campo,

        numeroDocumento:
            coincidencia[4],

        secuencia:
            coincidencia[5],

        /*
         * En el TXT normalmente termina con "-".
         * Se guarda como valor positivo porque representa
         * una retención que luego se resta del bruto.
         */
        importe:
            Math.abs(
                convertirNumeroArgentino(
                    coincidencia[6]
                )
            ),
    };
}


/* ============================================================
   CIERRE
============================================================ */

function extraerTotalZona(linea) {
    const coincidencia = linea.match(
        /Total\s+de\s+la\s+zona\s+(CYBA|INTE)\s+([\d.]+,\d{2})\s*$/i
    );

    if (!coincidencia) {
        return null;
    }

    return {
        zona:
            coincidencia[1].toUpperCase(),

        importe:
            convertirNumeroArgentino(
                coincidencia[2]
            ),
    };
}

function extraerAjusteRT(linea) {
    const coincidencia = linea.match(
        /^\s*RT\b.*?([\d.]+,\d{2}-?)\s*$/i
    );

    if (!coincidencia) {
        return null;
    }

    return {
        concepto: "RT",

        importe:
            convertirNumeroArgentino(
                coincidencia[1]
            ),

        lineaOriginal:
            linea.trim(),
    };
}

/* ============================================================
   RETENCIÓN IB / SIRTAC
============================================================ */

function extraerRetencionIB(linea) {
    const coincidencia = linea.match(
        /^\s*\$B\s+Retencion\s+IB\s+SIRTAC\s+\d+\s+\d+\s+([\d.]+,\d{2}-?)\s*$/i
    );

    if (!coincidencia) {
        return null;
    }

    return {
        concepto: "RETENCION IB SIRTAC",

        importe:
            Math.abs(
                convertirNumeroArgentino(
                    coincidencia[1]
                )
            ),

        lineaOriginal:
            linea.trim(),
    };
}


function extraerTotalDepositar(linea) {
    const coincidencia = linea.match(
        /Total\s+a\s+depositar\s+([\d.]+,\d{2})\s*$/i
    );

    if (!coincidencia) {
        return null;
    }

    return convertirNumeroArgentino(
        coincidencia[1]
    );
}


/* ============================================================
   CABECERA
============================================================ */

function extraerCabecera(contenido) {
    const numeroOP =
        obtenerPrimeraCoincidencia(
            contenido,
            /Numero\s+OP\s+(\d+)/i
        );

    const documentoPago =
        obtenerPrimeraCoincidencia(
            contenido,
            /Nro\.\s*Doc\.\s*Pago\s+(\d+)/i
        );

    const fechaPago =
        obtenerPrimeraCoincidencia(
            contenido,
            /Fecha\s+pago\s+(\d{2}\/\d{2}\/(?:\d{2}|\d{4}))/i
        );

    const pagadorNumero =
        obtenerPrimeraCoincidencia(
            contenido,
            /Pagador\s+nro\.\s+(\d+)/i
        );

    const pagadorNombre =
        obtenerPrimeraCoincidencia(
            contenido,
            /Pagador\s+nro\.\s+\d+\s+([^\n]+?)(?=\s{3,}Nro\.\s*Doc\.\s*Pago|\n)/i
        );

    const cuit =
        obtenerPrimeraCoincidencia(
            contenido,
            /Pagador\s+nro\.[\s\S]*?CUIT\.\s*\.\s*([\d-]+)/i
        );

    const importeTexto =
        obtenerPrimeraCoincidencia(
            contenido,
            /Fecha\s+pago\s+\d{2}\/\d{2}\/(?:\d{2}|\d{4})[\s\S]{0,120}?Importe\s+([\d.]+,\d{2})/i
        );

    const medioPago =
        obtenerPrimeraCoincidencia(
            contenido,
            /Pagadero\s+en:\s*([^\n]+)/i
        );

    return {
        numeroOP,
        documentoPago,
        fechaPago,
        pagadorNumero,

        pagadorNombre:
            pagadorNombre.trim(),

        cuit,

        importeDepositado:
            convertirNumeroArgentino(
                importeTexto
            ),

        medioPago,
    };
}


/* ============================================================
   REGISTRO CONSOLIDADO
============================================================ */

function crearRegistroConsolidado(fecha) {
    return {
        fecha,

        cantidadTransacciones: 0,

        importeBruto: 0,

        gastosBancarios: 0,

        ivaGastosBancarios: 0,

        fee: 0,

        ivaFee: 0,

        totalRetenciones: 0,

        importeNeto: 0,
    };
}


/* ============================================================
   PROCESAMIENTO PRINCIPAL
============================================================ */

function procesarInformeLiquidacion(contenidoTXT) {
    const contenido =
        normalizarContenido(contenidoTXT);

    if (!contenido.trim()) {
        throw new Error(
            "El informe de liquidación está vacío."
        );
    }

     /*
     * Validar que sea un informe detallado.
     *
     * Los resúmenes de liquidación que contienen
     * únicamente movimientos RT no deben procesarse,
     * ya que podrían alterar los totales del Excel.
     */
    const contieneDetalleBruto =
    contenido
        .split("\n")
        .some(
            (linea) =>
                extraerRegistroBruto(linea) !== null
        );

    if (!contieneDetalleBruto) {
        throw new Error(
            "El archivo corresponde a un resumen de liquidación y no contiene detalle PX BRUTO."
    );
}

    const lineas =
        contenido.split("\n");

    const cabecera =
        extraerCabecera(contenido);

    const consolidadoPorFecha =
        new Map();

    const registrosOriginales = [];

    const cierre = {
        totalCYBA: 0,
        totalINTE: 0,
        ajusteRT: 0,
        retencionIB: 0,
        totalDepositar: 0,
    };

    let fechaActiva = "";
    let zonaActiva = "";

    for (
        let indice = 0;
        indice < lineas.length;
        indice++
    ) {
        const linea = lineas[indice];

        /*
         * Detectar zona.
         */
        const zonaDetectada =
            detectarZona(linea);

        if (zonaDetectada) {
            zonaActiva = zonaDetectada;
        }

        /*
         * Detectar fecha únicamente en encabezados
         * CYBA, INTE o separadores diarios.
         *
         * Esta parte evita tomar la fecha general
         * de pago como fecha de todos los movimientos.
         */
        const fechaDetectada =
            detectarFechaDeBloque(linea);

        if (fechaDetectada) {
            fechaActiva = fechaDetectada;
        }

        /*
         * Detectar retención.
         */
        const retencion =
            extraerRegistroRetencion(linea);

        if (retencion) {
            if (!fechaActiva) {
                throw new Error(
                    `Se encontró una retención sin fecha asociada en la línea ${
                        indice + 1
                    }.`
                );
            }

            if (
                !consolidadoPorFecha.has(
                    fechaActiva
                )
            ) {
                consolidadoPorFecha.set(
                    fechaActiva,
                    crearRegistroConsolidado(
                        fechaActiva
                    )
                );
            }

            const registroConsolidado =
                consolidadoPorFecha.get(
                    fechaActiva
                );

            registroConsolidado[
                retencion.campo
            ] += retencion.importe;

            registrosOriginales.push({
                fecha:
                    fechaActiva,

                zona:
                    retencion.zona ||
                    zonaActiva ||
                    "",

                tipo:
                    retencion.tipo,

                concepto:
                    retencion.concepto,

                numeroDocumento:
                    retencion.numeroDocumento,

                secuencia:
                    retencion.secuencia,

                importe:
                    retencion.importe,
            });

            continue;
        }

        /*
         * Detectar PX BRUTO.
         */
        const registroBruto =
            extraerRegistroBruto(linea);

        if (registroBruto) {
            if (!fechaActiva) {
                throw new Error(
                    `Se encontró un registro PX BRUTO sin fecha asociada en la línea ${
                        indice + 1
                    }.`
                );
            }

            const zonaRegistro =
                registroBruto.zona ||
                zonaActiva ||
                "";

            const registroCompleto = {
                fecha:
                    fechaActiva,

                zona:
                    zonaRegistro,

                tipo:
                    registroBruto.tipo,

                concepto:
                    registroBruto.concepto,

                numeroDocumento:
                    registroBruto.numeroDocumento,

                secuencia:
                    registroBruto.secuencia,

                cantidadTransacciones:
                    registroBruto
                        .cantidadTransacciones,

                importeBruto:
                    registroBruto
                        .importeBruto,
            };

            registrosOriginales.push(
                registroCompleto
            );

            if (
                !consolidadoPorFecha.has(
                    fechaActiva
                )
            ) {
                consolidadoPorFecha.set(
                    fechaActiva,
                    crearRegistroConsolidado(
                        fechaActiva
                    )
                );
            }

            const registroConsolidado =
                consolidadoPorFecha.get(
                    fechaActiva
                );

            registroConsolidado
                .cantidadTransacciones +=
                registroBruto
                    .cantidadTransacciones;

            registroConsolidado
                .importeBruto +=
                registroBruto
                    .importeBruto;

            continue;
        }

        /*
         * Detectar total de zona.
         */
        const totalZona =
            extraerTotalZona(linea);

        if (totalZona) {
            if (
                totalZona.zona === "CYBA"
            ) {
                cierre.totalCYBA =
                    totalZona.importe;
            }

            if (
                totalZona.zona === "INTE"
            ) {
                cierre.totalINTE =
                    totalZona.importe;
            }

            continue;
        }

        /*
         * Detectar ajuste RT.
         */
        
        const ajusteRT =
            extraerAjusteRT(linea);

        if (ajusteRT) {
            cierre.ajusteRT +=
                ajusteRT.importe;

            continue;
        }
    
    /*
    * Detectar Retención IB / SIRTAC.
    */
    const retencionIB =
    extraerRetencionIB(linea);

    if (retencionIB) {
        cierre.retencionIB +=
            retencionIB.importe;

        registrosOriginales.push({
            fecha: "",
            zona: "",
            tipo: "$B",
            concepto:
                retencionIB.concepto,
            importe:
                retencionIB.importe,
    });

    continue;
}

        /*
         * Detectar total final.
         */
        const totalDepositar =
            extraerTotalDepositar(linea);

        if (
            totalDepositar !== null
        ) {
            cierre.totalDepositar =
                totalDepositar;
        }
    }

    /*
     * Convertir Map en arreglo y calcular netos.
     */
    const detalles = Array.from(
        consolidadoPorFecha.values()
    )
        .map((detalle) => {
            const totalRetenciones =
                detalle.gastosBancarios +
                detalle.ivaGastosBancarios +
                detalle.fee +
                detalle.ivaFee;

            const importeNeto =
                detalle.importeBruto -
                totalRetenciones;

            return {
                fecha:
                    detalle.fecha,

                cantidadTransacciones:
                    Number(
                        detalle
                            .cantidadTransacciones
                            .toFixed(2)
                    ),

                importeBruto:
                    Number(
                        detalle
                            .importeBruto
                            .toFixed(2)
                    ),

                gastosBancarios:
                    Number(
                        detalle
                            .gastosBancarios
                            .toFixed(2)
                    ),

                ivaGastosBancarios:
                    Number(
                        detalle
                            .ivaGastosBancarios
                            .toFixed(2)
                    ),

                fee:
                    Number(
                        detalle.fee.toFixed(2)
                    ),

                ivaFee:
                    Number(
                        detalle.ivaFee.toFixed(2)
                    ),

                totalRetenciones:
                    Number(
                        totalRetenciones.toFixed(2)
                    ),

                importeNeto:
                    Number(
                        importeNeto.toFixed(2)
                    ),
            };
        })
        .filter((detalle) => {
            return (
                detalle.importeBruto !== 0 ||
                detalle.totalRetenciones !== 0
            );
        })
        .sort((a, b) => {
            return obtenerClaveFecha(a.fecha)
                .localeCompare(
                    obtenerClaveFecha(b.fecha)
                );
        });

    if (detalles.length === 0) {
        throw new Error(
            "Archivo no contiene registros PX BRUTO validos."
        );
    }

    /*
     * Totales del detalle.
     */
    const totalDetalle =
        detalles.reduce(
            (acumulado, detalle) => {
                acumulado
                    .cantidadTransacciones +=
                    detalle
                        .cantidadTransacciones;

                acumulado
                    .importeBruto +=
                    detalle.importeBruto;

                acumulado
                    .gastosBancarios +=
                    detalle.gastosBancarios;

                acumulado
                    .ivaGastosBancarios +=
                    detalle.ivaGastosBancarios;

                acumulado.fee +=
                    detalle.fee;

                acumulado.ivaFee +=
                    detalle.ivaFee;

                acumulado
                    .totalRetenciones +=
                    detalle.totalRetenciones;

                acumulado
                    .importeNeto +=
                    detalle.importeNeto;

                return acumulado;
            },
            {
                cantidadTransacciones: 0,
                importeBruto: 0,
                gastosBancarios: 0,
                ivaGastosBancarios: 0,
                fee: 0,
                ivaFee: 0,
                totalRetenciones: 0,
                importeNeto: 0,
            }
        );


    /*
        * Neto de liquidación.
        *
        * Replica la lógica del Control Pago:
        *
        * Bruto
        * - Gastos bancarios
        * - IVA gastos bancarios
        * - Fee
        * - IVA Fee
        * - Retención IB / SIRTAC
        *
        * El ajuste RT NO forma parte de este neto.
    */
    const importeNetoLiquidacion =
        totalDetalle.importeNeto -
        cierre.retencionIB;

    const totalCalculadoDepositar =
        cierre.totalCYBA +
        cierre.totalINTE +
        cierre.ajusteRT  -
        cierre.retencionIB;
    
    const importeNetoFinal =
    totalDetalle.importeNeto +
    cierre.ajusteRT -
    cierre.retencionIB;
    
    const diferenciaDeposito =
        Number(
            (
                totalCalculadoDepositar -
                cierre.totalDepositar
            ).toFixed(2)
        );

    return {
        cabecera,

        detalles,

        cierre: {
    totalCYBA:
        Number(
            cierre.totalCYBA.toFixed(2)
        ),

    totalINTE:
        Number(
            cierre.totalINTE.toFixed(2)
        ),

    ajusteRT:
        Number(
            cierre.ajusteRT.toFixed(2)
        ),

    retencionIB:
        Number(
            cierre.retencionIB.toFixed(2)
        ),

    totalDepositar:
        Number(
            cierre.totalDepositar.toFixed(2)
        ),
},

        controles: {
            totalCantidadTransacciones:
                Number(
                    totalDetalle
                        .cantidadTransacciones
                        .toFixed(2)
                ),

            totalImporteBruto:
                Number(
                    totalDetalle
                        .importeBruto
                        .toFixed(2)
                ),

            totalGastosBancarios:
                Number(
                    totalDetalle
                        .gastosBancarios
                        .toFixed(2)
                ),

            totalIvaGastosBancarios:
                Number(
                    totalDetalle
                        .ivaGastosBancarios
                        .toFixed(2)
                ),

            totalFee:
                Number(
                    totalDetalle
                        .fee
                        .toFixed(2)
                ),

            totalIvaFee:
                Number(
                    totalDetalle
                        .ivaFee
                        .toFixed(2)
                ),

            totalRetenciones:
                Number(
                    totalDetalle
                        .totalRetenciones
                        .toFixed(2)
                ),
            
            totalRetencionesConIB:
                Number((
                    totalDetalle.totalRetenciones +
                        cierre.retencionIB
                    ).toFixed(2)
                ),

            totalImporteNeto:
                Number(
                    totalDetalle
                    .importeNeto
                .toFixed(2)
                ),
            importeNetoLiquidacion:
                Number(
                    importeNetoLiquidacion
                ).toFixed(2),

            importeNetoFinal:
                Number(
                    importeNetoFinal
                .toFixed(2)
                ),

            totalCalculadoDepositar:
                Number(
                    totalCalculadoDepositar
                        .toFixed(2)
                ),

            diferenciaDeposito,

            depositoCoincide:
                Math.abs(
                    diferenciaDeposito
                ) < 0.01,
        },

        registrosOriginales,
    };
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    procesarInformeLiquidacion,
    convertirNumeroArgentino,
};