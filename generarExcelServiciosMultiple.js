const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const {
    normalizarComprobante
} = require(
    "./normalizadores/comprobantes"
);

/*
 * Si esta función también necesita
 * nombreColumnaImpuesto, debe estar
 * declarada/importada en este archivo.
 */


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

function generarExcelServiciosMultiple(
    listaDatos,
    carpetaSalida
) {
    if (
        !Array.isArray(listaDatos) ||
        listaDatos.length === 0
    ) {
        throw new Error(
            "No se recibieron facturas válidas para generar el Excel consolidado."
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
     * ============================================
     * 1. NORMALIZAR TODAS LAS FACTURAS
     * ============================================
     */

    const comprobantes =
        listaDatos.map(
            (datos) =>
                normalizarComprobante(
                    datos
                )
        );


    /*
     * ============================================
     * 2. ARMAR UNA FILA POR FACTURA
     * ============================================
     */

    const filas = [];

    for (const comprobante of comprobantes) {

        const fila = {

            "FECHA DE EMISIÓN":
                comprobante.fechaEmision,

            "TIPO DE COMPROBANTE":
                comprobante.tipoComprobante,

            "PUNTO DE VENTA":
                comprobante.puntoVenta,

            "NÚMERO DE COMPROBANTE":
                comprobante.numeroComprobante,

            "TIPO DOC. VENDEDOR":
                comprobante.tipoDocVendedor,

            "NRO. DOC. VENDEDOR":
                comprobante.nroDocVendedor,

            "DENOMINACIÓN VENDEDOR":
                comprobante.denominacionVendedor,

            "IMPORTE TOTAL":
                comprobante.importeTotal,

            "TIPO DE CAMBIO":
                comprobante.tipoCambio
        };


        /*
         * ========================================
         * IMPUESTOS DINÁMICOS
         * ========================================
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
         * ========================================
         * TOTALES CONTABLES
         * ========================================
         */

        fila["TOTAL IVA"] =
            comprobante.totalIVA;

        fila[
            "CRÉDITO FISCAL COMPUTABLE"
        ] =
            comprobante
                .creditoFiscalComputable;

        fila["PERCEPCIONES IB"] =
            comprobante.percepcionesIB;

        fila["IMPUESTO INTERNO"] =
            comprobante.impuestoInterno;


        filas.push(fila);
    }


    /*
     * ============================================
     * 3. CREAR UNA SOLA HOJA
     * ============================================
     */

    const hoja =
        XLSX.utils.json_to_sheet(
            filas
        );


    /*
     * ============================================
     * 4. OBTENER TODAS LAS COLUMNAS
     * ============================================
     */

    const nombresColumnas = [];

    filas.forEach(
        (fila) => {

            Object.keys(fila)
                .forEach(
                    (nombre) => {

                        if (
                            !nombresColumnas.includes(
                                nombre
                            )
                        ) {
                            nombresColumnas.push(
                                nombre
                            );
                        }
                    }
                );
        }
    );


    /*
     * ============================================
     * 5. ANCHOS
     * ============================================
     */

    hoja["!cols"] =
        nombresColumnas.map(
            (nombre) => ({

                wch: Math.max(
                    15,
                    Math.min(
                        nombre.length + 3,
                        38
                    )
                )
            })
        );


    /*
     * ============================================
     * 6. COLUMNAS TEXTO
     * ============================================
     */

    const columnasTexto = [

    "PUNTO DE VENTA",

    "NÚMERO DE COMPROBANTE",

    "NRO. DOC. VENDEDOR"
];


    columnasTexto.forEach((nombre) => {

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


        for (
            let numeroFila = 2;
            numeroFila <= filas.length + 1;
            numeroFila++
        ) {

            const celda =
                hoja[
                    `${columna}${numeroFila}`
                ];

            if (celda) {

                celda.t = "s";

                celda.v =
                    String(
                        celda.v ?? ""
                    );
            }
        }
    }
);


    /*
     * ============================================
     * 7. FORMATO MONETARIO
     * ============================================
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

            ].includes(nombre);


            if (noEsMonetaria) {
                return;
            }


            const columna =
                XLSX.utils
                    .encode_col(
                        indice
                    );


            for (
                let numeroFila = 2;
                numeroFila <= filas.length + 1;
                numeroFila++
            ) {

                const celda =
                    hoja[
                        `${columna}${numeroFila}`
                    ];


                if (celda && typeof celda.v === "number") 
                    {

                if ( nombre === "CRÉDITO FISCAL COMPUTABLE") 
                {
                    celda.z =
                        '$ #,##0.00000000;-$ #,##0.00000000';
                } 
                else {
                        celda.z =
                        '$ #,##0.00000;-$ #,##0.00000';
                    }
                }
            }
        }
    );


    /*
     * ============================================
     * 8. AUTOFILTRO
     * ============================================
     */

    const ultimaColumna =
        XLSX.utils
            .encode_col(
                nombresColumnas.length - 1
            );


    hoja["!autofilter"] = {

        ref:
            `A1:${ultimaColumna}${filas.length + 1}`
    };


    /*
     * ============================================
     * 9. CREAR LIBRO
     * ============================================
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
     * ============================================
     * 10. NOMBRE ARCHIVO
     * ============================================
     */

    const fecha =
        new Date()
            .toISOString()
            .slice(0, 10);


    const nombreSalida =
        `Facturas_Servicios_${fecha}.xlsx`;


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
    generarExcelServiciosMultiple
};