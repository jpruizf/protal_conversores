/**
 * excelService.js
 *
 * Genera la planilla Excel del Informe de Liquidación.
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

/**
 * Mantiene las fechas como texto para evitar que Excel
 * las cambie por diferencia de zona horaria.
 */
function fechaComoTexto(fecha) {
    if (!fecha) {
        return "";
    }

    return String(fecha).trim();
}


/* ============================================================
   GENERAR EXCEL
============================================================ */

function generarExcelLiquidacion(resultado) {
    if (!resultado) {
        throw new Error(
            "No se recibieron datos para generar el Excel."
        );
    }

    const cabecera = resultado.cabecera || {};
    const detalles = Array.isArray(resultado.detalles)
        ? resultado.detalles
        : [];

    const cierre = resultado.cierre || {};
    const controles = resultado.controles || {};

    const filas = [];

    /* ========================================================
       TÍTULO
    ======================================================== */

    filas.push([
        "INFORME DE LIQUIDACIÓN"
    ]);

    filas.push([]);


    /* ========================================================
       DATOS GENERALES
    ======================================================== */

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
        fechaComoTexto(cabecera.fechaPago)
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


    /* ========================================================
       DETALLE
    ======================================================== */

    const filaEncabezado = filas.length;

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

    const filaInicioDetalle = filas.length;

    detalles.forEach((detalle) => {
        filas.push([
            fechaComoTexto(
                detalle.fecha
            ),

            /*
             * IMPORTANTE:
             * El parser utiliza cantidadTransacciones.
             */
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
        ]);
    });

    const filaFinDetalle = filas.length - 1;


    /* ========================================================
       FILA DE TOTALES
    ======================================================== */

    const filaTotales = filas.length;

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
        controles.totalImporteNeto
    )
]);

    filas.push([]);


    /* ========================================================
       CIERRE DEL INFORME
    ======================================================== */

    const filaTituloCierre = filas.length;

    filas.push([
        "CIERRE DEL INFORME",
        ""
    ]);

    const filaInicioCierre = filas.length;

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

    const filaFinCierre = filas.length - 1;


    /* ========================================================
       CREAR HOJA
    ======================================================== */

    const hoja =
        XLSX.utils.aoa_to_sheet(filas);


    /* ========================================================
       FECHAS COMO TEXTO
    ======================================================== */

    for (
        let fila = filaInicioDetalle;
        fila <= filaFinDetalle;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 0
            });

        if (hoja[referencia]) {
            hoja[referencia].t = "s";
        }
    }


    /* ========================================================
       CANTIDAD COMO NÚMERO
    ======================================================== */

    for (
        let fila = filaInicioDetalle;
        fila <= filaFinDetalle;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 1
            });

        if (hoja[referencia]) {
            hoja[referencia].t = "n";
            hoja[referencia].z = "0";
        }
    }

    const celdaCantidadTotal =
        XLSX.utils.encode_cell({
            r: filaTotales,
            c: 1
        });

    if (hoja[celdaCantidadTotal]) {
        hoja[celdaCantidadTotal].t = "n";
        hoja[celdaCantidadTotal].z = "0";
    }


    /* ========================================================
       FORMATO MONETARIO DEL DETALLE
    ======================================================== */

    for (
        let fila = filaInicioDetalle;
        fila <= filaTotales;
        fila++
    ) {
        for (
            let columna = 2;
            columna <= 7;
            columna++
        ) {
            const referencia =
                XLSX.utils.encode_cell({
                    r: fila,
                    c: columna
                });

            const celda = hoja[referencia];

            if (
                celda &&
                typeof celda.v === "number"
            ) {
                celda.t = "n";
                celda.z =
                    '$ #,##0.00;[Red]-$ #,##0.00';
            }
        }
    }


    /* ========================================================
       FORMATO MONETARIO DE CABECERA
    ======================================================== */

    /*
     * Importe depositado:
     * fila 9 de Excel, índice 8.
     */
    const celdaImporteDepositado =
        hoja["B9"];

    if (
        celdaImporteDepositado &&
        typeof celdaImporteDepositado.v ===
            "number"
    ) {
        celdaImporteDepositado.t = "n";
        celdaImporteDepositado.z =
            '$ #,##0.00;[Red]-$ #,##0.00';
    }


    /* ========================================================
       FORMATO MONETARIO DEL CIERRE
    ======================================================== */

    for (
        let fila = filaInicioCierre;
        fila <= filaFinCierre;
        fila++
    ) {
        const referencia =
            XLSX.utils.encode_cell({
                r: fila,
                c: 1
            });

        const celda = hoja[referencia];

        if (
            celda &&
            typeof celda.v === "number"
        ) {
            celda.t = "n";
            celda.z =
                '$ #,##0.00;[Red]-$ #,##0.00';
        }
    }


    /* ========================================================
       ANCHOS DE COLUMNAS
    ======================================================== */

    hoja["!cols"] = [
        { wch: 14 },
        { wch: 25 },
        { wch: 20 },
        { wch: 22 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 }
    ];


    /* ========================================================
       COMBINACIONES
    ======================================================== */

    hoja["!merges"] = [
        {
            s: {
                r: 0,
                c: 0
            },
            e: {
                r: 0,
                c: 7
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


    /* ========================================================
       FILTRO
    ======================================================== */

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
                        c: 7
                    }
                })
        };
    }


    /* ========================================================
       CREAR LIBRO
    ======================================================== */

    const libro =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Liquidación"
    );

    libro.Props = {
        Title:
            "Informe de Liquidación",

        Subject:
            "Conversión TXT a Excel",

        Author:
            "INTERREDES",

        Company:
            "INTERREDES"
    };


    /* ========================================================
       DEVOLVER BUFFER
    ======================================================== */

    return XLSX.write(libro, {
        type: "buffer",
        bookType: "xlsx",
        compression: true
    });
}


/* ============================================================
   EXPORTACIÓN
============================================================ */

module.exports = {
    generarExcelLiquidacion
};