const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    extraerTextoPDF
} = require("./extractorPDF");

const {
    esFormatoSEPSA,
    procesarSEPSA
} = require("./parser/parserSEPSA");




const {
    procesarServicio
} = require("./servicios/parserServicios");

const {
    generarExcel
} = require("./excel");
const {
    generarExcelServicios,
    generarExcelServiciosMultiple
} = require("./servicios/excelServicios");


const app = express();

console.log( ">>> EJECUTANDO SERVER NUEVO - SERVICIOS HABILITADOS <<<");

const PORT = process.env.PORT || 3006;


/*
 * Carpetas de trabajo.
 */
const carpetaUploads = path.join(
    __dirname,
    "uploads"
);

const carpetaSalida = path.join(
    __dirname,
    "salida"
);


/*
 * Crear carpetas si no existen.
 */
if (!fs.existsSync(carpetaUploads)) {
    fs.mkdirSync(
        carpetaUploads,
        {
            recursive: true
        }
    );
}

if (!fs.existsSync(carpetaSalida)) {
    fs.mkdirSync(
        carpetaSalida,
        {
            recursive: true
        }
    );
}


/*
 * Configuración de Multer.
 */
const almacenamiento = multer.diskStorage({

    destination: function (
        req,
        file,
        cb
    ) {
        cb(
            null,
            carpetaUploads
        );
    },

    filename: function (
        req,
        file,
        cb
    ) {
        const nombreSeguro =
            file.originalname
                .replace(/\s+/g, "_")
                .replace(/[^\w.-]/g, "");

        cb(
            null,
            `${Date.now()}_${nombreSeguro}`
        );
    }
});


const upload = multer({

    storage: almacenamiento,

    fileFilter: function (
        req,
        file,
        cb
    ) {

        const esPDF =
            file.mimetype === "application/pdf" ||
            file.originalname
                .toLowerCase()
                .endsWith(".pdf");

        if (!esPDF) {
            return cb(
                new Error(
                    "Solamente se permiten archivos PDF."
                )
            );
        }

        cb(
            null,
            true
        );
    },

    limits: {
        fileSize: 10 * 1024 * 1024
    }
});


/*
 * Archivos estáticos del frontend.
 */
app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/*
 * Ruta principal de conversión.
 */
app.post(
    "/convertir",
    upload.single("archivoPDF"),

    async (req, res) => {

        let rutaPDF = null;
        let rutaExcel = null;

        try {

            /*
             * Verificar archivo recibido.
             */
            if (!req.file) {
                return res
                    .status(400)
                    .send(
                        "No se seleccionó ningún archivo PDF."
                    );
            }


            rutaPDF = req.file.path;


            /*
             * Verificar que Multer haya guardado
             * físicamente el archivo.
             */
            if (!fs.existsSync(rutaPDF)) {
                throw new Error(
                    `El archivo recibido no existe en disco: ${rutaPDF}`
                );
            }


            console.log("");
            console.log("=================================");
            console.log("NUEVA CONVERSIÓN");
            console.log(
                "Archivo:",
                req.file.originalname
            );
            console.log(
                "Ruta temporal:",
                rutaPDF
            );
            console.log("=================================");


            /*
             * 1.
             * Extraer texto del PDF.
             */
            const textoPDF =
                await extraerTextoPDF(
                    rutaPDF
                );
            console.log(
            ">>> SERVER NUEVO: PDF EXTRAÍDO <<<"
            );

            console.log(
                "Texto extraído correctamente."
            );

            console.log(
                "Caracteres:",
                textoPDF.length
            );


            /*
             * 2.
             * Determinar qué flujo debe procesar
             * el documento.
             */
            let datos;

            const esSEPSA =
                esFormatoSEPSA(
                    textoPDF
                );
            
            console.log(
            ">>> RESULTADO esFormatoSEPSA:",
                esSEPSA
            );

            console.log(
                "¿Es formato SEPSA?:",
                esSEPSA
            );


            /*
             * ============================
             * FLUJO SEPSA
             * ============================
             *
             * Se mantiene la lógica existente.
             */
            if (esSEPSA === true) {

                console.log(
                    "Formato detectado: SEPSA"
                );


                datos =
                    procesarSEPSA(
                        textoPDF,
                        req.file.originalname
                    );


                rutaExcel =
                    generarExcel(
                        datos,
                        carpetaSalida
                    );


            } else {

                /*
                 * ============================
                 * FLUJO SERVICIOS
                 * ============================
                 *
                 * parserServicios detecta
                 * internamente:
                 *
                 * - EcoGas residencial
                 * - Naturgy residencial
                 * - Naturgy residencial + OSSE
                 * - Naturgy comercial T2
                 */

                console.log(
                    "Formato SEPSA no detectado."
                );

                console.log(
                    "Intentando detectar factura de servicio..."
                );


                datos =
                    procesarServicio(
                        textoPDF,
                        req.file.originalname
                    );


                console.log(
                    "Servicio detectado:",
                    datos.proveedor,
                    "/",
                    datos.tipoFactura
                );


                rutaExcel =
                    generarExcelServicios(
                        datos,
                        carpetaSalida
                    );
            }


            /*
             * 3.
             * Verificar Excel generado.
             */
            if (!rutaExcel) {
                throw new Error(
                    "No se obtuvo una ruta de salida para el Excel."
                );
            }


            if (!fs.existsSync(rutaExcel)) {
                throw new Error(
                    `El Excel no fue generado correctamente: ${rutaExcel}`
                );
            }


            console.log("");
            console.log(
                "PDF interpretado correctamente."
            );

            console.dir(
                datos,
                {
                    depth: null,
                    colors: true
                }
            );


            /*
             * 4.
             * Descargar archivo.
             */
            const nombreDescarga =
                path.basename(
                    rutaExcel
                );


            console.log(
                "Excel generado:",
                nombreDescarga
            );


            res.download(
                rutaExcel,
                nombreDescarga,

                (error) => {

                    /*
                     * Limpiar temporales después
                     * de finalizar la descarga.
                     */
                    eliminarArchivo(
                        rutaPDF
                    );

                    eliminarArchivo(
                        rutaExcel
                    );


                    if (error) {

                        console.error(
                            "Error durante la descarga:",
                            error.message
                        );

                    } else {

                        console.log(
                            "Descarga completada correctamente."
                        );
                    }
                }
            );


        } catch (error) {

            console.error("");
            console.error(
                "ERROR DURANTE LA CONVERSIÓN:"
            );

            console.error(
                error.message
            );

            console.error(
                error.stack
            );


            /*
             * Eliminar temporales si hubo error.
             */
            eliminarArchivo(
                rutaPDF
            );

            eliminarArchivo(
                rutaExcel
            );


            if (!res.headersSent) {

                res
                    .status(500)
                    .send(
                        error.message ||
                        "No se pudo convertir el archivo PDF."
                    );
            }
        }
    }
);

