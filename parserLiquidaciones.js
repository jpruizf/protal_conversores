const ExcelJS = require("exceljs");

const {
    normalizarFecha,
    aCentavos
} = require("./normalizador");


/* ========================================================
   DETECTAR ENCABEZADO DE BLOQUE
======================================================== */

function esEncabezadoLiquidacion(row) {

    const valores =
        row.values
            .slice(1)
            .map(
                valor =>
                    String(
                        valor ?? ""
                    )
                        .trim()
                        .toUpperCase()
            );


    return (
        valores.includes("FECHA") &&
        valores.includes(
            "CANTIDAD DE TRANSACCIONES"
        ) &&
        valores.includes(
            "IMPORTE BRUTO"
        ) &&
        valores.includes(
            "GASTOS BANCARIOS"
        ) &&
        valores.includes(
            "IVA GASTOS BANCARIOS"
        ) &&
        valores.includes("FEE") &&
        valores.includes("IVA FEE") &&
        valores.includes(
            "IMPORTE NETO"
        )
    );
}


/* ========================================================
   DETECTAR FIN DE BLOQUE
======================================================== */

function esFinBloque(row) {

    const primeraCelda =
        String(
            row.getCell(1).value ?? ""
        )
            .trim()
            .toUpperCase();


    return (
        primeraCelda ===
            "TOTAL GENERAL" ||

        primeraCelda ===
            "CIERRE DEL INFORME" ||

        primeraCelda.startsWith(
            "INFORME DE LIQUIDACIÓN"
        ) ||

        primeraCelda.startsWith(
            "SAN JUAN LINK"
        )
    );
}


/* ========================================================
   PARSER PRINCIPAL
======================================================== */

