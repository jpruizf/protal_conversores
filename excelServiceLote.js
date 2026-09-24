/**
 * excelServiceLote.js
 *
 * Genera un único archivo Excel a partir de múltiples
 * informes de liquidación.
 *
 * Soporta:
 * - PAGO_FACIL
 * - SAN_JUAN_LINK
 *
 * Estructura del libro:
 * - Resumen General
 * - Una hoja por cada informe procesado
 * - Hoja Errores, si corresponde
 */

const XLSX = require("xlsx");


/* ============================================================
   UTILIDADES
============================================================ */

function numeroSeguro(valor) {
    const numero = Number(valor);

    return Number.isFinite(numero)
        ? numero
        : 0;
}


function fechaComoTexto(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).trim();
}


function nombreHojaSeguro(nombre, usados) {
    let limpio = String(nombre || "Informe")
        .replace(/[\\/*?:[\]]/g, "_")
        .trim();

    if (!limpio) {
        limpio = "Informe";
    }

    /*
     * Excel admite máximo 31 caracteres
     * en el nombre de una hoja.
     */
    limpio = limpio.substring(0, 31);

    let nombreFinal = limpio;
    let contador = 2;

    while (usados.has(nombreFinal)) {
        const sufijo = `_${contador}`;

        nombreFinal =
            limpio
                .substring(
                    0,
                    31 - sufijo.length
                ) +
            sufijo;

        contador++;
    }

    usados.add(nombreFinal);

    return nombreFinal;
}


function obtenerNombreBaseArchivo(nombreArchivo) {
    return String(nombreArchivo || "Informe")
        .replace(/\.[^.]+$/, "")
        .trim();
}


function aplicarFormatoMoneda(
    hoja,
    filaInicio,
    filaFin,
    columnaInicio,
    columnaFin
) {
    const formatoMoneda =
        '$ #,##0.00;[Red]-$ #,##0.00';

    for (
        let fila = filaInicio;
        fila <= filaFin;
        fila++
    ) {
        for (
            let columna = columnaInicio;
            columna <= columnaFin;
            columna++
        ) {
            const referencia =
                XLSX.utils.encode_cell({
                    r: fila,
                    c: columna
                });

            const celda =
                hoja[referencia];

            if (
                celda &&
                typeof celda.v === "number"
            ) {
                celda.t = "n";
                celda.z = formatoMoneda;
            }
        }
    }
}


/* ============================================================
   HOJA PAGO FÁCIL
============================================================ */


function convertirFechaOrden(valor) {

    if (!valor) {
        return 0;
    }

    /*
     * Si ya viene como Date.
     */
    if (
        valor instanceof Date &&
        !Number.isNaN(
            valor.getTime()
        )
    ) {
        return valor.getTime();
    }

    const texto =
        String(valor)
            .trim();

    /*
     * Formato YYYY-MM-DD
     */
    let coincidencia =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );

    if (coincidencia) {
        return new Date(
            Number(coincidencia[1]),
            Number(coincidencia[2]) - 1,
            Number(coincidencia[3])
        ).getTime();
    }

    /*
     * Formato DD/MM/YY
     * o DD/MM/YYYY
     */
    coincidencia =
        texto.match(
            /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/
        );

    if (coincidencia) {

        let anio =
            Number(
                coincidencia[3]
            );

        if (anio < 100) {
            anio += 2000;
        }

        return new Date(
            anio,
            Number(coincidencia[2]) - 1,
            Number(coincidencia[1])
        ).getTime();
    }

    return 0;
}

function crearHojaPagoFacil(datos) {

    const cabecera =
        datos.cabecera || {};


    const detalles =
        Array.isArray(datos.detalles)
            ? datos.detalles
            : [];


    const detallesOrdenados =
        [...detalles].sort(
            (a, b) =>
                convertirFechaOrden(
                    a.fecha
                ) -
                convertirFechaOrden(
                    b.fecha
                )
        );


    const cierre =
        datos.cierre || {};


    const controles =
        datos.controles || {};


    const filas = [];

    filas.push([
        "INFORME DE LIQUIDACIÓN"
    ]);

    filas.push([]);

    filas.push([
        "DATOS GENERALES",
        ""
    ]);

    filas.push([
        "Número O.P.",
        cabecera.numeroOP || ""
    ]);

    filas.push([
        "Documento de pago",
        cabecera.documentoPago || ""
    ]);

    filas.push([
        "Fecha de pago",
        fechaComoTexto(
            cabecera.fechaPago
        )
    ]);

    filas.push([
        "Número de pagador",
        cabecera.pagadorNumero || ""
    ]);

    filas.push([
        "Pagador",
        cabecera.pagadorNombre || ""
    ]);

    filas.push([
        "CUIT",
        cabecera.cuit || ""
    ]);

    filas.push([
        "Importe depositado",
        numeroSeguro(
            cabecera.importeDepositado
        )
    ]);

    filas.push([
        "Medio de pago",
        cabecera.medioPago || ""
    ]);

    filas.push([]);

    const filaEncabezado =
        filas.length;

    filas.push([
        "FECHA",
        "CANTIDAD DE TRANSACCIONES",
        "IMPORTE BRUTO",
        "GASTOS BANCARIOS",
        "IVA GASTOS BANCARIOS",
        "FEE",
        "IVA FEE",
        "TOTAL RETENCIONES",
        "IMPORTE NETO"
    ]);

    const filaInicioDetalle =
        filas.length;

    detallesOrdenados.forEach(
    (detalle) => {
        filas.push([
            fechaComoTexto(
                detalle.fecha
            ),

            numeroSeguro(
                detalle
                    .cantidadTransacciones
            ),

            numeroSeguro(
                detalle.importeBruto
            ),

            numeroSeguro(
                detalle.gastosBancarios
            ),

            numeroSeguro(
                detalle
                    .ivaGastosBancarios
            ),

            numeroSeguro(
                detalle.fee
            ),

            numeroSeguro(
                detalle.ivaFee
            ),

            numeroSeguro(
                detalle.importeNeto
            )
        ]);
    }
    );

    const filaFinDetalle =
        filas.length - 1;

    const filaTotales =
        filas.length;

    filas.push([
    "TOTAL GENERAL",

    numeroSeguro(
        controles
            .totalCantidadTransacciones
    ),

    numeroSeguro(
        controles.totalImporteBruto
    ),

    numeroSeguro(
        controles
            .totalGastosBancarios
    ),

    numeroSeguro(
        controles
            .totalIvaGastosBancarios
    ),

    numeroSeguro(
        controles.totalFee
    ),

    numeroSeguro(
        controles.totalIvaFee
    ),

    numeroSeguro(
        controles.totalRetenciones
    ),

    numeroSeguro(
        controles.totalImporteNeto
    )
    
]);

    filas.push([]);

    const filaTituloCierre =
        filas.length;

    filas.push([
        "CIERRE DEL INFORME",
        ""
    ]);

    const filaInicioCierre =
        filas.length;

    filas.push([
        "Total CYBA",
        numeroSeguro(
            cierre.totalCYBA
        )
    ]);

    filas.push([
        "Total INTE",
        numeroSeguro(
            cierre.totalINTE
        )
    ]);

    filas.push([
        "Ajuste RT",
        numeroSeguro(
            cierre.ajusteRT
        )
    ]);

    filas.push([
        "Total calculado a depositar",
        numeroSeguro(
            controles
                .totalCalculadoDepositar
        )
    ]);

    filas.push([
        "Total informado a depositar",
        numeroSeguro(
            cierre.totalDepositar
        )
    ]);

    filas.push([
        "Diferencia",
        numeroSeguro(
            controles.diferenciaDeposito
        )
    ]);

    const filaFinCierre =
        filas.length - 1;

    const hoja =
        XLSX.utils.aoa_to_sheet(
            filas
        );

    /*
     * Fecha como texto.
     */
    for (
        let fila =
            filaInicioDetalle;
        fila <=
            filaFinDetalle;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 0
            });

        if (hoja[referencia]) {
            hoja[referencia].t =
                "s";
        }
    }

    /*
     * Cantidad.
     */
    for (
        let fila =
            filaInicioDetalle;
        fila <=
            filaFinDetalle;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 1
            });

        if (hoja[referencia]) {
            hoja[referencia].t =
                "n";

            hoja[referencia].z =
                "0";
        }
    }

    const celdaCantidadTotal =
        XLSX.utils.encode_cell({
            r: filaTotales,
            c: 1
        });

    if (
        hoja[celdaCantidadTotal]
    ) {
        hoja[
            celdaCantidadTotal
        ].t = "n";

        hoja[
            celdaCantidadTotal
        ].z = "0";
    }

    aplicarFormatoMoneda(
        hoja,
        filaInicioDetalle,
        filaTotales,
        2,
        8
    );

    /*
     * Importe depositado.
     */
    if (
        hoja["B10"] &&
        typeof hoja["B10"].v ===
            "number"
    ) {
        hoja["B10"].t = "n";

        hoja["B10"].z =
            '$ #,##0.00;[Red]-$ #,##0.00';
    }

    aplicarFormatoMoneda(
        hoja,
        filaInicioCierre,
        filaFinCierre,
        1,
        1
    );

    hoja["!cols"] = [
        { wch: 14 },
        { wch: 25 },
        { wch: 20 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 20 }
    ];

    hoja["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 8
            }
        },

        {
            s: {
                r: 2,
                c: 0
            },
            e: {
                r: 2,
                c: 1
            }
        },

        {
            s: {
                r: filaTituloCierre,
                c: 0
            },
            e: {
                r: filaTituloCierre,
                c: 1
            }
        }
    ];

    if (
        filaFinDetalle >=
        filaInicioDetalle
    ) {
        hoja["!autofilter"] = {
            ref:
                XLSX.utils.encode_range({
                    s: {
                        r: filaEncabezado,
                        c: 0
                    },
                    e: {
                        r: filaFinDetalle,
                        c: 8
                    }
                })
        };
    }

    return hoja;
}





