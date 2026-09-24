const ExcelJS = require("exceljs");


/**
 * Genera un Excel resumen con las liquidaciones
 * extraídas del PDF.
 *
 * @param {Array} resumenesLiquidaciones
 * @returns {Promise<Buffer>}
 */
async function generarExcelLiquidacionTarjetas(
    resumenesLiquidaciones
) {

    if (
    !Array.isArray(resumenesLiquidaciones) ||
    resumenesLiquidaciones.length === 0
) {
    throw new Error(
        "No existen resúmenes de liquidaciones para generar el Excel."
    );
}

    /**
     * Libro Excel.
     */
    const workbook =
        new ExcelJS.Workbook();


    /**
 * Formato monetario.
 */
const formatoImporte =
    '$ #,##0.00;[Red]-$ #,##0.00';


/**
 * Crea una hoja y carga todas
 * las liquidaciones correspondientes.
 */
function crearHojaResumen(
    enteRecaudador,
    tipoTarjeta,
    liquidaciones,
    numeroResumen
) {
    const nombreHoja=
     `${enteRecaudador} ${tipoTarjeta} ${numeroResumen}`;

    const worksheet =
        workbook.addWorksheet(
            nombreHoja
        );


    /**
     * Configuración de la hoja.
     */
    worksheet.views = [
        {
            state: "frozen",
            ySplit: 1,
            showGridLines: false
        }
    ];


    /**
     * Anchos de columnas.
     */
    worksheet.columns = [
        {
            key: "concepto",
            width: 48
        },
        {
            key: "importe",
            width: 20
        }
    ];


    /**
     * Título principal.
     */
    worksheet.mergeCells(
        "A1:B1"
    );


    const titulo =
        worksheet.getCell("A1");


    titulo.value =
        `RESUMEN LIQUIDACIÓN ${enteRecaudador} - ${tipoTarjeta}`;


    titulo.font = {
        name: "Segoe UI",
        size: 14,
        bold: true
    };


    titulo.alignment = {
        horizontal: "center",
        vertical: "middle"
    };


    worksheet.getRow(1).height = 28;


    /**
     * Comenzamos después del título.
     */
    let filaActual = 3;


    /**
     * Cada liquidación se apila
     * verticalmente.
     */
    liquidaciones.forEach(
        (liquidacion) => {

            /**
             * Encabezado de liquidación.
             */
            worksheet.mergeCells(
                `A${filaActual}:B${filaActual}`
            );


            const encabezado =
                worksheet.getCell(
                    `A${filaActual}`
                );


            encabezado.value =
                `LIQUIDACIÓN ${liquidacion.numeroLiquidacion}`;


            encabezado.font = {
                name: "Segoe UI",
                size: 11,
                bold: true
            };


            encabezado.alignment = {
                horizontal: "left"
            };


            filaActual++;


            /**
             * Campos del resumen.
             */
            const campos = [

                {
                    concepto:
                        "VENTAS C/DESCUENTO CONTADO",

                    valor:
                        liquidacion
                            .ventasDescuentoContado
                },

                {
                    concepto:
                        "ARANCEL",

                    valor:
                        liquidacion.arancel
                },

                {
                    concepto:
                        "IVA CRED.FISC.COMERCIO S/ARANC 21,00%",

                    valor:
                        liquidacion.ivaArancel
                },

                {
                    concepto:
                        "RETENCION ING.BRUTOS SIRTAC",

                    valor:
                        liquidacion.retencionSirtac
                },

                {
                    concepto:
                        "PERCEPCION IVA R.G. 2408 3,00 %",

                    valor:
                        liquidacion.percepcionIva
                },

                {
                    concepto:
                        "IMPORTE NETO DE PAGOS",

                    valor:
                        liquidacion.importeNetoPagos
                }

            ];


            campos.forEach(
                (campo) => {

                    const celdaConcepto =
                        worksheet.getCell(
                            `A${filaActual}`
                        );


                    const celdaImporte =
                        worksheet.getCell(
                            `B${filaActual}`
                        );


                    celdaConcepto.value =
                        campo.concepto;


                    celdaImporte.value =
                        campo.valor;


                    celdaImporte.numFmt =
                        formatoImporte;


                    celdaConcepto.font = {
                        name: "Segoe UI",
                        size: 10
                    };


                    celdaImporte.font = {
                        name: "Segoe UI",
                        size: 10
                    };


                    celdaImporte.alignment = {
                        horizontal: "right"
                    };


                    /**
                     * Destacamos el Neto.
                     */
                    if (
                        campo.concepto ===
                        "IMPORTE NETO DE PAGOS"
                    ) {

                        celdaConcepto.font = {
                            name: "Segoe UI",
                            size: 10,
                            bold: true
                        };


                        celdaImporte.font = {
                            name: "Segoe UI",
                            size: 10,
                            bold: true
                        };


                        celdaConcepto.border = {
                            top: {
                                style: "thin"
                            }
                        };


                        celdaImporte.border = {
                            top: {
                                style: "thin"
                            }
                        };
                    }


                    filaActual++;
                }
            );


            /**
             * Espacio entre liquidaciones.
             */
            filaActual++;
        }
    );
}

let cantidadHojas = 0;

const contadorResumenes = {};


for (
    const resumen
    of resumenesLiquidaciones
) {

    const {
        enteRecaudador,
        tipoTarjeta,
        liquidaciones
    } = resumen;


    const clave =
        `${enteRecaudador}_${tipoTarjeta}`;


    if (
        !contadorResumenes[clave]
    ) {
        contadorResumenes[clave] = 0;
    }


    contadorResumenes[clave]++;


    const numeroResumen =
        contadorResumenes[clave];


    crearHojaResumen(
        enteRecaudador,
        tipoTarjeta,
        liquidaciones,
        numeroResumen
    );
    cantidadHojas++;
}


if (
    cantidadHojas === 0
) {
    throw new Error(
        "No existen liquidaciones para generar el Excel."
    );
}

    /**
     * Genera el archivo en memoria.
     */
    const buffer =
        await workbook.xlsx.writeBuffer();


    return buffer;
}


module.exports = {
    generarExcelLiquidacionTarjetas
};