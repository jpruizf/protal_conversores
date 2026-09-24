const ExcelJS = require("exceljs");


/**
 * Normaliza una fecha DD/MM/AA o DD/MM/AAAA
 * al formato DD/MM/AAAA.
 */
function normalizarFecha(fecha) {
    if (!fecha) {
        return "";
    }

    const texto =
        String(fecha).trim();

    const partes =
        texto.split("/");

    if (partes.length !== 3) {
        return texto;
    }

    let [dia, mes, anio] = partes;

    if (anio.length === 2) {
        anio = `20${anio}`;
    }

    return (
        `${dia.padStart(2, "0")}/` +
        `${mes.padStart(2, "0")}/` +
        `${anio}`
    );
}


/**
 * Convierte un valor a número.
 */
function convertirNumero(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return 0;
    }

    if (typeof valor === "number") {
        return valor;
    }

    let texto =
        String(valor)
            .trim()
            .replace(/\s/g, "");

    /*
     * Si llegara a venir como:
     * 19.689.861,08
     */
    if (
        texto.includes(".") &&
        texto.includes(",")
    ) {
        texto =
            texto
                .replace(/\./g, "")
                .replace(",", ".");
    }
    else {
        texto =
            texto.replace(",", ".");
    }

    const numero =
        Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `Valor numérico inválido: ${valor}`
        );
    }

    return numero;
}


/**
 * Procesa la hoja Liquidaciones
 * del Excel generado por el conversor
 * de informes de liquidación.
 */
async function procesarLiquidacionesExcel(
    buffer,
    nombreArchivoOriginal = ""
) {
    if (!buffer) {
        throw new Error(
            "No se recibió archivo Excel para procesar."
        );
    }


    const workbook =
        new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);


    const worksheet =
        workbook.getWorksheet(
            "Liquidaciones"
        );

    if (!worksheet) {
        throw new Error(
            'No se encontró la hoja "Liquidaciones".'
        );
    }


    const liquidaciones = [];

    let dentroDeTabla = false;

    /*
     * Información correspondiente
     * al bloque actual.
     */
    let archivoOrigen = "";
    let medioPago = "";


    worksheet.eachRow(
        { includeEmpty: false },
        (row) => {

            const valorColumnaA =
                row.getCell(1).value;

            const valorColumnaB =
                row.getCell(2).value;

            const textoA =
                valorColumnaA !== null &&
                valorColumnaA !== undefined
                    ? String(
                        valorColumnaA
                    ).trim()
                    : "";


            /**
             * Detectamos el archivo TXT
             * correspondiente al bloque.
             */
            if (
                textoA.toUpperCase() ===
                "ARCHIVO"
            ) {
                archivoOrigen =
                    valorColumnaB
                        ? String(
                            valorColumnaB
                        ).trim()
                        : "";

                return;
            }


            /**
             * Detectamos el medio de pago.
             */
            if (
                textoA.toUpperCase() ===
                "MEDIO DE PAGO"
            ) {
                medioPago =
                    valorColumnaB
                        ? String(
                            valorColumnaB
                        ).trim()
                        : "";

                return;
            }


            /**
             * Inicio de una tabla
             * de liquidaciones.
             */
            if (
                textoA.toUpperCase() ===
                "FECHA"
            ) {
                const encabezadoB =
                    String(
                        row.getCell(2).value ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                const encabezadoC =
                    String(
                        row.getCell(3).value ||
                        ""
                    )
                        .trim()
                        .toUpperCase();


                if (
                    encabezadoB ===
                        "CANTIDAD DE TRANSACCIONES" &&
                    encabezadoC ===
                        "IMPORTE BRUTO"
                ) {
                    dentroDeTabla = true;
                }

                return;
            }


            /**
             * Fin de la tabla actual.
             */
            if (
                textoA.toUpperCase() ===
                "TOTAL GENERAL"
            ) {
                dentroDeTabla = false;

                return;
            }


            if (!dentroDeTabla) {
                return;
            }


            /*
             * Una fila válida tiene:
             *
             * A = FECHA
             * B = CANTIDAD DE TRANSACCIONES
             * C = IMPORTE BRUTO
             */
            const fecha =
                normalizarFecha(
                    valorColumnaA
                );

            const cantidadTransacciones =
                convertirNumero(
                    row.getCell(2).value
                );

            const importeBruto =
                convertirNumero(
                    row.getCell(3).value
                );


            if (!fecha) {
                return;
            }


            liquidaciones.push({
                nombreArchivoOriginal,

                archivoOrigen,

                medioPago,

                fecha,

                cantidadTransacciones:
                    Math.trunc(
                        cantidadTransacciones
                    ),

                importeBruto:
                    Number(
                        importeBruto.toFixed(2)
                    )
            });
        }
    );


    if (liquidaciones.length === 0) {
        throw new Error(
            "No se encontraron liquidaciones válidas en la hoja Liquidaciones."
        );
    }


    return liquidaciones;
}


module.exports = {
    procesarLiquidacionesExcel
};