/***---------------------------
 * HOJA RESUMEN LIQUIDACIONES
 ------------------------------*/


function crearHojaResumenPagoFacil(
    resultadosUnicos
) {
    const filas = [];

    filas.push([
        "RESUMEN PAGO FÁCIL"
    ]);

    filas.push([]);

    filas.push([
        "FECHA DE PAGO",
        "TOTAL BRUTO",
        "GASTOS BANCARIOS",
        "IVA GASTOS BANCARIOS",
        "FEE",
        "IVA FEE",
        "IMPORTE NETO"
    ]);


    const resumenPorFecha =
        new Map();


    resultadosUnicos.forEach(
        (resultado) => {

            if (
                resultado.tipoInforme !==
                "PAGO_FACIL"
            ) {
                return;
            }


            const datos =
                resultado.datos || {};

            const cabecera =
                datos.cabecera || {};

            const controles =
                datos.controles || {};


            const fecha =
                fechaComoTexto(
                    cabecera.fechaPago
                );


            if (!fecha) {
                return;
            }


            if (
                !resumenPorFecha.has(
                    fecha
                )
            ) {

                resumenPorFecha.set(
                    fecha,
                    {
                        fecha,

                        totalBruto: 0,

                        gastosBancarios: 0,

                        ivaGastosBancarios: 0,

                        fee: 0,

                        ivaFee: 0,

                        importeNeto: 0
                    }
                );
            }


            const resumen =
                resumenPorFecha.get(
                    fecha
                );


            /*
             * IMPORTANTE:
             *
             * Estos son exactamente los mismos
             * valores utilizados en TOTAL GENERAL
             * de cada bloque.
             */

            resumen.totalBruto +=
                numeroSeguro(
                    controles
                        .totalImporteBruto
                );


            resumen.gastosBancarios +=
                numeroSeguro(
                    controles
                        .totalGastosBancarios
                );


            resumen.ivaGastosBancarios +=
                numeroSeguro(
                    controles
                        .totalIvaGastosBancarios
                );


            resumen.fee +=
                numeroSeguro(
                    controles
                        .totalFee
                );


            resumen.ivaFee +=
                numeroSeguro(
                    controles
                        .totalIvaFee
                );


            resumen.importeNeto +=
                numeroSeguro(
                    controles
                        .importeNetoLiquidacion
                );


            /* =============================================
               LOG DE CONTROL
            ============================================= */

            console.log(
                `[RESUMEN] ` +
                `FECHA=${fecha} | ` +
                `ARCHIVO=${resultado.nombreArchivo} | ` +
                `BRUTO=${numeroSeguro(
                    controles.totalImporteBruto
                )} | ` +
                `NETO=${numeroSeguro(
                    controles.importeNetoLiquidacion
                )}`
            );
        }
    );


    resumenPorFecha.forEach(
        (resumen) => {

            filas.push([
                resumen.fecha,

                numeroSeguro(
                    resumen.totalBruto
                ),

                numeroSeguro(
                    resumen.gastosBancarios
                ),

                numeroSeguro(
                    resumen.ivaGastosBancarios
                ),

                numeroSeguro(
                    resumen.fee
                ),

                numeroSeguro(
                    resumen.ivaFee
                ),

                numeroSeguro(
                    resumen.importeNeto
                )
            ]);


            console.log(
                `[TOTAL RESUMEN] ` +
                `FECHA=${resumen.fecha} | ` +
                `BRUTO=${resumen.totalBruto} | ` +
                `NETO=${resumen.importeNeto}`
            );
        }
    );


    if (
        filas.length === 3
    ) {
        return null;
    }


    const hoja =
        XLSX.utils.aoa_to_sheet(
            filas
        );


    const rango =
        XLSX.utils.decode_range(
            hoja["!ref"]
        );


    aplicarFormatoMoneda(
        hoja,
        3,
        rango.e.r,
        1,
        6
    );


    for (
        let fila = 3;
        fila <= rango.e.r;
        fila++
    ) {

        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 0
            });


        if (hoja[referencia]) {
            hoja[referencia].t =
                "s";
        }
    }


    hoja["!cols"] = [
        { wch: 18 },
        { wch: 20 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 }
    ];


    return hoja;
}




