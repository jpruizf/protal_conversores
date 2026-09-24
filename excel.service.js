const ExcelJS = require('exceljs');

const COLUMNAS = [
    { header: 'Nro Comprobante', key: 'comprobante', width: 20 },
    { header: 'Empresa', key: 'empresa', width: 25 },
    { header: 'Fecha de Pago', key: 'fecha_pago', width: 15 },
    { header: 'Recaudación Bruta', key: 'recaudacion_bruta', width: 18 },
    { header: 'Arancel / Comisión', key: 'arancel', width: 18 },
    { header: 'IVA Arancel', key: 'iva_arancel', width: 15 },
    { header: 'Retención IVA 3130', key: 'retencion_iva', width: 20 },
    { header: 'Retención IIBB SIRTAC', key: 'retencion_iibb', width: 22 },
    { header: 'Percepción IVA', key: 'percepcion_iva', width: 18 },
    { header: 'Recaudación Neta', key: 'recaudacion_neta', width: 18 },
    { header: 'Forma de Pago', key: 'forma_pago', width: 25 },
    { header: 'Banco', key: 'banco', width: 15 },
    { header: 'Sucursal', key: 'sucursal', width: 15 },
    { header: 'Cuenta Corriente Nro.', key: 'cuenta_corriente', width: 22 }
];

const CAMPOS_MONEDA = [
    'recaudacion_bruta',
    'arancel',
    'iva_arancel',
    'retencion_iva',
    'retencion_iibb',
    'percepcion_iva',
    'recaudacion_neta'
];

function limpiarNumero(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return null;
    }

    const numero = parseFloat(
        String(valor)
            .replace(/\./g, '')
            .replace(',', '.')
    );

    return Number.isNaN(numero)
        ? null
        : numero;
}

function prepararDatos(datos) {
    const resultado = { ...datos };

    CAMPOS_MONEDA.forEach(campo => {
        resultado[campo] = limpiarNumero(
            resultado[campo]
        );
    });

    return resultado;
}

function crearWorkbook() {
    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(
        'Liquidaciones'
    );

    worksheet.columns = COLUMNAS;

    // Encabezados
    worksheet.getRow(1).font = {
        bold: true
    };

    // Formato monetario: columnas D a J
    [
        'D',
        'E',
        'F',
        'G',
        'H',
        'I',
        'J'
    ].forEach(columna => {
        worksheet.getColumn(columna).numFmt =
            '"$"#,##0.00;[Red]("$"#,##0.00);"-"';
    });

    return {
        workbook,
        worksheet
    };
}

// ------------------------------------------
// CONVERSIÓN INDIVIDUAL
// ------------------------------------------

function generarExcelLiquidacion(datos) {
    const {
        workbook,
        worksheet
    } = crearWorkbook();

    worksheet.addRow(
        prepararDatos(datos)
    );

    return workbook;
}

// ------------------------------------------
// CONVERSIÓN MÚLTIPLE
// ------------------------------------------

function generarExcelLiquidaciones(listaDatos) {
    const {
        workbook,
        worksheet
    } = crearWorkbook();

    if (!Array.isArray(listaDatos)) {
        throw new Error(
            'La lista de liquidaciones debe ser un array.'
        );
    }

    listaDatos.forEach(datos => {
        worksheet.addRow(
            prepararDatos(datos)
        );
    });

    return workbook;
}

module.exports = {
    generarExcelLiquidacion,
    generarExcelLiquidaciones
};