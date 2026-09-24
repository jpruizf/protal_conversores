const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
/*Definicion de columnas de manera explicita */
const COLUMNAS_REPORTE = [
    "Nro Cliente",
    "Código Principal",
    "Identificador",
    "Fecha Vencimiento",
    "Código Operación",
    "Fecha Pago",
    "Monto",
    "Código OP",
    "Fecha Proceso",
    "Tipo Pago",
    "Código Final",
    "Control",
    "Formato",
    "Fecha de Cierre",
    "Código de Cierre",
    "Total de Registros",
    "Total de Pagos",
    "Total Consolidado"
];
/*Funciones con excepciones throw catch para detectar error en el procesamiento de los 
archivos*/
function generarExcel(datos) {
    if (!Array.isArray(datos)) {
        throw new Error(
            "No se puede generar el Excel: los datos recibidos no son un array."
        );
    }

    if (datos.length === 0) {
        throw new Error(
            "No se puede generar el Excel: no se recibieron registros."
        );
    }

    /*
     * Normalizamos todas las filas para garantizar
     * que mantengan exactamente el mismo layout.
     */
    const datosNormalizados = datos.map(registro => {
        const fila = {};

        COLUMNAS_REPORTE.forEach(columna => {
            fila[columna] =
                registro[columna] !== undefined
                    ? registro[columna]
                    : "";
        });

        return fila;
    });

    const libro = XLSX.utils.book_new();

    const hoja = XLSX.utils.json_to_sheet(
        datosNormalizados,
        {
            header: COLUMNAS_REPORTE,
            skipHeader: false
        }
    );

    hoja["!cols"] = [
        { wch: 15 }, // Nro Cliente
        { wch: 18 }, // Código Principal
        { wch: 22 }, // Identificador
        { wch: 18 }, // Fecha Vencimiento
        { wch: 18 }, // Código Operación
        { wch: 15 }, // Fecha Pago
        { wch: 15 }, // Monto
        { wch: 15 }, // Código OP
        { wch: 15 }, // Fecha Proceso
        { wch: 15 }, // Tipo Pago
        { wch: 15 }, // Código Final
        { wch: 15 }, // Control
        { wch: 20 }, // Formato
        { wch: 18 }, // Fecha de Cierre
        { wch: 18 }, // Código de Cierre
        { wch: 18 }, // Total de Registros
        { wch: 15 }, // Total de Pagos
        { wch: 20 }  // Total Consolidado
    ];

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Reporte"
    );

    const carpetaSalida = path.join(
        __dirname,
        "outputs"
    );

    if (!fs.existsSync(carpetaSalida)) {
        fs.mkdirSync(
            carpetaSalida,
            { recursive: true }
        );
    }

    const nombreArchivo =
        `reporte_${Date.now()}.xlsx`;

    const rutaArchivo = path.join(
        carpetaSalida,
        nombreArchivo
    );

    XLSX.writeFile(
        libro,
        rutaArchivo
    );

    console.log(
        `[EXCEL] Archivo generado correctamente: ${rutaArchivo}`
    );

    console.log(
        `[EXCEL] Filas exportadas: ${datosNormalizados.length}`
    );

    return rutaArchivo;
}

module.exports = {
    generarExcel
};