/* ============================================================
   HOJA SAN JUAN LINK
============================================================ */

function crearHojaSanJuanLink(datos) {
    const cabecera =
        datos.cabecera || {};

    const detalles =
        Array.isArray(datos.detalles)
            ? datos.detalles
            : [];

    const totales =
        datos.totales || {};

    const cierre =
        datos.cierre || {};

    const controles =
        datos.controles || {};

    const filas = [];

    filas.push([
        "RESUMEN DE LIQUIDACIÓN - SAN JUAN LINK"
    ]);

    filas.push([]);

    filas.push([
        "DATOS GENERALES",
        ""
    ]);

    filas.push([
        "Fecha",
        fechaComoTexto(
            cabecera.fecha
        )
    ]);

    filas.push([
        "Código de ente",
        cabecera.codigoEnte || ""
    ]);

    filas.push([
        "Ente",
        cabecera.nombreEnte || ""
    ]);

    filas.push([
        "Código entidad adherente",
        cabecera
            .codigoEntidadAdherente ||
        ""
    ]);

    filas.push([
        "Entidad adherente",
        cabecera
            .entidadAdherente ||
        ""
    ]);

    filas.push([]);

    const filaEncabezado =
        filas.length;

    filas.push([
        "BANCO EMISOR",
        "CANTIDAD",
        "IMPORTE A COBRAR",
        "COMISIONES PAGADAS",
        "COMISIONES IVA",
        "PERCEPCIÓN IVA",
        "RETENCIÓN IVA",
        "RETENCIÓN GANANCIAS",
        "RETENCIÓN IIBB",
        "IMPORTE NETO A COBRAR"
    ]);

    const filaInicioDetalle =
        filas.length;

    detalles.forEach(
        (detalle) => {
            filas.push([
                detalle.bancoEmisor ||
                "",

                numeroSeguro(
                    detalle.cantidad
                ),

                numeroSeguro(
                    detalle.importeCobrar
                ),

                numeroSeguro(
                    detalle
                        .comisionesPagadas
                ),

                numeroSeguro(
                    detalle.comisionesIVA
                ),

                numeroSeguro(
                    detalle.percepcionIVA
                ),

                numeroSeguro(
                    detalle.retencionIVA
                ),

                numeroSeguro(
                    detalle
                        .retencionGanancias
                ),

                numeroSeguro(
                    detalle.retencionIIBB
                ),

                numeroSeguro(
                    detalle
                        .importeNetoCobrar
                )
            ]);
        }
    );

    const filaFinDetalle =
        filas.length - 1;

    const filaTotales =
        filas.length;

    filas.push([
        "TOTAL GENERAL",

        numeroSeguro(
            totales.cantidad
        ),

        numeroSeguro(
            totales.importeCobrar
        ),

        numeroSeguro(
            totales.comisionesPagadas
        ),

        numeroSeguro(
            totales.comisionesIVA
        ),

        numeroSeguro(
            totales.percepcionIVA
        ),

        numeroSeguro(
            totales.retencionIVA
        ),

        numeroSeguro(
            totales.retencionGanancias
        ),

        numeroSeguro(
            totales.retencionIIBB
        ),

        numeroSeguro(
            totales.importeNetoCobrar
        )
    ]);

    filas.push([]);

    const filaTituloCierre =
        filas.length;

    filas.push([
        "CIERRE DEL INFORME",
        ""
    ]);

    const filaInicioCierre =
        filas.length;

    filas.push([
        "Importe neto bancos",
        numeroSeguro(
            totales.importeNetoCobrar
        )
    ]);

    filas.push([
        "Comisión retención Banco San Juan",
        numeroSeguro(
            cierre
                .comisionRetencionBancoSanJuan
        )
    ]);

    filas.push([
        "Comisión Importes Netos IVA",
        numeroSeguro(
            cierre
                .comisionImportesNetosIVA
        )
    ]);

    filas.push([
        "Total deducciones Banco Adherente",
        numeroSeguro(
            cierre
                .totalDeduccionesBancoAdherente
        )
    ]);

    filas.push([
        "TOTAL NETO",
        numeroSeguro(
            cierre.totalNeto
        )
    ]);

    const filaFinCierre =
        filas.length - 1;

    filas.push([]);

    const filaTituloControl =
        filas.length;

    filas.push([
        "CONTROL",
        ""
    ]);

    const filaInicioControl =
        filas.length;

    filas.push([
        "Total neto calculado",
        numeroSeguro(
            controles
                .totalNetoCalculado
        )
    ]);

    filas.push([
        "Diferencia",
        numeroSeguro(
            controles
                .diferenciaTotalNeto
        )
    ]);

    filas.push([
        "Estado",
        controles.totalNetoCoincide
            ? "OK"
            : "REVISAR"
    ]);

    const filaFinControl =
        filas.length - 1;

    const hoja =
        XLSX.utils.aoa_to_sheet(
            filas
        );

    /*
     * Cantidad.
     */
    for (
        let fila =
            filaInicioDetalle;
        fila <=
            filaFinDetalle;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 1
            });

        if (hoja[referencia]) {
            hoja[referencia].t =
                "n";

            hoja[referencia].z =
                "0";
        }
    }

    const celdaCantidadTotal =
        XLSX.utils.encode_cell({
            r: filaTotales,
            c: 1
        });

    if (
        hoja[celdaCantidadTotal]
    ) {
        hoja[
            celdaCantidadTotal
        ].t = "n";

        hoja[
            celdaCantidadTotal
        ].z = "0";
    }

    aplicarFormatoMoneda(
        hoja,
        filaInicioDetalle,
        filaTotales,
        2,
        9
    );

    aplicarFormatoMoneda(
        hoja,
        filaInicioCierre,
        filaFinCierre,
        1,
        1
    );

    aplicarFormatoMoneda(
        hoja,
        filaInicioControl,
        filaFinControl,
        1,
        1
    );

    hoja["!cols"] = [
        { wch: 32 },
        { wch: 14 },
        { wch: 20 },
        { wch: 22 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 18 },
        { wch: 23 }
    ];

    hoja["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 9
            }
        },

        {
            s: {
                r: 2,
                c: 0
            },
            e: {
                r: 2,
                c: 1
            }
        },

        {
            s: {
                r: filaTituloCierre,
                c: 0
            },
            e: {
                r: filaTituloCierre,
                c: 1
            }
        },

        {
            s: {
                r: filaTituloControl,
                c: 0
            },
            e: {
                r: filaTituloControl,
                c: 1
            }
        }
    ];

    if (
        filaFinDetalle >=
        filaInicioDetalle
    ) {
        hoja["!autofilter"] = {
            ref:
                XLSX.utils.encode_range({
                    s: {
                        r: filaEncabezado,
                        c: 0
                    },
                    e: {
                        r: filaFinDetalle,
                        c: 9
                    }
                })
        };
    }

    return hoja;
}


