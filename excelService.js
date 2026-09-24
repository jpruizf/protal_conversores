const ExcelJS = require("exceljs");


/**
 * ============================================================
 * EXCEL SERVICE
 * RESUMEN VISA BUSINESS - BANCO GALICIA
 * ============================================================
 *
 * Responsabilidad:
 *
 * - Recibir el objeto generado por parserResumen.js
 * - Crear el libro Excel
 * - Crear una hoja por mes de facturación
 * - Insertar movimientos
 * - Insertar trailer de control
 *
 * NO parsea PDF.
 * NO detecta entidades.
 * NO levanta Express.
 * ============================================================
 */


/**
 * Devuelve un nombre de hoja válido para Excel.
 *
 * Excel limita los nombres a 31 caracteres
 * y no permite algunos caracteres especiales.
 *
 * @param {String} nombre
 * @returns {String}
 */
function normalizarNombreHoja(nombre) {

    let resultado =
        String(
            nombre ||
            "RESUMEN"
        )
            .replace(
                /[\\/*?:[\]]/g,
                ""
            )
            .trim();


    if (!resultado) {
        resultado =
            "RESUMEN";
    }


    return resultado.substring(
        0,
        31
    );
}


/**
 * Estilos reutilizables.
 */
const estilos = {

    titulo: {

        font: {
            name: "Segoe UI",
            size: 14,
            bold: true
        },

        alignment: {
            horizontal: "center",
            vertical: "middle"
        }

    },


    subtitulo: {

        font: {
            name: "Segoe UI",
            size: 10,
            bold: true
        }

    },


    encabezado: {

        font: {
            name: "Segoe UI",
            size: 10,
            bold: true
        },

        alignment: {
            horizontal: "center",
            vertical: "middle"
        }

    },


    celda: {

        font: {
            name: "Segoe UI",
            size: 10
        },

        alignment: {
            vertical: "middle"
        }

    },


    trailerTitulo: {

        font: {
            name: "Segoe UI",
            size: 11,
            bold: true
        }

    },


    trailerEtiqueta: {

        font: {
            name: "Segoe UI",
            size: 10,
            bold: true
        }

    }

};


/**
 * Aplica borde simple a una celda.
 *
 * @param {Object} celda
 */
function aplicarBorde(
    celda
) {

    celda.border = {

        top: {
            style: "thin"
        },

        left: {
            style: "thin"
        },

        bottom: {
            style: "thin"
        },

        right: {
            style: "thin"
        }

    };

}


/**
 * Configura los anchos de columnas.
 *
 * @param {Object} worksheet
 */
function configurarColumnas(
    worksheet
) {

    worksheet.columns = [

        {
            key: "fecha",
            width: 14
        },

        {
            key: "referencia",
            width: 58
        },

        {
            key: "pesos",
            width: 18
        },

        {
            key: "dolares",
            width: 18
        },

        {
            key: "tarjeta",
            width: 14
        },

        {
            key: "asiento",
            width: 14
        }

    ];

}


/**
 * Inserta encabezado general del resumen.
 *
 * @param {Object} worksheet
 * @param {Object} resumen
 */
function insertarEncabezadoResumen(
    worksheet,
    resumen
) {

    worksheet.mergeCells(
        "A1:F1"
    );


    const titulo =
        worksheet.getCell(
            "A1"
        );


    titulo.value =
        `RESUMEN VISA BUSINESS - ${resumen.mesFacturacion || ""}`;


    Object.assign(
        titulo,
        estilos.titulo
    );


    worksheet.getRow(
        1
    ).height = 24;


    /**
     * Datos generales.
     */
    worksheet.getCell(
        "A3"
    ).value =
        "ENTE";


    worksheet.getCell(
        "B3"
    ).value =
        resumen.ente ||
        "";


    worksheet.getCell(
        "D3"
    ).value =
        "TARJETA";


    worksheet.getCell(
        "E3"
    ).value =
        resumen.tarjeta ||
        "";


    worksheet.getCell(
        "A4"
    ).value =
        "N° RESUMEN";


    worksheet.getCell(
        "B4"
    ).value =
        resumen.numeroResumen ||
        "";


    worksheet.getCell(
        "D4"
    ).value =
        "CIERRE ACTUAL";


    worksheet.getCell(
        "E4"
    ).value =
        resumen.ciclo?.cierreActual ||
        "";


    worksheet.getCell(
        "A5"
    ).value =
        "VENCIMIENTO ACTUAL";


    worksheet.getCell(
        "B5"
    ).value =
        resumen.ciclo?.vencimientoActual ||
        "";


    worksheet.getCell(
        "D5"
    ).value =
        "MES FACTURACIÓN";


    worksheet.getCell(
        "E5"
    ).value =
        resumen.mesFacturacion ||
        "";


    /**
     * Estilo etiquetas.
     */
    [
        "A3",
        "D3",
        "A4",
        "D4",
        "A5",
        "D5"
    ].forEach(
        referencia => {

            Object.assign(
                worksheet.getCell(
                    referencia
                ),
                estilos.subtitulo
            );

        }
    );

}


/**
 * Inserta encabezado de tabla.
 *
 * @param {Object} worksheet
 * @returns {Number}
 */
function insertarEncabezadoTabla(
    worksheet
) {

    const fila =
        8;


    const valores = [

        "FECHA",

        "REFERENCIA / DETALLE",

        "IMPORTE PESOS",

        "IMPORTE DÓLARES",

        "TARJETA",

        "ASIENTO"

    ];


    valores.forEach(
        (
            valor,
            indice
        ) => {

            const celda =
                worksheet.getCell(
                    fila,
                    indice + 1
                );


            celda.value =
                valor;


            Object.assign(
                celda,
                estilos.encabezado
            );


            aplicarBorde(
                celda
            );

        }
    );


    worksheet.getRow(
        fila
    ).height =
        22;


    return fila;
}


/**
 * Inserta movimientos del resumen.
 *
 * @param {Object} worksheet
 * @param {Array} movimientos
 * @param {Number} filaInicial
 * @returns {Number}
 */
function insertarMovimientos(
    worksheet,
    movimientos,
    filaInicial
) {

    let filaActual =
        filaInicial;


    for (
        const movimiento of movimientos
    ) {

        const fila =
            worksheet.getRow(
                filaActual
            );


        fila.getCell(
            1
        ).value =
            movimiento.fecha ||
            "";


        fila.getCell(
            2
        ).value =
            movimiento.referencia ||
            "";


        fila.getCell(
            3
        ).value =
            Number(
                movimiento.importePesos
            ) ||
            0;


        fila.getCell(
            4
        ).value =
            Number(
                movimiento.importeDolares
            ) ||
            0;


        fila.getCell(
            5
        ).value =
            movimiento.tarjeta ||
            "";


        fila.getCell(
            6
        ).value =
            movimiento.asiento ||
            "";


        /**
         * Formato de importes.
         */
        fila.getCell(
            3
        ).numFmt =
            '#,##0.00;[Red]-#,##0.00';


        fila.getCell(
            4
        ).numFmt =
            '#,##0.00;[Red]-#,##0.00';


        /**
         * Estilo general.
         */
        for (
            let columna = 1;
            columna <= 6;
            columna++
        ) {

            const celda =
                fila.getCell(
                    columna
                );


            Object.assign(
                celda,
                estilos.celda
            );


            aplicarBorde(
                celda
            );

        }


        fila.getCell(
            1
        ).alignment = {

            horizontal: "center",
            vertical: "middle"

        };


        fila.getCell(
            3
        ).alignment = {

            horizontal: "right",
            vertical: "middle"

        };


        fila.getCell(
            4
        ).alignment = {

            horizontal: "right",
            vertical: "middle"

        };


        filaActual++;

    }


    return filaActual;
}


/**
 * Calcula totales de los movimientos.
 *
 * Estos NO reemplazan los totales
 * informados por el resumen.
 *
 * Son simplemente un control del contenido
 * que efectivamente fue enviado al Excel.
 *
 * @param {Array} movimientos
 * @returns {Object}
 */
function calcularTotalesMovimientos(
    movimientos
) {

    return movimientos.reduce(

        (
            acumulado,
            movimiento
        ) => {

            acumulado.pesos +=

                Number(
                    movimiento.importePesos
                ) ||
                0;


            acumulado.dolares +=

                Number(
                    movimiento.importeDolares
                ) ||
                0;


            return acumulado;

        },

        {
            pesos: 0,
            dolares: 0
        }

    );
}


/**
 * Inserta trailer / bloque de control.
 *
 * @param {Object} worksheet
 * @param {Object} resumen
 * @param {Number} filaInicial
 */
function insertarTrailer(
    worksheet,
    resumen,
    filaInicial
) {

    const totalesMovimientos =
        calcularTotalesMovimientos(
            resumen.movimientos ||
            []
        );


    let filaActual =
        filaInicial + 1;


    worksheet.mergeCells(
        filaActual,
        1,
        filaActual,
        6
    );


    const titulo =
        worksheet.getCell(
            filaActual,
            1
        );


    titulo.value =
        "TRAILER / CONTROL";


    Object.assign(
        titulo,
        estilos.trailerTitulo
    );


    filaActual +=
        2;


    /**
     * Total comisiones / gastos.
     */
    worksheet.getCell(
        filaActual,
        2
    ).value =
        "TOTAL COMISIONES / GASTOS";


    worksheet.getCell(
        filaActual,
        3
    ).value =
        Number(
            resumen.totalComisionesGastos
        ) ||
        0;


    filaActual++;


    /**
     * Total movimientos en pesos.
     */
    worksheet.getCell(
        filaActual,
        2
    ).value =
        "TOTAL MOVIMIENTOS PESOS";


    worksheet.getCell(
        filaActual,
        3
    ).value =
        totalesMovimientos.pesos;


    filaActual++;


    /**
     * Total movimientos dólares.
     */
    worksheet.getCell(
        filaActual,
        2
    ).value =
        "TOTAL MOVIMIENTOS DÓLARES";


    worksheet.getCell(
        filaActual,
        4
    ).value =
        totalesMovimientos.dolares;


    filaActual +=
        2;


    /**
     * Totales oficiales del resumen.
     */
    worksheet.getCell(
        filaActual,
        2
    ).value =
        "TOTAL RESUMEN PESOS";


    worksheet.getCell(
        filaActual,
        3
    ).value =
        Number(
            resumen.totalPesos
        ) ||
        0;


    filaActual++;


    worksheet.getCell(
        filaActual,
        2
    ).value =
        "TOTAL RESUMEN DÓLARES";


    worksheet.getCell(
        filaActual,
        4
    ).value =
        Number(
            resumen.totalDolares
        ) ||
        0;


    /**
     * Formato.
     */
    for (
        let fila =
            filaInicial + 3;
        fila <= filaActual;
        fila++
    ) {

        const etiqueta =
            worksheet.getCell(
                fila,
                2
            );


        if (
            etiqueta.value
        ) {

            Object.assign(
                etiqueta,
                estilos.trailerEtiqueta
            );

        }


        worksheet.getCell(
            fila,
            3
        ).numFmt =
            '#,##0.00;[Red]-#,##0.00';


        worksheet.getCell(
            fila,
            4
        ).numFmt =
            '#,##0.00;[Red]-#,##0.00';

    }

}


/**
 * Aplica algunas configuraciones
 * visuales generales.
 *
 * @param {Object} worksheet
 */
function configurarHoja(
    worksheet
) {

    worksheet.views = [

        {
            state: "frozen",
            ySplit: 8
        }

    ];


    worksheet.pageSetup = {

        orientation:
            "landscape",

        fitToPage:
            true,

        fitToWidth:
            1,

        fitToHeight:
            0

    };

}


/**
 * Genera una hoja a partir
 * de un resumen parseado.
 *
 * @param {Object} workbook
 * @param {Object} resumen
 */
function generarHojaResumen(
    workbook,
    resumen
) {

    const nombreHoja =
        normalizarNombreHoja(
            resumen.mesFacturacion
        );


    const worksheet =
        workbook.addWorksheet(
            nombreHoja
        );


    configurarColumnas(
        worksheet
    );


    configurarHoja(
        worksheet
    );


    insertarEncabezadoResumen(
        worksheet,
        resumen
    );


    const filaEncabezado =
        insertarEncabezadoTabla(
            worksheet
        );


    const siguienteFila =
        insertarMovimientos(

            worksheet,

            resumen.movimientos ||
            [],

            filaEncabezado + 1

        );


    insertarTrailer(
        worksheet,
        resumen,
        siguienteFila
    );


    return worksheet;
}


/**
 * ============================================================
 * FUNCIÓN PRINCIPAL
 * ============================================================
 *
 * Puede recibir:
 *
 * 1 resumen:
 *
 * generarExcelResumen(resumen)
 *
 * o varios:
 *
 * generarExcelResumen([
 *     resumenAbril,
 *     resumenAgosto
 * ])
 *
 * Cada resumen genera una hoja.
 *
 * @param {Object|Array} datos
 * @returns {Promise<Buffer>}
 */
async function generarExcelResumen(
    datos
) {

    if (!datos) {

        throw new Error(
            "No se recibieron datos para generar el Excel."
        );

    }


    const resumenes =
        Array.isArray(
            datos
        )
            ? datos
            : [datos];


    if (
        resumenes.length === 0
    ) {

        throw new Error(
            "No existen resúmenes para generar."
        );

    }


    const workbook =
        new ExcelJS.Workbook();


    workbook.creator =
        "INTERREDES";


    workbook.company =
        "INTERREDES";


    workbook.subject =
        "Conversión de resumen VISA BUSINESS";


    workbook.title =
        "Resumen VISA BUSINESS";


    workbook.created =
        new Date();


    for (
        const resumen of resumenes
    ) {

        if (
            !resumen ||
            !resumen.mesFacturacion
        ) {

            throw new Error(
                "Se encontró un resumen sin mes de facturación."
            );

        }


        generarHojaResumen(
            workbook,
            resumen
        );

    }


    const buffer =
        await workbook.xlsx.writeBuffer();


    return buffer;
}


/**
 * ============================================================
 * EXPORTACIONES
 * ============================================================
 */

module.exports = {

    generarExcelResumen,

    generarHojaResumen,

    normalizarNombreHoja,

    calcularTotalesMovimientos

};