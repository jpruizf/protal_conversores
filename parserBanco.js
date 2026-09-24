const ExcelJS = require("exceljs");

const {
    normalizarFecha,
    aCentavos
} = require("./normalizador");


async function parsearBanco(buffer) {

    const workbook =
        new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);

    const worksheet =
        workbook.worksheets[0];

    if (!worksheet) {
        throw new Error(
            "El archivo Mayor Banco no contiene hojas."
        );
    }


    const encabezados =
        worksheet.getRow(2);

    if (
        encabezados.getCell(1).value !== "Fecha" ||
        encabezados.getCell(2).value !== "Crédito"
    ) {
        throw new Error(
            "El archivo Mayor Banco no posee la estructura esperada."
        );
    }


    const movimientos = [];

    worksheet.eachRow(
        (row, numeroFila) => {

            if (numeroFila <= 2) {
                return;
            }


            const fecha =
                row.getCell(1).value;

            const credito =
                row.getCell(2).value;


            if (
                !fecha ||
                credito === null ||
                credito === undefined
            ) {
                return;
            }


            movimientos.push({
                fecha:
                    normalizarFecha(fecha),

                creditoCentavos:
                    aCentavos(credito)
            });

        }
    );


    movimientos.sort(
        (a, b) =>
            a.fecha.localeCompare(b.fecha)
    );


    return movimientos;
}


module.exports = {
    parsearBanco
};