/* ============================================================
   HOJA DE ERRORES
============================================================ */

function crearHojaErrores(errores) {
    const filas = [
        [
            "ARCHIVO",
            "ERROR"
        ]
    ];

    errores.forEach(
        (item) => {
            filas.push([
                item.archivo || "",
                item.error || ""
            ]);
        }
    );

    const hoja =
        XLSX.utils.aoa_to_sheet(
            filas
        );

    hoja["!cols"] = [
        { wch: 42 },
        { wch: 80 }
    ];

    if (errores.length > 0) {
        hoja["!autofilter"] = {
            ref:
                XLSX.utils.encode_range({
                    s: {
                        r: 0,
                        c: 0
                    },
                    e: {
                        r: errores.length,
                        c: 1
                    }
                })
        };
    }

    return hoja;
}


/* ============================================================
   GENERACIÓN PRINCIPAL
============================================================ */
/* ============================================================
   AGREGAR BLOQUE PAGO FÁCIL
============================================================ */

function agregarBloquePagoFacil(
    filas,
    datos,
    nombreArchivo
) {
    const cabecera =
        datos.cabecera || {};

    const detalles =
        Array.isArray(datos.detalles)
            ? datos.detalles
            : [];

    const detallesOrdenados =
    [...detalles].sort(
        (a, b) =>
            convertirFechaOrden(
                a.fecha
            ) -
            convertirFechaOrden(
                b.fecha
            )
    );

    const cierre =
        datos.cierre || {};

    const controles =
        datos.controles || {};

    

    filas.push([
        `INFORME DE LIQUIDACIÓN - PAGO FÁCIL`
    ]);

    filas.push([
        "Archivo",
        nombreArchivo || ""
    ]);

    filas.push([]);

    filas.push([
        "DATOS GENERALES",
        ""
    ]);

    filas.push([
        "Número O.P.",
        cabecera.numeroOP || ""
    ]);

    filas.push([
        "Documento de pago",
        cabecera.documentoPago || ""
    ]);

    filas.push([
        "Fecha de pago",
        fechaComoTexto(
            cabecera.fechaPago
        )
    ]);

    filas.push([
        "Número de pagador",
        cabecera.pagadorNumero || ""
    ]);

    filas.push([
        "Pagador",
        cabecera.pagadorNombre || ""
    ]);

    filas.push([
        "CUIT",
        cabecera.cuit || ""
    ]);

    filas.push([
        "Importe depositado",
        numeroSeguro(
            cabecera.importeDepositado
        )
    ]);

    filas.push([
        "Medio de pago",
        cabecera.medioPago || ""
    ]);

    filas.push([]);

    filas.push([
        "FECHA",
        "CANTIDAD DE TRANSACCIONES",
        "IMPORTE BRUTO",
        "GASTOS BANCARIOS",
        "IVA GASTOS BANCARIOS",
        "FEE",
        "IVA FEE",
        "IMPORTE NETO"
    ]);
    detallesOrdenados.forEach(
    (detalle) => {

        filas.push([
            fechaComoTexto(
                detalle.fecha
            ),

            numeroSeguro(
                detalle
                    .cantidadTransacciones
            ),

            numeroSeguro(
                detalle.importeBruto
            ),

            numeroSeguro(
                detalle.gastosBancarios
            ),

            numeroSeguro(
                detalle
                    .ivaGastosBancarios
            ),

            numeroSeguro(
                detalle.fee
            ),

            numeroSeguro(
                detalle.ivaFee
            ),

            numeroSeguro(
                detalle.importeNeto
            )
        ]); }
    );
    
    console.log("=== CONTROL LOTE PAGO FACIL ===");

    console.log(
        "totalRetencionesConIB:",
        controles.totalRetencionesConIB
    );

    console.log(
        "importeNetoFinal:",
        controles.importeNetoFinal
    );

    console.log(
        "totalImporteNeto:",
        controles.totalImporteNeto
    );

    console.log(
        "totalCalculadoDepositar:",
        controles.totalCalculadoDepositar
    );

    console.log("===============================");

    filas.push([
    "TOTAL GENERAL",

    numeroSeguro(
        controles.totalCantidadTransacciones
    ),

    numeroSeguro(
        controles.totalImporteBruto
    ),

    numeroSeguro(
        controles.totalGastosBancarios
    ),

    numeroSeguro(
        controles.totalIvaGastosBancarios
    ),

    numeroSeguro(
        controles.totalFee
    ),

    numeroSeguro(
        controles.totalIvaFee
    ),

    numeroSeguro(
    controles.importeNetoLiquidacion
    )
]);

    filas.push([]);

    filas.push([
    "CIERRE DEL INFORME",
    ""
    ]);

    filas.push([
        "Total CYBA",
        numeroSeguro(
            cierre.totalCYBA)
    ]);

    filas.push([
        "Total INTE",
        numeroSeguro(
            cierre.totalINTE)
    ]);

    filas.push([
        "Ajuste RT",
        numeroSeguro(
            cierre.ajusteRT)
    ]);

    filas.push([
        "Retención IB / SIRTAC",
        numeroSeguro(
            cierre.retencionIB)
    ]);

    filas.push([
        "Total a depositar",
        numeroSeguro(
            cierre.totalDepositar)
    ]);
}


