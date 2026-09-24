const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const parser = require("./parser");
const { procesarTXTBRD } = require("./parserBRD");
const excel = require("./excel");

const app = express();
const upload = multer({ dest: "uploads/" });

const PORT = process.env.PORT || 3004;
app.use(express.static("public"));

if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

if (!fs.existsSync("outputs")) {
    fs.mkdirSync("outputs");
}

/**
 * Detecta qué formato tiene el archivo.
 *
 * Reconoce:
 * - BRD tradicional: 0BRD / 1 / 2
 * - BRD alternativo: HEADER / DATOS / TRAILER
 * - ACTUAL: cualquier otro formato ya manejado por parser.js
 */
function detectarFormato(rutaArchivo) {
    const contenido = fs.readFileSync(
        rutaArchivo,
        "utf8"
    );

    const lineas = contenido
        .split(/\r?\n/)
        .map(linea => linea.trimEnd())
        .filter(linea => linea.length > 0);

    if (lineas.length === 0) {
        throw new Error(
            "El archivo seleccionado está vacío."
        );
    }

    const primeraLinea = lineas[0];

    /*
     * BRD tradicional
     *
     * 0BRD...
     * 1...
     * 2...
     */
    if (primeraLinea.startsWith("0BRD")) {
        return "BRD";
    }

    /*
     * BRD alternativo
     *
     * HEADER...
     * DATOS...
     * TRAILER...
     */
    if (
        primeraLinea.startsWith("HEADER") &&
        lineas.some(linea =>
            linea.startsWith("DATOS")
        ) &&
        lineas.some(linea =>
            linea.startsWith("TRAILER")
        )
    ) {
        return "BRD";
    }

    /*
     * Mantiene el comportamiento anterior
     * para el resto de los archivos.
     */
    return "ACTUAL";
}

app.post(
    "/convertir",
    upload.single("archivoTXT"),
    (req, res) => {
        let rutaTXT = null;
        let rutaExcel = null;

        try {
            if (!req.file) {
                return res
                    .status(400)
                    .send("No se recibió ningún archivo TXT.");
            }

            rutaTXT = req.file.path;

            const formato = detectarFormato(rutaTXT);

            console.log("Formato detectado:", formato);

            let datos;

            if (formato === "BRD") {
                datos = procesarTXTBRD(rutaTXT);
            } else {
                datos = parser.procesarTXT(rutaTXT);
            }

            /*
             * Validación crítica:
             * no generar un Excel si el parser no devolvió registros.
             */
            if (
                !Array.isArray(datos) ||
                datos.length === 0
            ) {
                throw new Error(
                    "El archivo fue procesado pero no se obtuvieron registros."
                );
            }

            console.log(
                `Registros obtenidos: ${datos.length}`
            );

            rutaExcel = excel.generarExcel(datos);

            /*
             * El TXT ya no es necesario.
             */
            if (
                rutaTXT &&
                fs.existsSync(rutaTXT)
            ) {
                fs.unlinkSync(rutaTXT);
            }

            rutaTXT = null;

            res.download(
                rutaExcel,
                "reporte_convertido.xlsx",
                errorDescarga => {
                    if (errorDescarga) {
                        console.error(
                            "Error al descargar el Excel:",
                            errorDescarga
                        );
                    }

                    /*
                     * Elimina el Excel temporal
                     * luego de la descarga.
                     */
                    if (
                        rutaExcel &&
                        fs.existsSync(rutaExcel)
                    ) {
                        fs.unlinkSync(rutaExcel);
                    }
                }
            );

        } catch (error) {
            console.error(
                "Error al convertir:",
                error
            );

            if (
                rutaTXT &&
                fs.existsSync(rutaTXT)
            ) {
                fs.unlinkSync(rutaTXT);
            }

            if (
                rutaExcel &&
                fs.existsSync(rutaExcel)
            ) {
                fs.unlinkSync(rutaExcel);
            }

            res
                .status(500)
                .send(
                    error.message ||
                    "Error al convertir el archivo."
                );
        }
    }
);

app.listen(PORT, '127.0.0.1', () => {
    console.log(
        `Servidor Pago Fácil activo internamente en http://127.0.0.1:${PORT}`
    );
});