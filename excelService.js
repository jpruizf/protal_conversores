const ExcelJS = require("exceljs");


/**
 * Formato moneda para Excel.
 */
const formatoMoneda =
    '$ #,##0.00;[Red]-$ #,##0.00';


/**
 * Formato entero.
 */
const formatoEntero =
    '#,##0';


/**
 * Aplica estilo al encabezado.
 */
function aplicarEstiloEncabezado(row) {
    row.height = 32;

    row.eachCell(cell => {
        cell.font = {
            name: "Segoe UI",
            size: 10,
            bold: true,
            color: {
                argb: "FFFFFFFF"
            }
        };

        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "00B8FF"
            }
        };

        cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true
        };

        cell.border = {
            bottom: {
                style: "thin",
                color: {
                    argb: "FFFFFFFF"
                }
            }
        };
    });
}


/**
 * Aplica formato según
 * el estado de conciliación.
 */
function aplicarEstiloEstado(cell, estado) {
    cell.font = {
        name: "Segoe UI",
        size: 10,
        bold: true
    };

    cell.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true
    };


    if (estado === "COINCIDE") {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFC6EFCE"
            }
        };

        cell.font = {
            ...cell.font,
            color: {
                argb: "FF006100"
            }
        };

        return;
    }


    if (
        estado === "SIN LIQUIDACIONES"
    ) {
        cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: {
                argb: "FFFFC7CE"
            }
        };

        cell.font = {
            ...cell.font,
            color: {
                argb: "FF9C0006"
            }
        };

        return;
    }


    /*
     * Estados que requieren revisión.
     */
    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
            argb: "FFFFEB9C"
        }
    };

    cell.font = {
        ...cell.font,
        color: {
            argb: "FF9C6500"
        }
    };
}


/**
 * Genera el Excel final
 * con el resultado de las conciliaciones.
 */