async function parsearLiquidaciones(
    buffer
) {

    const workbook =
        new ExcelJS.Workbook();


    await workbook.xlsx.load(
        buffer
    );


    /* ====================================================
       BUSCAR HOJA
    ==================================================== */

    const worksheet =
        workbook.getWorksheet(
            "Liquidaciones"
        );


    if (!worksheet) {

        throw new Error(
            'No se encontró la hoja "Liquidaciones" en el archivo de liquidaciones.'
        );
    }


    const liquidaciones = [];

    let leyendoDetalle =
        false;

    let bloquesDetectados =
        0;


    /* ====================================================
       RECORRER TODA LA HOJA
    ==================================================== */

    worksheet.eachRow(
        (
            row,
            numeroFila
        ) => {

            /* =============================================
               NUEVO ENCABEZADO
            ============================================= */

            if (
                esEncabezadoLiquidacion(
                    row
                )
            ) {

                leyendoDetalle =
                    true;

                bloquesDetectados++;

                return;
            }


            /*
             * Hasta encontrar un encabezado,
             * ignoramos la fila.
             */
            if (!leyendoDetalle) {
                return;
            }


            /* =============================================
               FIN DEL BLOQUE
            ============================================= */

            if (
                esFinBloque(
                    row
                )
            ) {

                leyendoDetalle =
                    false;

                return;
            }


            /* =============================================
               LEER DATOS
            ============================================= */

            const fecha =
                row.getCell(1).value;

            const bruto =
                row.getCell(3).value;

            const gastos =
                row.getCell(4).value;

            const ivaGastos =
                row.getCell(5).value;

            const fee =
                row.getCell(6).value;

            const ivaFee =
                row.getCell(7).value;

            const neto =
                row.getCell(8).value;


            /*
             * Si no tenemos fecha o bruto,
             * no estamos ante una fila válida
             * de detalle.
             */
            if (
                !fecha ||
                bruto === null ||
                bruto === undefined
            ) {
                return;
            }


            /* =============================================
               NORMALIZAR
            ============================================= */

            liquidaciones.push({

                id:
                    liquidaciones.length,

                fecha:
                    normalizarFecha(
                        fecha
                    ),

                brutoCentavos:
                    aCentavos(
                        bruto
                    ),

                gastosCentavos:
                    aCentavos(
                        gastos
                    ),

                ivaGastosCentavos:
                    aCentavos(
                        ivaGastos
                    ),

                feeCentavos:
                    aCentavos(
                        fee
                    ),

                ivaFeeCentavos:
                    aCentavos(
                        ivaFee
                    ),

                netoCentavos:
                    aCentavos(
                        neto
                    ),

                utilizada:
                    false
            });
        }
    );


    /* ====================================================
       VALIDACIONES
    ==================================================== */

    if (
        bloquesDetectados === 0
    ) {

        throw new Error(
            "No se encontraron bloques de liquidaciones válidos en la hoja Liquidaciones."
        );
    }


    if (
        liquidaciones.length === 0
    ) {

        throw new Error(
            "No se encontraron registros de liquidaciones válidos."
        );
    }


    /* ====================================================
       ORDENAR
    ==================================================== */

    liquidaciones.sort(
        (a, b) =>
            a.fecha.localeCompare(
                b.fecha
            )
    );


    /* ====================================================
       LOGS DE DIAGNÓSTICO
    ==================================================== */

    console.log(
        "\n--- PARSER LIQUIDACIONES ---"
    );

    console.log(
        `[LIQUIDACIONES] Bloques detectados: ${bloquesDetectados}`
    );

    console.log(
        `[LIQUIDACIONES] Registros leídos: ${liquidaciones.length}`
    );


    console.log(
        "\n--- PRIMERAS LIQUIDACIONES LEÍDAS ---"
    );


    liquidaciones
        .slice(0, 15)
        .forEach(
            (liq) => {

                console.log(
                    `FECHA=${liq.fecha} | ` +
                    `BRUTO=${(
                        liq.brutoCentavos /
                        100
                    ).toFixed(2)} | ` +
                    `NETO=${(
                        liq.netoCentavos /
                        100
                    ).toFixed(2)}`
                );
            }
        );
    
/* ====================================================
       LOGS DE DIAGNÓSTICO
    ==================================================== */

    console.log(
    "\n--- LIQUIDACIONES 21/05 AL 27/05 ---"
);

const liquidacionesControl =
    liquidaciones.filter(
        liq =>
            liq.fecha >= "2026-05-21" &&
            liq.fecha <= "2026-05-27"
    );


console.log(
    `[CONTROL] Cantidad: ${liquidacionesControl.length}`
);


let totalBrutoControl = 0;
let totalNetoControl = 0;


liquidacionesControl.forEach(
    liq => {

        totalBrutoControl +=
            liq.brutoCentavos;

        totalNetoControl +=
            liq.netoCentavos;


        console.log(
            `FECHA=${liq.fecha} | ` +
            `BRUTO=${(
                liq.brutoCentavos / 100
            ).toFixed(2)} | ` +
            `NETO=${(
                liq.netoCentavos / 100
            ).toFixed(2)}`
        );
    }
);


console.log(
    `[CONTROL] BRUTO TOTAL=${(
        totalBrutoControl / 100
    ).toFixed(2)}`
);

console.log(
    `[CONTROL] NETO TOTAL=${(
        totalNetoControl / 100
    ).toFixed(2)}`
);

/* ==============================================
   DIAGNÓSTICO RANGO REAL DE LIQUIDACIONES
============================================== */

console.log(
    `[LIQUIDACIONES] RANGO REAL: ` +
    `${liquidaciones[0]?.fecha} → ` +
    `${liquidaciones[
        liquidaciones.length - 1
    ]?.fecha}`
);

    


    return liquidaciones;
}

/* ========================================================
   PARSER RESUMEN PAGO FÁCIL
======================================================== */

