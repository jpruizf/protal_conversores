const ExcelJS = require("exceljs");

const {
    normalizarFecha,
    aCentavos
} = require("./normalizador");


async function parsearMayor(buffer) {

    const workbook =
        new ExcelJS.Workbook();

    await workbook.xlsx.load(buffer);

    const worksheet =
        workbook.worksheets[0];

    if (!worksheet) {
        throw new Error(
            "El archivo Mayor no contiene hojas."
        );
    }


    const encabezados =
        worksheet.getRow(2);

    if (
        encabezados.getCell(1).value !== "Asiento" ||
        encabezados.getCell(2).value !== "Fecha" ||
        encabezados.getCell(4).value !== "Debe"
    ) {
        throw new Error(
            "El archivo Mayor no posee la estructura esperada."
        );
    }


    const registros = [];

    worksheet.eachRow(
        (row, numeroFila) => {

            if (numeroFila <= 2) {
                return;
            }

            const asiento =
                row.getCell(1).value;

            const fecha =
                row.getCell(2).value;

            const detalle =
                row.getCell(3).value;

            const debe =
                row.getCell(4).value;


            if (
                !asiento ||
                !fecha ||
                debe === null ||
                debe === undefined
            ) {
                return;
            }


            registros.push({
                asiento: String(asiento),
                fecha:
                    normalizarFecha(fecha),

                detalle:
                    detalle
                        ? String(detalle)
                        : "",

                debeCentavos:
                    aCentavos(debe)
            });

        }
    );


    registros.sort(
        (a, b) =>
            a.fecha.localeCompare(b.fecha)
    );


    return registros;
}


module.exports = {
    parsearMayor
};