async function generarExcelConciliacion(
    resultados
) {
    if (!Array.isArray(resultados)) {
        throw new Error(
            "Los resultados deben ser un array."
        );
    }


    const workbook =
        new ExcelJS.Workbook();


    workbook.creator =
        "INTERREDES";

    workbook.created =
        new Date();


    const worksheet =
        workbook.addWorksheet(
            "Resumen Comisiones"
        );


    /**
     * Configuración de columnas.
     */
    worksheet.columns = [
        {
            header:
                "FECHA EMISIÓN COMISIÓN",
            key:
                "fechaEmision",
            width:
                18
        },
        {
            header:
                "TOTAL REGISTROS PDF",
            key:
                "totalRegistrosPDF",
            width:
                18
        },
        {
            header:
                "TOTAL TRANSACCIONES LIQUIDACIÓN",
            key:
                "totalTransaccionesLiquidacion",
            width:
                24
        },
        {
            header:
                "TOTAL RECAUDADO PDF",
            key:
                "totalRecaudadoPDF",
            width:
                20
        },
        {
            header:
                "COMISIÓN",
            key:
                "comision",
            width:
                16
        },
        {
            header:
                "IVA S/COMISIÓN",
            key:
                "ivaComision",
            width:
                16
        },
        {
            header:
                "RET. R.G. 3130",
            key:
                "retencionRG3130",
            width:
                16
        },
        {
            header:
                "EFECTIVO",
            key:
                "efectivo",
            width:
                18
        },
        {
            header:
                "DÉBITO",
            key:
                "debito",
            width:
                18
        },
        {
            header:
                "PAGOS QR",
            key:
                "pagosQR",
            width:
                18
        },
        {
            header:
                "FECHA LIQUIDACIÓN",
            key:
                "fechaLiquidacion",
            width:
                18
        },
        {
            header:
                "IMPORTE BRUTO LIQUIDACIONES",
            key:
                "importeBrutoLiquidaciones",
            width:
                24
        },
        {
            header:
                "DIFERENCIA IMPORTE",
            key:
                "diferenciaImporte",
            width:
                18
        },
        {
            header:
                "DIFERENCIA REGISTROS",
            key:
                "diferenciaRegistros",
            width:
                18
        },
        {
            header:
                "CANTIDAD DE LIQUIDACIONES",
            key:
                "cantidadLiquidaciones",
            width:
                22
        },
        {
            header:
                "ESTADO",
            key:
                "estado",
            width:
                30
        }
    ];


    /**
     * Estilo encabezado.
     */
    aplicarEstiloEncabezado(
        worksheet.getRow(1)
    );


    /**
     * Agregamos los resultados.
     */
    resultados.forEach(
        resultado => {

            const row =
                worksheet.addRow({
                    fechaEmision:
                        resultado.fechaEmision,

                    totalRegistrosPDF:
                        resultado.totalRegistrosPDF,

                    totalTransaccionesLiquidacion:
                        resultado
                            .totalTransaccionesLiquidacion,

                    totalRecaudadoPDF:
                        resultado.totalRecaudadoPDF,

                    comision:
                        resultado.comision,

                    ivaComision:
                        resultado.ivaComision,

                    retencionRG3130:
                        resultado.retencionRG3130,

                    efectivo:
                        resultado.efectivo,

                    debito:
                        resultado.debito,

                    pagosQR:
                        resultado.pagosQR,

                    fechaLiquidacion:
                        resultado.fechaLiquidacion,

                    importeBrutoLiquidaciones:
                        resultado
                            .importeBrutoLiquidaciones,

                    diferenciaImporte:
                        resultado.diferenciaImporte,

                    diferenciaRegistros:
                        resultado.diferenciaRegistros,

                    cantidadLiquidaciones:
                        resultado.cantidadLiquidaciones,

                    estado:
                        resultado.estado
                });


            row.height = 22;


            /**
             * Alineación general.
             */
            row.eachCell(cell => {
                cell.font = {
                    name: "Segoe UI",
                    size: 10
                };

                cell.alignment = {
                    vertical: "middle"
                };
            });


            /**
             * Enteros.
             */
            row.getCell(
                "totalRegistrosPDF"
            ).numFmt =
                formatoEntero;

            row.getCell(
                "totalTransaccionesLiquidacion"
            ).numFmt =
                formatoEntero;

            row.getCell(
                "diferenciaRegistros"
            ).numFmt =
                formatoEntero;

            row.getCell(
                "cantidadLiquidaciones"
            ).numFmt =
                formatoEntero;


            /**
             * Importes.
             */
            [
                "totalRecaudadoPDF",
                "comision",
                "ivaComision",
                "retencionRG3130",
                "efectivo",
                "debito",
                "pagosQR",
                "importeBrutoLiquidaciones",
                "diferenciaImporte"
            ].forEach(key => {
                row.getCell(key).numFmt =
                    formatoMoneda;
            });


            /**
             * Resaltamos diferencias.
             */
            if (
                Math.abs(
                    Number(
                        resultado
                            .diferenciaImporte ||
                        0
                    )
                ) > 0.01
            ) {
                row.getCell(
                    "diferenciaImporte"
                ).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb:
                            "FFFFC7CE"
                    }
                };
            }


            if (
                Number(
                    resultado
                        .diferenciaRegistros ||
                    0
                ) !== 0
            ) {
                row.getCell(
                    "diferenciaRegistros"
                ).fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: {
                        argb:
                            "FFFFC7CE"
                    }
                };
            }


            /**
             * Estado.
             */
            aplicarEstiloEstado(
                row.getCell("estado"),
                resultado.estado
            );
        }
    );


    /**
     * Fijamos encabezado.
     */
    worksheet.views = [
        {
            state: "frozen",
            ySplit: 1
        }
    ];


    /**
     * Filtro automático.
     */
    worksheet.autoFilter = {
        from: "A1",
        to: "P1"
    };


    /**
     * Generamos buffer.
     */
    const buffer =
        await workbook.xlsx.writeBuffer();


    return buffer;
}


module.exports = {
    generarExcelConciliacion
};