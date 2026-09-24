const fs = require("fs");
const { PDFParse } = require("pdf-parse");

/**
 * Extrae el texto contenido en un PDF digital.
 *
 * @param {string} rutaPDF Ruta del archivo PDF.
 * @returns {Promise<string>} Texto extraído.
 */
async function extraerTextoPDF(rutaPDF) {
    if (!rutaPDF) {
        throw new Error("No se indicó la ruta del PDF.");
    }

    if (!fs.existsSync(rutaPDF)) {
        throw new Error(`No se encontró el archivo PDF: ${rutaPDF}`);
    }

    const buffer = fs.readFileSync(rutaPDF);

    let parser;

    try {
        parser = new PDFParse({
            data: buffer
        });

        const resultado = await parser.getText();
        const texto = resultado.text?.trim();

        if (!texto) {
            throw new Error(
                "El PDF no contiene texto extraíble. Puede tratarse de un documento escaneado."
            );
        }

        return texto;
    } catch (error) {
        throw new Error(
            `No se pudo extraer el texto del PDF: ${error.message}`
        );
    } finally {
        if (parser) {
            await parser.destroy();
        }
    }
}

module.exports = {
    extraerTextoPDF
};