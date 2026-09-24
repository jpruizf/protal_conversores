const ExcelJS = require("exceljs");


/* ========================================================
   UTILIDADES
======================================================== */

function aImporte(centavos) {
    const numero =
        Number(centavos);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return numero / 100;
}


function aplicarFormatoMoneda(
    worksheet,
    columnas
) {

    for (
        const columna
        of columnas
    ) {

        worksheet
            .getColumn(columna)
            .numFmt =
                '$ #,##0.00;[Red]-$ #,##0.00';
    }
}


function ajustarColumnas(
    worksheet
) {

    worksheet.columns.forEach(
        columna => {

            let ancho = 12;

            columna.eachCell(
                {
                    includeEmpty: true
                },
                cell => {

                    const longitud =
                        String(
                            cell.value ?? ""
                        ).length;

                    ancho =
                        Math.max(
                            ancho,
                            longitud + 2
                        );
                }
            );

            columna.width =
                Math.min(
                    ancho,
                    35
                );
        }
    );
}


/* ========================================================
   MAYOR ↔ LIQUIDACIONES
======================================================== */

function crearHojaMayorLiquidaciones(
    workbook,
    resultado
) {

    const worksheet =
        workbook.addWorksheet(
            "Mayor vs Liquidaciones"
        );


    worksheet.columns = [
        {
            header: "ASIENTO",
            key: "asiento"
        },
        {
            header: "FECHA MAYOR",
            key: "fecha"
        },
        {
            header: "MAYOR",
            key: "mayor"
        },
        {
            header: "BRUTO LIQUIDACIONES",
            key: "bruto"
        },
        {
            header: "NETO LIQUIDACIONES",
            key: "neto"
        },
        {
            header: "DIFERENCIA",
            key: "diferencia"
        },
        {
            header: "CANT. LIQ.",
            key: "cantidad"
        },
        {
            header: "RANGO DÍAS",
            key: "rango"
        },
        {
            header: "ESTADO",
            key: "estado"
        }
    ];


    for (
        const item
        of resultado.mayorLiquidaciones
    ) {

        const mayor =
            aImporte(
                item.mayorCentavos
            );

        const bruto =
            aImporte(
                item
                    .brutoLiquidacionesCentavos
            );


        worksheet.addRow({

            asiento:
                item.asiento,

            fecha:
                item.fecha,

            mayor,

            bruto,

            neto:
                aImporte(
                    item
                        .netoLiquidacionesCentavos
                ),

            diferencia:
                mayor - bruto,

            cantidad:
                item
                    .cantidadLiquidaciones,

            rango:
                item.rangoDias ?? "",

            estado:
                item.estado
        });
    }


    worksheet.getRow(1).font = {
        bold: true
    };


    aplicarFormatoMoneda(
        worksheet,
        [
            "C",
            "D",
            "E",
            "F"
        ]
    );


    ajustarColumnas(
        worksheet
    );


    worksheet.autoFilter = {
        from: "A1",
        to: "I1"
    };
}


/* ========================================================
   DETALLE DE LIQUIDACIONES UTILIZADAS
======================================================== */

function crearHojaDetalleUsadas(
    workbook,
    resultado
) {

    const worksheet =
        workbook.addWorksheet(
            "Detalle Liq Usadas"
        );


    worksheet.columns = [
        {
            header: "ASIENTO",
            key: "asiento"
        },
        {
            header: "FECHA MAYOR",
            key: "fechaMayor"
        },
        {
            header: "FECHA LIQUIDACIÓN",
            key: "fechaLiquidacion"
        },
        {
            header: "BRUTO",
            key: "bruto"
        },
        {
            header: "NETO",
            key: "neto"
        },
        {
            header: "DISTANCIA DÍAS",
            key: "distancia"
        }
    ];


    for (
        const resultadoMayor
        of resultado.mayorLiquidaciones
    ) {

        for (
            const liquidacion
            of resultadoMayor.liquidaciones
        ) {

            worksheet.addRow({

                asiento:
                    resultadoMayor.asiento,

                fechaMayor:
                    resultadoMayor.fecha,

                fechaLiquidacion:
                    liquidacion.fecha,

                bruto:
                    aImporte(
                        liquidacion
                            .brutoCentavos
                    ),

                neto:
                    aImporte(
                        liquidacion
                            .netoCentavos
                    ),

                distancia:
                    liquidacion
                        .distanciaDias ?? ""
            });
        }
    }


    worksheet.getRow(1).font = {
        bold: true
    };


    aplicarFormatoMoneda(
        worksheet,
        [
            "D",
            "E"
        ]
    );


    ajustarColumnas(
        worksheet
    );
}


