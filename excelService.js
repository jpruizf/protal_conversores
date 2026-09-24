const ExcelJS = require('exceljs');


/**
 * Genera el archivo Excel a partir de los registros
 * ya parseados por parserTarjetas.js.
 *
 * @param {Array} registros
 * @param {String} selectedFormat
 * @returns {Promise<Buffer>}
 */
async function generarExcelTarjetas(
    registros,
    selectedFormat
) {
    const workbook =
        new ExcelJS.Workbook();

    const worksheet =
        workbook.addWorksheet(
            'Datos Bancarios'
        );


    /**
     * Formatos de débito.
     */
    const esFormatoDebito =
        selectedFormat === 'RDEBLIQD' ||
        selectedFormat === 'LDEBLIQD';


    /**
     * Estilos.
     */
    const styles = {
        headerFill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: 'FF2A4B7C'
            }
        },

        headerFont: {
            name: 'Segoe UI',
            size: 11,
            bold: true,
            color: {
                argb: 'FFFFFFFF'
            }
        },

        zebraFill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: {
                argb: 'FFF4F7FC'
            }
        },

        border: {
            style: 'thin',
            color: {
                argb: 'FFD9D9D9'
            }
        }
    };


    /**
     * ============================================================
     * COLUMNAS
     * ============================================================
     */
    if (selectedFormat === 'DEBLIQC') {

        /**
         * VISA CRÉDITO - RDEBLIQC
         */
        worksheet.columns = [
            {
                header: 'Registro',
                key: 'type',
                width: 12
            },
            {
                header: 'Banco',
                key: 'codigo_banco',
                width: 10
            },
            {
                header: 'Casa',
                key: 'codigo_casa',
                width: 10
            },
            {
                header: 'Lote',
                key: 'numero_lote',
                width: 12
            },
            {
                header: 'Cód. Transacción',
                key: 'codigo_transaccion',
                width: 18
            },
            {
                header: 'Nro. Establecimiento',
                key: 'numero_establecimiento',
                width: 22
            },
            {
                header: 'Tarjeta / Token',
                key: 'tarjeta_token',
                width: 24
            },
            {
                header: 'Nro. Cupón',
                key: 'numero_cupon',
                width: 16
            },
            {
                header: 'Fecha Origen',
                key: 'fecha_proc',
                width: 14
            },
            {
                header: 'Cód. Autorización',
                key: 'codigo_autorizacion',
                width: 18
            },
            {
                header: 'Importe',
                key: 'monto_1',
                width: 16
            },
            {
                header: 'Cuotas',
                key: 'cuotas',
                width: 10
            },
            {
                header: 'Identificador',
                key: 'identificador',
                width: 22
            },
            {
                header: 'Nro. Cuenta',
                key: 'numero_cuenta',
                width: 18
            },
            {
                header: 'Estado',
                key: 'estado_movimiento',
                width: 10
            },
            {
                header: 'Cód. Motivo 1',
                key: 'codigo_motivo_1',
                width: 14
            },
            {
                header: 'Descripción Motivo 1',
                key: 'descripcion_motivo_1',
                width: 35
            },
            {
                header: 'Cód. Motivo 2',
                key: 'codigo_motivo_2',
                width: 14
            },
            {
                header: 'Descripción Motivo 2',
                key: 'descripcion_motivo_2',
                width: 35
            }
        ];

    } else {

        /**
         * RDEBLIQD / LDEBLIQD / LIQC
         */
        worksheet.columns = [
            {
                header: 'Registro',
                key: 'type',
                width: 12
            },
            {
                header: esFormatoDebito
                    ? 'ID Débito / Comercio'
                    : 'ID Comercio',
                key: 'comercio_id',
                width: 22
            },
            {
                header: esFormatoDebito
                    ? 'Nro Comprobante'
                    : 'ID Banco',
                key: 'banco_id',
                width: 18
            },
            {
                header: esFormatoDebito
                    ? 'Tarjeta'
                    : 'Tarjeta / Token',
                key: 'tarjeta_token',
                width: 24
            },
            {
                header: 'Fecha Proc.',
                key: 'fecha_proc',
                width: 14
            },
            {
                header: esFormatoDebito
                    ? 'Importe'
                    : 'Monto Bruto',
                key: 'monto_1',
                width: 16
            },
            {
                header: 'Cód. Error',
                key: 'codigo_error',
                width: 12
            },
            {
                header: 'Descripción de Estado',
                key: 'mensaje_error',
                width: 45
            }
        ];
    }


    /**
     * Estilo de cabecera.
     */
    worksheet
        .getRow(1)
        .eachCell((cell) => {
            cell.fill =
                styles.headerFill;

            cell.font =
                styles.headerFont;

            cell.alignment = {
                vertical: 'middle',
                horizontal: 'center'
            };
        });


    let indexDetalle = 0;


    /**
     * ============================================================
     * AGREGAR REGISTROS
     * ============================================================
     */
    registros.forEach((rowData) => {

        if (
            !rowData ||
            rowData.type !== 'DETALLE'
        ) {
            return;
        }


        let row;


        /**
         * VISA CRÉDITO
         */
        if (selectedFormat === 'DEBLIQC') {

            row = worksheet.addRow({
                type:
                    rowData.type,

                codigo_banco:
                    rowData.codigo_banco,

                codigo_casa:
                    rowData.codigo_casa,

                numero_lote:
                    rowData.numero_lote,

                codigo_transaccion:
                    rowData.codigo_transaccion,

                numero_establecimiento:
                    rowData.numero_establecimiento,

                tarjeta_token:
                    rowData.tarjeta_token,

                numero_cupon:
                    rowData.numero_cupon,

                fecha_proc:
                    rowData.fecha_proc,

                codigo_autorizacion:
                    rowData.codigo_autorizacion,

                monto_1:
                    Number.parseFloat(
                        rowData.monto_1
                    ) || 0,

                cuotas:
                    rowData.cuotas,

                identificador:
                    rowData.identificador,

                numero_cuenta:
                    rowData.numero_cuenta,

                estado_movimiento:
                    rowData.estado_movimiento,

                codigo_motivo_1:
                    rowData.codigo_motivo_1,

                descripcion_motivo_1:
                    rowData.descripcion_motivo_1,

                codigo_motivo_2:
                    rowData.codigo_motivo_2,

                descripcion_motivo_2:
                    rowData.descripcion_motivo_2
            });

        } else {

            /**
             * DÉBITO / LIQC
             */
            row = worksheet.addRow({
                type:
                    rowData.type,

                comercio_id:
                    rowData.comercio_id,

                banco_id:
                    rowData.banco_id,

                tarjeta_token:
                    rowData.tarjeta_token,

                fecha_proc:
                    rowData.fecha_proc,

                monto_1:
                    Number.parseFloat(
                        rowData.monto_1
                    ) || 0,

                codigo_error:
                    rowData.codigo_error,

                mensaje_error:
                    rowData.mensaje_error
            });
        }


        indexDetalle++;


        /**
         * Zebra.
         */
        if (indexDetalle % 2 === 0) {
            row.eachCell((cell) => {
                cell.fill =
                    styles.zebraFill;
            });
        }


        /**
         * Bordes, alineación y moneda.
         */
        row.eachCell(
            (cell, colNumber) => {

                cell.border = {
                    top: styles.border,
                    left: styles.border,
                    bottom: styles.border,
                    right: styles.border
                };


                const esColumnaImporte =
                    selectedFormat === 'DEBLIQC'
                        ? colNumber === 11
                        : colNumber === 6;


                if (esColumnaImporte) {

                    cell.numFmt =
                        '$#,##0.00';

                    cell.alignment = {
                        horizontal: 'right'
                    };

                } else {

                    cell.alignment = {
                        horizontal: 'center'
                    };
                }


                /**
                 * Resaltar errores solamente
                 * en formatos no DEBLIQC.
                 */
                const tieneError =
                    rowData.codigo_error &&
                    rowData.codigo_error !== '000' &&
                    rowData.codigo_error !== '00';


                if (
                    selectedFormat !== 'DEBLIQC' &&
                    colNumber === 8 &&
                    tieneError
                ) {
                    cell.font = {
                        name: 'Segoe UI',
                        color: {
                            argb: 'FFC00000'
                        },
                        bold: true
                    };
                }
            }
        );
    });


    /**
     * Devuelve el Excel como Buffer.
     */
    const buffer =
        await workbook.xlsx.writeBuffer();

    return buffer;
}


module.exports = {
    generarExcelTarjetas
};