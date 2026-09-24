const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
    normalizarComprobante
} = require(
    "./normalizadores/comprobantes"
);

/***
 * Importo la funcion GenerarExcelServiciosMultiple
 * 
 */
const {
    generarExcelServiciosMultiple
} = require(
    "./generarExcelServiciosMultiple"
);


/**
 * Convierte un nombre de impuesto
 * en nombre de columna legible.
 */
function nombreColumnaImpuesto(
    concepto
) {

    return (
        "IMPUESTO - " +
        String(
            concepto || ""
        )
            .trim()
            .replace(
                /\s+/g,
                " "
            )
            .toUpperCase()
    );
}


/**
 * Genera Excel contable de servicios.
 */
function generarExcelServicios(
    datos,
    carpetaSalida
) {

    if (
        !datos ||
        typeof datos !== "object"
    ) {
        throw new Error(
            "No se recibieron datos válidos para generar el Excel de servicios."
        );
    }


    if (
        !fs.existsSync(
            carpetaSalida
        )
    ) {
        fs.mkdirSync(
            carpetaSalida,
            {
                recursive: true
            }
        );
    }


    /*
     * Modelo contable.
     */
    const comprobante =
        normalizarComprobante(
            datos
        );


    /*
     * =====================================================
     * DATOS PRINCIPALES
     * =====================================================
     */

    const fila = {

        "FECHA DE EMISIÓN":
            comprobante
                .fechaEmision,


        "TIPO DE COMPROBANTE":
            comprobante
                .tipoComprobante,


        "PUNTO DE VENTA":
            comprobante
                .puntoVenta,


        "NÚMERO DE COMPROBANTE":
            comprobante
                .numeroComprobante,


        "TIPO DOC. VENDEDOR":
            comprobante
                .tipoDocVendedor,


        "NRO. DOC. VENDEDOR":
            comprobante
                .nroDocVendedor,


        "DENOMINACIÓN VENDEDOR":
            comprobante
                .denominacionVendedor,


        "IMPORTE TOTAL":
            comprobante
                .importeTotal,
        
        "TIPO DE CAMBIO":
        comprobante.tipoCambio
    };


    /*
     * =====================================================
     * DETALLE COMPLETO DE IMPUESTOS
     * =====================================================
     *
     * Cada impuesto encontrado en la factura
     * genera una columna independiente.
     */

    if (
        Array.isArray(
            comprobante.impuestos
        )
    ) {

        comprobante.impuestos
            .forEach(
                (impuesto) => {

                    if (
                        !impuesto ||
                        !impuesto.concepto
                    ) {
                        return;
                    }


                    const columna =
                        nombreColumnaImpuesto(
                            impuesto.concepto
                        );


                    fila[columna] =
                        impuesto.importe;
                }
            );
    }


    /*
     * =====================================================
     * TOTALES CONTABLES
     * =====================================================
     */


    fila[
        "TOTAL IVA"
    ] =
        comprobante
            .totalIVA;


    fila[
        "CRÉDITO FISCAL COMPUTABLE"
    ] =
        comprobante
            .creditoFiscalComputable;


    fila[
        "PERCEPCIONES IB"
    ] =
        comprobante
            .percepcionesIB;


    fila[
        "IMPUESTO INTERNO"
    ] =
        comprobante
            .impuestoInterno;


    /*
     * =====================================================
     * CREAR HOJA
     * =====================================================
     */

    const hoja =
        XLSX.utils.json_to_sheet(
            [fila]
        );


    /*
     * Anchos automáticos.
     */
    const nombresColumnas =
        Object.keys(
            fila
        );


    hoja["!cols"] =
        nombresColumnas.map(
            (nombre) => ({

                wch: Math.max(
                    15,
                    Math.min(
                        nombre.length +
                        3,
                        38
                    )
                )
            })
        );


    /*
     * Mantener como texto:
     *
     * Punto de venta
     * Número comprobante
     * CUIT
     */
    const columnasTexto = [

        "PUNTO DE VENTA",

        "NÚMERO DE COMPROBANTE",

        "NRO. DOC. VENDEDOR"
    ];


    columnasTexto.forEach(
        (nombre) => {

            const indice =
                nombresColumnas
                    .indexOf(
                        nombre
                    );


            if (indice === -1) {
                return;
            }


            const columna =
                XLSX.utils
                    .encode_col(
                        indice
                    );


            const celda =
                hoja[
                    `${columna}2`
                ];


            if (celda) {

                celda.t = "s";

                celda.v =
                    String(
                        celda.v ??
                        ""
                    );
            }
        }
    );


    /*
     * Formato monetario para todas
     * las columnas numéricas fiscales.
     */
    nombresColumnas.forEach(
        (nombre, indice) => {

            const noEsMonetaria = [

                "FECHA DE EMISIÓN",

                "TIPO DE COMPROBANTE",

                "PUNTO DE VENTA",

                "NÚMERO DE COMPROBANTE",

                "TIPO DOC. VENDEDOR",

                "NRO. DOC. VENDEDOR",

                "DENOMINACIÓN VENDEDOR",

                "TIPO DE CAMBIO"
            ].includes(
                nombre
            );


            if (noEsMonetaria) {
                return;
            }


            const columna =
                XLSX.utils
                    .encode_col(
                        indice
                    );


            const celda =
                hoja[
                    `${columna}2`
                ];
            
/*
* Crédito Fiscal Computable:
* mostrar hasta 8 decimales.
*/

        if (celda && typeof celda.v === "number") 
        {
            if (nombre === "CRÉDITO FISCAL COMPUTABLE") 
            {
                celda.z =
                '$ #,##0.00000000;-$ #,##0.00000000';
            } 
            else
                {
                    celda.z =
                    '$ #,##0.00;-$ #,##0.00';
                }
        }
            
        }
);


    /*
     * Autofiltro dinámico.
     */
    const ultimaColumna =
        XLSX.utils
            .encode_col(
                nombresColumnas.length -
                1
            );


    hoja["!autofilter"] = {

        ref:
            `A1:${ultimaColumna}2`
    };


    /*
     * =====================================================
     * LIBRO
     * =====================================================
     */

    const libro =
        XLSX.utils.book_new();


    XLSX.utils
        .book_append_sheet(
            libro,
            hoja,
            "Comprobantes"
        );


    /*
     * Nombre archivo.
     */
    const nombreBase =
        datos.nombreArchivoOriginal

            ? path.parse(
                datos
                    .nombreArchivoOriginal
            ).name

            : "Factura_Servicio";


    const nombreSalida =
        `${nombreBase}_Comprobante.xlsx`;


    const rutaSalida =
        path.join(
            carpetaSalida,
            nombreSalida
        );


    XLSX.writeFile(
        libro,
        rutaSalida
    );


    return rutaSalida;
}


module.exports = {
    generarExcelServicios,
    generarExcelServiciosMultiple
};