/* ============================================================
   AGREGAR BLOQUE SAN JUAN LINK
============================================================ */

function agregarBloqueSanJuanLink(
    filas,
    datos,
    nombreArchivo
) {
    const cabecera =
        datos.cabecera || {};

    const detalles =
        Array.isArray(datos.detalles)
            ? datos.detalles
            : [];

    const totales =
        datos.totales || {};

    const cierre =
        datos.cierre || {};

    const controles =
        datos.controles || {};

    filas.push([
        "RESUMEN DE LIQUIDACIÓN - SAN JUAN LINK"
    ]);

    filas.push([
        "Archivo",
        nombreArchivo || ""
    ]);

    filas.push([]);

    filas.push([
        "DATOS GENERALES",
        ""
    ]);

    filas.push([
        "Fecha",
        fechaComoTexto(
            cabecera.fecha
        )
    ]);

    filas.push([
        "Código de ente",
        cabecera.codigoEnte || ""
    ]);

    filas.push([
        "Ente",
        cabecera.nombreEnte || ""
    ]);

    filas.push([
        "Código entidad adherente",
        cabecera
            .codigoEntidadAdherente ||
        ""
    ]);

    filas.push([
        "Entidad adherente",
        cabecera
            .entidadAdherente ||
        ""
    ]);

    filas.push([]);

    filas.push([
        "BANCO EMISOR",
        "CANTIDAD",
        "IMPORTE A COBRAR",
        "COMISIONES PAGADAS",
        "COMISIONES IVA",
        "PERCEPCIÓN IVA",
        "RETENCIÓN IVA",
        "RETENCIÓN GANANCIAS",
        "RETENCIÓN IIBB",
        /*"IMPORTE NETO A COBRAR"*/
    ]);

    detalles.forEach(
        (detalle) => {
            filas.push([
                detalle.bancoEmisor || "",

                numeroSeguro(
                    detalle.cantidad
                ),

                numeroSeguro(
                    detalle.importeCobrar
                ),

                numeroSeguro(
                    detalle
                        .comisionesPagadas
                ),

                numeroSeguro(
                    detalle.comisionesIVA
                ),

                numeroSeguro(
                    detalle.percepcionIVA
                ),

                numeroSeguro(
                    detalle.retencionIVA
                ),

                numeroSeguro(
                    detalle
                        .retencionGanancias
                ),

                numeroSeguro(
                    detalle.retencionIIBB
                ),

                numeroSeguro(
                    detalle
                        .importeNetoCobrar
                )
            ]);
        }
    );

    filas.push([
        "TOTAL GENERAL",

        numeroSeguro(
            totales.cantidad
        ),

        numeroSeguro(
            totales.importeCobrar
        ),

        numeroSeguro(
            totales.comisionesPagadas
        ),

        numeroSeguro(
            totales.comisionesIVA
        ),

        numeroSeguro(
            totales.percepcionIVA
        ),

        numeroSeguro(
            totales.retencionIVA
        ),

        numeroSeguro(
            totales.retencionGanancias
        ),

        numeroSeguro(
            totales.retencionIIBB
        ),

        numeroSeguro(
            totales.importeNetoCobrar
        )
    ]);

    filas.push([]);

    filas.push([
        "CIERRE DEL INFORME",
        ""
    ]);

    filas.push([
        "Importe neto bancos",
        numeroSeguro(
            totales.importeNetoCobrar
        )
    ]);

    filas.push([
        "Comisión retención Banco San Juan",
        numeroSeguro(
            cierre
                .comisionRetencionBancoSanJuan
        )
    ]);

    filas.push([
        "Comisión Importes Netos IVA",
        numeroSeguro(
            cierre
                .comisionImportesNetosIVA
        )
    ]);

    filas.push([
        "Total deducciones Banco Adherente",
        numeroSeguro(
            cierre
                .totalDeduccionesBancoAdherente
        )
    ]);

    filas.push([
        "TOTAL NETO",
        numeroSeguro(
            cierre.totalNeto
        )
    ]);

    filas.push([]);

    filas.push([
        "CONTROL",
        ""
    ]);

    filas.push([
        "Total neto calculado",
        numeroSeguro(
            controles
                .totalNetoCalculado
        )
    ]);

    filas.push([
        "Diferencia",
        numeroSeguro(
            controles
                .diferenciaTotalNeto
        )
    ]);

    filas.push([
        "Estado",
        controles.totalNetoCoincide
            ? "OK"
            : "REVISAR"
    ]);
}

