const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

/**
 * Genera un archivo Excel vertical con los datos obtenidos
 * del resumen de comisiones de Pago Fácil.
 *
 * @param {Object} datos Datos procesados por parserSEPSA.
 * @param {string} carpetaSalida Carpeta donde se guardará el Excel.
 * @returns {string} Ruta completa del archivo generado.
 */
function generarExcel(datos, carpetaSalida) {
    if (!datos || typeof datos !== "object") {
        throw new Error(
            "No se recibieron datos válidos para generar el Excel."
        );
    }

    if (!fs.existsSync(carpetaSalida)) {
        fs.mkdirSync(carpetaSalida, {
            recursive: true
        });
    }

    const resumen = [
        ["RESUMEN DE COMISIONES PAGO FÁCIL", ""],
        ["", ""],

        ["DATOS DEL PROCESO", ""],
        ["FECHA DE EMISIÓN", datos.fechaEmision],
        ["ARCHIVO", datos.archivoProceso],
        ["PROCESO", datos.identificadorProceso],
        ["EMPRESA", datos.empresa],
        ["CÓDIGO EMPRESA", datos.codigoEmpresa],
        ["TOTAL REGISTROS", datos.totalRegistros],

        ["", ""],
        ["MEDIOS DE PAGO", ""],
        ["EFECTIVO", datos.efectivo],
        ["DÉBITO", datos.debito],
        ["PAGOS QR", datos.pagosQR],
        ["TOTAL MEDIOS DE PAGO", datos.totalMediosPago],

        ["", ""],
        ["LIQUIDACIÓN", ""],
        ["TOTAL RECAUDADO", datos.totalRecaudado],
        ["COMISIÓN", datos.comision],
        ["IVA COMISIÓN", datos.ivaComision],
        ["RETENCIÓN RG 3130", datos.retencionRG3130],
        ["TOTAL NETO", datos.totalNeto],

        ["", ""],
        ["CONTROLES", ""],
        ["NETO CALCULADO", datos.netoCalculado],
        ["DIFERENCIA NETO", datos.diferenciaNeto],
        [
            "DIFERENCIA MEDIOS DE PAGO",
            datos.diferenciaMediosPago
        ],
        ["CONTROL NETO", datos.controlNeto],
        [
            "CONTROL MEDIOS DE PAGO",
            datos.controlMediosPago
        ]
    ];

    const hoja = XLSX.utils.aoa_to_sheet(resumen);

    hoja["!cols"] = [
        { wch: 32 },
        { wch: 28 }
    ];

    hoja["!merges"] = [
        XLSX.utils.decode_range("A1:B1"),
        XLSX.utils.decode_range("A3:B3"),
        XLSX.utils.decode_range("A11:B11"),
        XLSX.utils.decode_range("A17:B17"),
        XLSX.utils.decode_range("A25:B25")
    ];

    const filasMonetarias = [
        12,
        13,
        14,
        15,
        18,
        19,
        20,
        21,
        22,
        26,
        27,
        28
    ];

    filasMonetarias.forEach((fila) => {
        const celda = hoja[`B${fila}`];

        if (celda && typeof celda.v === "number") {
            celda.z = '$ #,##0.00;-$ #,##0.00';
        }
    });

    const celdaTotalRegistros = hoja["B9"];

    if (
        celdaTotalRegistros &&
        typeof celdaTotalRegistros.v === "number"
    ) {
        celdaTotalRegistros.z = "0";
    }

    hoja["!autofilter"] = {
        ref: "A3:B30"
    };

    const libro = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Resumen Comisiones"
    );

    const nombreBase = datos.nombreArchivoOriginal
        ? path.parse(datos.nombreArchivoOriginal).name
        : "Resumen_Comisiones";

    const nombreSalida =
        `${nombreBase}_Resumen_Comisiones.xlsx`;

    const rutaSalida = path.join(
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
    generarExcel
};