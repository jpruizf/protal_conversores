// ------------------------------------------------
// Seccion importes de funciones
// ------------------------------------------------
/* Funcion principal de este modulo es controlar los errores a partur el try catch
 y convertir los archivos tanto HTML o PDF
 */
const {
    parsearPagoMisCuentas
} = require('../parsers/pagoMisCuentas.parser');

const {
    extraerTextoMultiplesPdfs
} = require('../services/pdf.service');

const {
    generarExcelLiquidacion,
    generarExcelLiquidaciones
} = require('../services/excel.service');


// ---------------------------------------------------------
// CONVERSIÓN HTML EXISTENTE
// ---------------------------------------------------------

async function convertirLiquidacion(req, res) {
    try {
        const { htmlContent, formato } = req.body;

        if (!htmlContent) {
            return res
                .status(400)
                .send('No se recibió contenido HTML.');
        }

        const datos = parsearPagoMisCuentas(
            htmlContent,
            formato
        );

        const workbook =
            generarExcelLiquidacion(datos);

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=liquidacion_${formato}.xlsx`
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);

        res
            .status(500)
            .send('Error interno al procesar el archivo.');
    }
}


// ---------------------------------------------------------
// CONVERSIÓN MÚLTIPLE DE PDF
// ---------------------------------------------------------

async function convertirLiquidacionesPdf(req, res) {
    try {

        if (
            !req.files ||
            !Array.isArray(req.files) ||
            req.files.length === 0
        ) {
            return res
                .status(400)
                .send('No se recibieron archivos PDF.');
        }

        const pdfsExtraidos =
            await extraerTextoMultiplesPdfs(
                req.files
            );
        
        console.log('=== PDF RECIBIDOS ===');
        console.log('Cantidad:', req.files.length);

        req.files.forEach((archivo, index) => {
        console.log(
            `PDF ${index + 1}:`,
            archivo.originalname,
            archivo.mimetype,
            archivo.size
            );
        });

    console.log('=== TEXTO EXTRAIDO ===');

    pdfsExtraidos.forEach((pdf, index) => {
    console.log(`--- PDF ${index + 1}: ${pdf.nombre} ---`);

    if (pdf.error) {
        console.log('ERROR:', pdf.error);
    } else {
        console.log(
            pdf.texto
                ? pdf.texto.substring(0, 2000)
                : 'SIN TEXTO'
        );
    }
    });
        const resultados = [];
        const errores = [];

        for (const pdf of pdfsExtraidos) {

            if (pdf.error) {
                errores.push({
                    archivo: pdf.nombre,
                    error: pdf.error
                });

                continue;
            }

            try {

                const datos =
                    parsearPagoMisCuentas(
                        pdf.texto
                    );
                

                console.log(
                `=== DATOS PARSEADOS: ${pdf.nombre} ===`
                );

                console.log(datos);
                resultados.push({
                    ...datos,
                    archivo_origen: pdf.nombre
                });

            } catch (error) {

                errores.push({
                    archivo: pdf.nombre,
                    error: error.message
                });
            }
        }

        if (resultados.length === 0) {

            console.error(
                'No se pudo procesar ningún PDF:',
                errores
            );

            return res
                .status(422)
                .json({
                    mensaje:
                        'No se pudo extraer ninguna liquidación válida.',
                    errores
                });
        }

        const workbook =
            generarExcelLiquidaciones(
                resultados
            );

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            'attachment; filename=liquidaciones.xlsx'
        );

        // Para diagnóstico en servidor
        if (errores.length > 0) {
            console.warn(
                'Algunos PDFs no pudieron procesarse:',
                errores
            );
        }

        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {

        console.error(
            'Error procesando PDFs:',
            error
        );

        res
            .status(500)
            .send(
                'Error interno al procesar los archivos PDF.'
            );
    }
}
//---------------------------
// Exporto archivo en Excel
//---------------------------

module.exports = {
    convertirLiquidacion,
    convertirLiquidacionesPdf
};