/* ============================================================
   DEDUPLICACIÓN DE INFORMES
============================================================ */

function crearClaveLiquidacion(
    resultado
) {
    const tipo =
        resultado.tipoInforme || "";

    const datos =
        resultado.datos || {};

    /*
     * Por ahora deduplicamos Pago Fácil.
     * San Juan Link puede tener su propia clave
     * cuando validemos sus casos reales.
     */
    if (
        tipo !== "PAGO_FACIL"
    ) {
        return null;
    }

    const cabecera =
        datos.cabecera || {};

    const controles =
        datos.controles || {};

    const detalles =
        Array.isArray(datos.detalles)
            ? datos.detalles
            : [];


    /*
     * La clave NO usa el nombre del archivo.
     *
     * Dos archivos pueden tener nombres distintos
     * y contener exactamente la misma liquidación.
     */
    const detalleFirma =
        detalles.map(
            (detalle) => [
                fechaComoTexto(
                    detalle.fecha
                ),

                numeroSeguro(
                    detalle.cantidadTransacciones
                ),

                numeroSeguro(
                    detalle.importeBruto
                ),

                numeroSeguro(
                    detalle.gastosBancarios
                ),

                numeroSeguro(
                    detalle.ivaGastosBancarios
                ),

                numeroSeguro(
                    detalle.fee
                ),

                numeroSeguro(
                    detalle.ivaFee
                ),

                numeroSeguro(
                    detalle.importeNeto
                )
            ]
        );


    return JSON.stringify({
        tipo,

        numeroOP:
            String(
                cabecera.numeroOP || ""
            ).trim(),

        documentoPago:
            String(
                cabecera.documentoPago || ""
            ).trim(),

        fechaPago:
            fechaComoTexto(
                cabecera.fechaPago
            ),

        pagadorNumero:
            String(
                cabecera.pagadorNumero || ""
            ).trim(),

        medioPago:
            String(
                cabecera.medioPago || ""
            ).trim(),

        totalImporteBruto:
            numeroSeguro(
                controles.totalImporteBruto
            ),

        detalles:
            detalleFirma
    });
}