/* ========================================================
   LIQUIDACIONES SIN USAR
======================================================== */

function crearHojaLiquidacionesSinUsar(
    workbook,
    resultado
) {

    const worksheet =
        workbook.addWorksheet(
            "Liquidaciones sin usar"
        );


    worksheet.columns = [
        {
            header: "FECHA",
            key: "fecha"
        },
        {
            header: "BRUTO",
            key: "bruto"
        },
        {
            header: "NETO",
            key: "neto"
        }
    ];


    for (
        const liquidacion
        of resultado.liquidacionesSinUsar
    ) {

        worksheet.addRow({

            fecha:
                liquidacion.fecha,

            bruto:
                aImporte(
                    liquidacion
                        .brutoCentavos
                ),

            neto:
                aImporte(
                    liquidacion
                        .netoCentavos
                )
        });
    }


    worksheet.getRow(1).font = {
        bold: true
    };


    aplicarFormatoMoneda(
        worksheet,
        [
            "B",
            "C"
        ]
    );


    ajustarColumnas(
        worksheet
    );
}


/* ========================================================
   LIQUIDACIONES ↔ BANCO
======================================================== */

function crearHojaBanco(
    workbook,
    resultado
) {

    const worksheet =
        workbook.addWorksheet(
            "Resumen vs Banco"
        );


    worksheet.columns = [
        {
            header: "FECHA DE PAGO",
            key: "fecha"
        },
        {
            header: "BRUTO LIQUIDACIÓN",
            key: "bruto"
        },
        {
            header: "NETO LIQUIDACIÓN",
            key: "neto"
        },
        {
            header: "BANCO",
            key: "banco"
        },
        {
            header: "DIFERENCIA",
            key: "diferencia"
        },
        {
            header: "CANT. MOV. BANCO",
            key: "cantidadBanco"
        },
        {
            header: "RANGO DÍAS",
            key: "rango"
        },
        {
            header: "ESTADO",
            key: "estado"
        }
    ];


    for (
        const item
        of resultado.banco
    ) {

        worksheet.addRow({

            fecha:
                item.fecha,

            bruto:
                aImporte(
                    item
                        .brutoLiquidacionCentavos
                ),

            neto:
                aImporte(
                    item
                        .netoLiquidacionCentavos
                ),

            banco:
                aImporte(
                    item
                        .bancoCentavos
                ),

            diferencia:
                aImporte(
                    item
                        .diferenciaCentavos
                ),

            cantidadBanco:
                item
                    .cantidadMovimientosBanco,

            rango:
                item.rangoDias ?? "",

            estado:
                item.estado
        });
    }


    worksheet.getRow(1).font = {
        bold: true
    };


    aplicarFormatoMoneda(
        worksheet,
        [
            "B",
            "C",
            "D",
            "E"
        ]
    );


    ajustarColumnas(
        worksheet
    );


    worksheet.autoFilter = {
        from: "A1",
        to: "H1"
    };
}



/* ========================================================
   GENERACIÓN PRINCIPAL
======================================================== */

async function generarExcelResultadoConciliacion(
    resultado,
    mayor,
    liquidaciones,
    banco
) {

    const workbook =
        new ExcelJS.Workbook();


    workbook.creator =
        "INTERREDES";

    workbook.title =
        "Resultado Conciliación";


    crearHojaMayorLiquidaciones(
        workbook,
        resultado
    );


    crearHojaDetalleUsadas(
        workbook,
        resultado
    );


    crearHojaLiquidacionesSinUsar(
        workbook,
        resultado
    );


    crearHojaBanco(
        workbook,
        resultado
    );


    return workbook.xlsx
        .writeBuffer();
}


module.exports = {
    generarExcelResultadoConciliacion
};