/*
 * =========================================================
 * CONVERSIÓN MÚLTIPLE DE FACTURAS DE SERVICIOS
 * =========================================================
 *
 * Recibe varios PDFs y genera un único Excel.
 *
 * La ruta individual /convertir permanece intacta.
 */
app.post(
    "/convertir-multiple",

    upload.array(
        "archivosPDF",
        50
    ),

    async (req, res) => {

        const rutasPDF = [];

        let rutaExcel = null;

        try {

            /*
             * Verificar archivos.
             */
            if (
                !req.files ||
                !Array.isArray(req.files) ||
                req.files.length === 0
            ) {
                return res
                    .status(400)
                    .send(
                        "No se seleccionaron archivos PDF."
                    );
            }


            console.log("");
            console.log(
                "================================="
            );
            console.log(
                "NUEVA CONVERSIÓN MÚLTIPLE"
            );
            console.log(
                "Cantidad de archivos:",
                req.files.length
            );
            console.log(
                "================================="
            );


            /*
             * Acá acumularemos los resultados
             * de todas las facturas.
             */
            const resultados = [];


            /*
             * =================================
             * PROCESAR CADA PDF
             * =================================
             */
            for (const archivo of req.files) {

                const rutaPDF =
                    archivo.path;

                rutasPDF.push(
                    rutaPDF
                );


                console.log("");
                console.log(
                    "Procesando:",
                    archivo.originalname
                );


                /*
                 * Verificar archivo físico.
                 */
                if (
                    !fs.existsSync(
                        rutaPDF
                    )
                ) {
                    throw new Error(
                        `El archivo no existe en disco: ${archivo.originalname}`
                    );
                }


                /*
                 * 1.
                 * Extraer texto.
                 */
                const textoPDF =
                    await extraerTextoPDF(
                        rutaPDF
                    );


                console.log(
                    "Texto extraído:",
                    textoPDF.length,
                    "caracteres"
                );


                /*
                 * 2.
                 * En esta primera versión
                 * el lote múltiple procesa
                 * únicamente facturas de servicios.
                 */
                const esSEPSA =
                    esFormatoSEPSA(
                        textoPDF
                    );


                if (esSEPSA) {
                    throw new Error(
                        `El archivo "${archivo.originalname}" corresponde a formato SEPSA y no puede incluirse todavía en el lote de facturas de servicios.`
                    );
                }


                /*
                 * 3.
                 * Procesar proveedor automáticamente.
                 *
                 * parserServicios detecta:
                 *
                 * - Naturgy residencial
                 * - Naturgy + OSSE
                 * - Naturgy comercial T2
                 * - EcoGas
                 */
                const datos =
                    procesarServicio(
                        textoPDF,
                        archivo.originalname
                    );


                console.log(
                    "Servicio detectado:",
                    datos.proveedor,
                    "/",
                    datos.tipoFactura
                );


                /*
                 * Guardar resultado.
                 *
                 * Todavía NO generamos Excel.
                 */
                resultados.push(
                    datos
                );
            }


            /*
             * =================================
             * GENERAR UN ÚNICO EXCEL
             * =================================
             */
            rutaExcel =
                generarExcelServiciosMultiple(
                    resultados,
                    carpetaSalida
                );


            if (!rutaExcel) {
                throw new Error(
                    "No se obtuvo una ruta para el Excel consolidado."
                );
            }


            if (
                !fs.existsSync(
                    rutaExcel
                )
            ) {
                throw new Error(
                    `El Excel consolidado no fue generado correctamente: ${rutaExcel}`
                );
            }


            const nombreDescarga =
                path.basename(
                    rutaExcel
                );


            console.log("");
            console.log(
                "================================="
            );
            console.log(
                "LOTE PROCESADO CORRECTAMENTE"
            );
            console.log(
                "Facturas procesadas:",
                resultados.length
            );
            console.log(
                "Excel generado:",
                nombreDescarga
            );
            console.log(
                "================================="
            );


            /*
             * =================================
             * DESCARGAR
             * =================================
             */
            res.download(
                rutaExcel,
                nombreDescarga,

                (error) => {

                    /*
                     * Limpiar todos los PDFs
                     * temporales.
                     */
                    rutasPDF.forEach(
                        (ruta) => {
                            eliminarArchivo(
                                ruta
                            );
                        }
                    );


                    /*
                     * Limpiar Excel generado.
                     */
                    eliminarArchivo(
                        rutaExcel
                    );


                    if (error) {

                        console.error(
                            "Error durante la descarga múltiple:",
                            error.message
                        );

                    } else {

                        console.log(
                            "Descarga múltiple completada correctamente."
                        );
                    }
                }
            );


        } catch (error) {

            console.error("");
            console.error(
                "ERROR DURANTE LA CONVERSIÓN MÚLTIPLE:"
            );

            console.error(
                error.message
            );

            console.error(
                error.stack
            );


            /*
             * Limpiar todos los PDFs temporales.
             */
            rutasPDF.forEach(
                (ruta) => {
                    eliminarArchivo(
                        ruta
                    );
                }
            );


            /*
             * Limpiar Excel si llegó
             * a generarse parcialmente.
             */
            eliminarArchivo(
                rutaExcel
            );


            if (!res.headersSent) {

                res
                    .status(500)
                    .send(
                        error.message ||
                        "No se pudo procesar el lote de facturas."
                    );
            }
        }
    }
);