function deduplicarResultados(
    resultados
) {
    const claves =
        new Set();

    const unicos = [];

    const duplicados = [];


    for (
        const resultado
        of resultados
    ) {

        const clave =
            crearClaveLiquidacion(
                resultado
            );


        /*
         * Por ahora otros tipos de informe
         * pasan sin deduplicarse.
         */
        if (!clave) {
            unicos.push(
                resultado
            );

            continue;
        }


        if (
            claves.has(clave)
        ) {

            duplicados.push({
                archivo:
                    resultado.nombreArchivo ||
                    "Sin nombre",

                tipo:
                    resultado.tipoInforme
            });

            continue;
        }


        claves.add(clave);

        unicos.push(
            resultado
        );
    }


    return {
        unicos,
        duplicados
    };
}


function generarExcelLote(
    resultados,
    errores = []
) {
    if (
        !Array.isArray(resultados)
    ) {
        throw new Error(
            "Los resultados del lote no son válidos."
        );
    }

    if (
        resultados.length === 0
    ) {
        throw new Error(
            "No existen informes válidos para generar el Excel."
        );
    }

    if (
        !Array.isArray(errores)
    ) {
        errores = [];
    }

    const libro =
        XLSX.utils.book_new();


    /* ========================================================
       DEDUPLICACIÓN
    ======================================================== */

    const {
        unicos: resultadosUnicos,
        duplicados
    } = deduplicarResultados(
        resultados
    );


    console.log(
        "[LIQUIDACIONES] Recibidas:",
        resultados.length
    );

    console.log(
        "[LIQUIDACIONES] Únicas:",
        resultadosUnicos.length
    );

    console.log(
        "[LIQUIDACIONES] Duplicadas descartadas:",
        duplicados.length
    );


    duplicados.forEach(
        (duplicado) => {

            console.log(
                `[DUPLICADO] ${duplicado.archivo}`
            );
        }
    );


    const nombresUsados =
        new Set();


    /* ========================================================
       RESUMEN PAGO FÁCIL
    ======================================================== */

    const hojaResumenPagoFacil =
        crearHojaResumenPagoFacil(
            resultadosUnicos
        );


    if (
        hojaResumenPagoFacil
    ) {

        XLSX.utils.book_append_sheet(
            libro,
            hojaResumenPagoFacil,
            "Resumen Pago Fácil"
        );
    }


/* ========================================================
       HOJAS UNIFICADAS
======================================================== */

const filasUnificadas = [];

resultadosUnicos.forEach(
    (
        resultado,
    ) => {
        const tipoInforme =
            resultado.tipoInforme;

        const datos =
            resultado.datos;


        /* =========================================
           PAGO FÁCIL
        ========================================= */

        if (
            tipoInforme ===
            "PAGO_FACIL"
        ) {
            if (
                filasUnificadas.length > 0
            ) {
                filasUnificadas.push([]);
                filasUnificadas.push([]);
            }

            agregarBloquePagoFacil(
                filasUnificadas,
                datos,
                resultado.nombreArchivo
            );

            return;
        }
       
        /* =========================================
           SAN JUAN LINK
        ========================================= */
        if (
            tipoInforme ==="SAN_JUAN_LINK"
        ) 
    {
        const cabecera =
            datos.cabecera || {};

        const totales =
            datos.totales || {};

        const cierre =
            datos.cierre || {};

        const fecha =
            fechaComoTexto(
                cabecera.fecha
        );

        const cantidad =
            numeroSeguro(
                totales.cantidad
        );

        const importeCobrar =
            numeroSeguro(
                totales.importeCobrar
        );

        const comisionOtrosBancos =
            numeroSeguro(
                totales.comisionesPagadas
        );

        const ivaComisionOtrosBancos =
            numeroSeguro(
                totales.comisionesIVA
        );

        const comisionBancoSanJuan =
            numeroSeguro(
                cierre.comisionRetencionBancoSanJuan
        );

        const ivaComisionBancoSanJuan =
            numeroSeguro(
                cierre.comisionImportesNetosIVA
        );

        const importeNeto =
            numeroSeguro(
                cierre.totalNeto
        );
        /*const importeNetoCobrar =
            numeroSeguro(
                totales.importeNetoCobrar
        );*/



    /*
     * Separación respecto de otros bloques.
     */
    if (
        filasUnificadas.length > 0
    ) {
        filasUnificadas.push([]);
        filasUnificadas.push([]);
    }


    /* =========================================
       RESUMEN SAN JUAN LINK
    ========================================= */

    filasUnificadas.push([
        `SAN JUAN LINK - ${fecha}`
    ]);

    filasUnificadas.push([]);

    filasUnificadas.push([
        "FECHA",
        "CANTIDAD",
        "IMPORTE A COBRAR",
        "COMISIÓN OTROS BANCOS",
        "IVA COMISIÓN",
        "COMISIÓN BCO SAN JUAN",
        "IVA COMISIÓN",
        "IMPORTE NETO",
        "CONTROL"
    ]);

    filasUnificadas.push([
        fecha,
        cantidad,
        importeCobrar,
        comisionOtrosBancos,
        ivaComisionOtrosBancos,
        comisionBancoSanJuan,
        ivaComisionBancoSanJuan,
        importeNeto,
        ""
    ]);


    /* =========================================
       ASIENTOS SAN JUAN LINK
    ========================================= */

    return;
}
    });
/* ============================================================
   CREAR UNA SOLA HOJA
============================================================ */

const hojaLiquidaciones =
    XLSX.utils.aoa_to_sheet(
        filasUnificadas
    );

const rangoLiquidaciones =
    XLSX.utils.decode_range(
        hojaLiquidaciones["!ref"]
    );


aplicarFormatoMoneda(
    hojaLiquidaciones,
    rangoLiquidaciones.s.r,
    rangoLiquidaciones.e.r,
    2,
    rangoLiquidaciones.e.c
);

for (
    let fila = rangoLiquidaciones.s.r;
    fila <= rangoLiquidaciones.e.r;
    fila++
) {
    const referenciaA =
        XLSX.utils.encode_cell({
            r: fila,
            c: 0
        });

    const referenciaB =
        XLSX.utils.encode_cell({
            r: fila,
            c: 1
        });

    const celdaA =
        hojaLiquidaciones[referenciaA];

    const celdaB =
        hojaLiquidaciones[referenciaB];

    if (
        !celdaA ||
        !celdaB ||
        typeof celdaB.v !== "number"
    ) {
        continue;
    }

    const concepto =
        String(celdaA.v)
            .trim()
            .toUpperCase();

    const camposMonetariosCierre = [
        "TOTAL CYBA",
        "TOTAL INTE",
        "AJUSTE RT",
        "RETENCIÓN IB / SIRTAC",
        "TOTAL A DEPOSITAR"
    ];

    if (
        camposMonetariosCierre.includes(
            concepto
        )
    ) {
        celdaB.t = "n";
        celdaB.z =
            '$ #,##0.00;[Red]-$ #,##0.00';
    }
}


XLSX.utils.book_append_sheet(
    libro,
    hojaLiquidaciones,
    "Liquidaciones"
);

    /* ========================================================
       ERRORES
    ======================================================== */

    if (
        errores.length > 0
    ) {
        const hojaErrores =
            crearHojaErrores(
                errores
            );

        XLSX.utils.book_append_sheet(
            libro,
            hojaErrores,
            "Errores"
        );
    }


    /* ========================================================
       PROPIEDADES
    ======================================================== */

    libro.Props = {
        Title:
            "Lote de Informes de Liquidación",

        Subject:
            "Conversión múltiple TXT a Excel",

        Author:
            "INTERREDES",

        Company:
            "INTERREDES"
    };


    /* ========================================================
       BUFFER
    ======================================================== */

    return XLSX.write(
        libro,
        {
            type: "buffer",
            bookType: "xlsx",
            compression: true
        }
    );
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    generarExcelLote
};