async function parsearResumenLiquidaciones(
    buffer
) {

    const workbook =
        new ExcelJS.Workbook();


    await workbook.xlsx.load(
        buffer
    );


    /* ====================================================
       BUSCAR HOJA
    ==================================================== */

    const worksheet =
        workbook.getWorksheet(
            "Resumen Pago Fácil"
        );


    if (!worksheet) {

        throw new Error(
            'No se encontró la hoja "Resumen Pago Fácil" en el archivo de liquidaciones.'
        );
    }


    const resumenLiquidaciones = [];

    let filaEncabezados =
        null;

    let columnas =
        {};


    /* ====================================================
       BUSCAR ENCABEZADOS
    ==================================================== */

    worksheet.eachRow(
        (
            row,
            numeroFila
        ) => {

            if (
                filaEncabezados
            ) {
                return;
            }


            const valores =
                row.values
                    .slice(1)
                    .map(
                        valor =>
                            String(
                                valor ?? ""
                            )
                                .trim()
                                .toUpperCase()
                    );


            if (
                valores.includes(
                    "FECHA DE PAGO"
                ) &&
                valores.includes(
                    "TOTAL BRUTO"
                ) &&
                valores.includes(
                    "IMPORTE NETO"
                )
            ) {

                filaEncabezados =
                    numeroFila;


                row.eachCell(
                    (
                        cell,
                        numeroColumna
                    ) => {

                        const nombre =
                            String(
                                cell.value ?? ""
                            )
                                .trim()
                                .toUpperCase();


                        if (nombre) {

                            columnas[
                                nombre
                            ] =
                                numeroColumna;
                        }
                    }
                );
            }
        }
    );


    if (
        !filaEncabezados
    ) {

        throw new Error(
            'No se encontraron los encabezados esperados en la hoja "Resumen Pago Fácil".'
        );
    }


    /* ====================================================
       VALIDAR COLUMNAS
    ==================================================== */

    const requeridas = [
        "FECHA DE PAGO",
        "TOTAL BRUTO",
        "IMPORTE NETO"
    ];


    for (
        const nombre
        of requeridas
    ) {

        if (
            !columnas[nombre]
        ) {

            throw new Error(
                `No se encontró la columna "${nombre}" en la hoja Resumen Pago Fácil.`
            );
        }
    }


    /* ====================================================
       LEER RESUMEN
    ==================================================== */

    worksheet.eachRow(
        (
            row,
            numeroFila
        ) => {

            if (
                numeroFila <=
                filaEncabezados
            ) {
                return;
            }


            const fecha =
                row.getCell(
                    columnas[
                        "FECHA DE PAGO"
                    ]
                ).value;


            const bruto =
                row.getCell(
                    columnas[
                        "TOTAL BRUTO"
                    ]
                ).value;


            const neto =
                row.getCell(
                    columnas[
                        "IMPORTE NETO"
                    ]
                ).value;


            if (
                !fecha ||
                bruto === null ||
                bruto === undefined ||
                neto === null ||
                neto === undefined
            ) {
                return;
            }


            resumenLiquidaciones.push({

                id:
                    resumenLiquidaciones
                        .length,

                fecha:
                    normalizarFecha(
                        fecha
                    ),

                brutoCentavos:
                    aCentavos(
                        bruto
                    ),

                netoCentavos:
                    aCentavos(
                        neto
                    ),

                utilizada:
                    false
            });
        }
    );


    if (
        resumenLiquidaciones.length ===
        0
    ) {

        throw new Error(
            'No se encontraron registros válidos en la hoja "Resumen Pago Fácil".'
        );
    }


    /* ====================================================
       ORDENAR
    ==================================================== */

    resumenLiquidaciones.sort(
        (a, b) =>
            a.fecha.localeCompare(
                b.fecha
            )
    );


    /* ====================================================
       LOGS
    ==================================================== */

    console.log(
        "\n--- RESUMEN PAGO FÁCIL LEÍDO ---"
    );


    console.log(
        `[RESUMEN] Registros: ${
            resumenLiquidaciones.length
        }`
    );


    resumenLiquidaciones.forEach(
        item => {

            console.log(
                `FECHA=${item.fecha} | ` +
                `BRUTO=${(
                    item.brutoCentavos /
                    100
                ).toFixed(2)} | ` +
                `NETO=${(
                    item.netoCentavos /
                    100
                ).toFixed(2)}`
            );
        }
    );


    return resumenLiquidaciones;
}



/* ========================================================
   EXPORTACIÓN
======================================================== */

module.exports = {
    parsearLiquidaciones,
    parsearResumenLiquidaciones
};