/*
 * Manejo de errores de Multer.
 */
app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "Error del servidor:",
            error
        );


        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res
                    .status(400)
                    .send(
                        "El archivo supera el tamaño máximo permitido de 10 MB."
                    );
            }


            return res
                .status(400)
                .send(
                    `Error al cargar el archivo: ${error.message}`
                );
        }


        if (error) {

            return res
                .status(400)
                .send(
                    error.message ||
                    "No se pudo cargar el archivo."
                );
        }


        next();
    }
);


/*
 * Elimina archivos temporales.
 */
function eliminarArchivo(
    rutaArchivo
) {

    if (!rutaArchivo) {
        return;
    }


    if (
        !fs.existsSync(
            rutaArchivo
        )
    ) {
        return;
    }


    try {

        fs.unlinkSync(
            rutaArchivo
        );


    } catch (error) {

        console.error(
            `No se pudo eliminar el archivo temporal ${rutaArchivo}:`,
            error.message
        );
    }
}


/*
 * Iniciar servidor.
 */
app.listen(
    PORT,
    "127.0.0.1",

    () => {

        console.log("");
        console.log(
            "================================="
        );

        console.log(
            "CONVERSOR PDF INICIADO"
        );

        console.log(
            `Puerto: ${PORT}`
        );

        console.log(
            `URL interna: http://127.0.0.1:${PORT}`
        );

        console.log(
            "Uploads:",
            carpetaUploads
        );

        console.log(
            "Salida:",
            carpetaSalida
        );

        console.log(
            "================================="
        );
    }
);