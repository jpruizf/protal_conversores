const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    parsearResumen
} = require("./services/parserResumen");

const {
    generarExcelResumen
} = require("./services/excelService");

const {
    detectarEnte
}= require("./services/detectorEnte");



const app = express();

const PORT = 3009;


/**
 * ============================================================
 * MULTER
 * ============================================================
 *
 * Usamos memoryStorage para evitar crear archivos
 * temporales en disco.
 *
 * El PDF queda disponible en:
 *
 * req.file.buffer
 */
const upload = multer({
    storage: multer.memoryStorage(),

    fileFilter: (
        req,
        file,
        cb
    ) => {

        if (
            file.mimetype !==
            "application/pdf"
        ) {

            return cb(
                new Error(
                    "Solo se permiten archivos PDF."
                )
            );

        }


        cb(
            null,
            true
        );

    },

    limits: {

        /**
         * 20 MB máximo por PDF.
         *
         * Podemos modificarlo después
         * si encontramos resúmenes mayores.
         */
        fileSize:
            20 * 1024 * 1024

    }

});


/**
 * ============================================================
 * ARCHIVOS ESTÁTICOS
 * ============================================================
 */
app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        )
    )
);


/**
 * ============================================================
 * EXTRACCIÓN DE TEXTO PDF
 * ============================================================
 *
 * Recibe un Buffer del PDF.
 *
 * Devuelve todo el texto concatenado,
 * manteniendo una línea por página.
 */
async function extraerTextoPdf(
    pdfBuffer
) {

    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );


    const loadingTask =
        pdfjsLib.getDocument({

            data:
                new Uint8Array(
                    pdfBuffer
                ),

            disableWorker:
                true

        });


    const pdf =
        await loadingTask.promise;


    const paginas = [];


    for (
        let numeroPagina = 1;
        numeroPagina <= pdf.numPages;
        numeroPagina++
    ) {

        const pagina =
            await pdf.getPage(
                numeroPagina
            );


        const contenido =
            await pagina.getTextContent();


        const items =
            contenido.items || [];


        /**
         * Agrupamos elementos por coordenada Y.
         *
         * PDF.js guarda:
         *
         * transform[4] = X
         * transform[5] = Y
         */
        const lineasMap =
            new Map();


        const toleranciaY =
            2;


        for (
            const item of items
        ) {

            if (
                !item.str ||
                !item.str.trim()
            ) {
                continue;
            }


            const x =
                item.transform?.[4] ??
                0;


            const y =
                item.transform?.[5] ??
                0;


            /**
             * Buscamos una línea cuya Y
             * sea suficientemente cercana.
             */
            let claveEncontrada =
                null;


            for (
                const clave of lineasMap.keys()
            ) {

                if (
                    Math.abs(
                        clave - y
                    ) <= toleranciaY
                ) {

                    claveEncontrada =
                        clave;

                    break;

                }

            }


            if (
                claveEncontrada === null
            ) {

                claveEncontrada =
                    y;


                lineasMap.set(
                    claveEncontrada,
                    []
                );

            }


            lineasMap
                .get(
                    claveEncontrada
                )
                .push({

                    x,

                    texto:
                        item.str.trim()

                });

        }


        /**
         * El PDF se lee de arriba hacia abajo.
         *
         * Normalmente las coordenadas Y mayores
         * corresponden a la parte superior.
         */
        const coordenadasY =
            Array.from(
                lineasMap.keys()
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b - a
            );


        const lineasPagina =
            [];


        for (
            const y of coordenadasY
        ) {

            const elementos =
                lineasMap
                    .get(y)
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.x - b.x
                    );


            const linea =
                elementos
                    .map(
                        elemento =>
                            elemento.texto
                    )
                    .join(" ")
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();


            if (
                linea
            ) {

                lineasPagina.push(
                    linea
                );

            }

        }


        const textoPagina =
            lineasPagina.join(
                "\n"
            );


        paginas.push(
            textoPagina
        );

    }


    return paginas.join(
        "\n"
    );
}

async function extraerImagenesPdf(
    pdfBuffer
) {

    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );


    const loadingTask =
        pdfjsLib.getDocument({

            data:
                new Uint8Array(
                    pdfBuffer
                ),

            disableWorker:
                true

        });


    const pdf =
        await loadingTask.promise;


    const imagenes = [];


    /**
     * Evitamos procesar dos veces
     * la misma imagen compartida.
     */
    const imagenesProcesadas =
        new Set();


    for (
        let numeroPagina = 1;
        numeroPagina <= pdf.numPages;
        numeroPagina++
    ) {

        const pagina =
            await pdf.getPage(
                numeroPagina
            );


        const operatorList =
            await pagina.getOperatorList();


        for (
            let i = 0;
            i < operatorList.fnArray.length;
            i++
        ) {

            if (
                operatorList.fnArray[i] !==
                pdfjsLib.OPS.paintImageXObject
            ) {
                continue;
            }


            const args =
                operatorList.argsArray[i];


            const nombreImagen =
                args[0];


            /**
             * Si ya procesamos este objeto,
             * no lo volvemos a buscar.
             */
            if (
                imagenesProcesadas.has(
                    nombreImagen
                )
            ) {
                continue;
            }


            imagenesProcesadas.add(
                nombreImagen
            );


            /**
             * Los nombres que comienzan con g_
             * pertenecen normalmente a commonObjs.
             *
             * El resto pertenece a objs.
             */
            const almacenObjetos =
                nombreImagen.startsWith("g_")
                    ? pagina.commonObjs
                    : pagina.objs;


            let imagen;


            try {

                imagen =
                    await Promise.race([

                        new Promise(
                            resolve => {

                                almacenObjetos.get(
                                    nombreImagen,
                                    resolve
                                );

                            }
                        ),

                        new Promise(
                            resolve => {

                                setTimeout(
                                    () => resolve(null),
                                    2000
                                );

                            }
                        )

                    ]);

            }
            catch (
                error
            ) {

                console.log(
                    `[IMAGEN] Error ${nombreImagen}: ${error.message}`
                );

                continue;

            }


            if (
                !imagen
            ) {

                console.log(
                    `[IMAGEN] Timeout: ${nombreImagen}`
                );

                continue;

            }


            if (
                !imagen.data
            ) {

                console.log(
                    `[IMAGEN] Sin datos: ${nombreImagen}`
                );

                continue;

            }


            imagenes.push({

                id:
                    nombreImagen,

                pagina:
                    numeroPagina,

                width:
                    imagen.width,

                height:
                    imagen.height,

                buffer:
                    Buffer.from(
                        imagen.data
                    )

            });


            console.log(
                `[IMAGEN] OK: ${nombreImagen} | ${imagen.width}x${imagen.height}`
            );

        }

    }


    return imagenes;
}




/**
 * ============================================================
 * ENDPOINT PRINCIPAL
 * ============================================================
 *
 * POST /convertir
 *
 * Campo esperado:
 *
 * archivoPDF
 */
app.post(
    "/convertir",

    upload.array(
        "archivoPDF",
        20
    ),

    async (
        req,
        res
    ) => {

        try {

            console.log(
                "========================================"
            );

            console.log(
                "[REQUEST] POST /convertir"
            );

            console.log(
                "========================================"
            );


            /**
             * Validación archivos.
             */
            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res
                    .status(400)
                    .json({
                        ok: false,
                        error: "No se recibieron archivos PDF."
                    });

            }


            const resumenes = [];


            for (
                const archivo of req.files
            ) {

                console.log(
                    "========================================"
                );

                console.log(
                    `[PDF] Procesando: ${archivo.originalname}`
                );


                /**
                 * =============================================
                 * EXTRAER TEXTO
                 * =============================================
                 */
                const textoPdf =
                    await extraerTextoPdf(
                        archivo.buffer
                    );


                if (
                    !textoPdf ||
                    textoPdf.trim() === ""
                ) {

                    throw new Error(
                        `No se pudo extraer texto del PDF: ${archivo.originalname}`
                    );

                }


                console.log(
                    `[PDF] Texto extraído: ${textoPdf.length} caracteres`
                );


                /**
                 * =============================================
                 * EXTRAER IMÁGENES
                 * =============================================
                 */
                const imagenesPdf =
                    await extraerImagenesPdf(
                        archivo.buffer
                    );


                console.log(
                    `[PDF] Imágenes detectadas: ${imagenesPdf.length}`
                );


                /**
                 * =============================================
                 * DETECTAR ENTE
                 * =============================================
                 */
                const deteccion =
                    detectarEnte({

                        texto:
                            textoPdf,

                        imagenes:
                            imagenesPdf

                    });


                if (!deteccion.detectado){

                    throw new Error(
                        `No se pudo identificar el documento: ${archivo.originalname}`
                    );

                }

                 /**
                 * =============================================
                 * PARSEAR RESUMEN
                 * =============================================
                 */

                const resumen =
                    parsearResumen(
                        textoPdf
                    );


                resumenes.push(
                    resumen
                );
}


/**
* =================================================
* GENERAR EXCEL
* =================================================
*/


            const excelBuffer =
                await generarExcelResumen(
                    resumenes
                );


            const nombreArchivo =
                resumenes.length === 1

                ? `Resumen_Visa_Galicia_${(
                resumenes[0].mesFacturacion ||
                "RESUMEN"
                ).replace(/\s+/g, "_")}.xlsx`

                : "Resumenes_Visa_Galicia.xlsx";


            /**
             * =================================================
             * RESPUESTA
             * =================================================
             */
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );


            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${nombreArchivo}"`
            );


            


            return res.send(
                excelBuffer
            );

        }
        catch (
            error
        ) {

            console.error(
                "========================================"
            );

            console.error(
                "ERROR EN CONVERSIÓN"
            );

            console.error(
                "========================================"
            );

            console.error(
                error
            );


            /**
             * Si todavía no se enviaron headers,
             * devolvemos JSON de error.
             */
            if (
                !res.headersSent
            ) {

                return res
                    .status(500)
                    .json({

                        ok:
                            false,

                        error:
                            error.message ||
                            "Error interno al procesar el PDF."

                    });

            }

        }

    }
);


/**
 * ============================================================
 * MANEJO DE ERRORES DE MULTER
 * ============================================================
 */
app.use(
    (
        error,
        req,
        res,
        next
    ) => {

        console.error(
            "[ERROR]",
            error.message
        );


        if (
            error instanceof
            multer.MulterError
        ) {

            return res
                .status(400)
                .json({

                    ok:
                        false,

                    error:
                        `Error de carga: ${error.message}`

                });

        }


        return res
            .status(400)
            .json({

                ok:
                    false,

                error:
                    error.message ||
                    "Error al recibir el archivo."

            });

    }
);


/**
 * ============================================================
 * INICIO DEL SERVIDOR
 * ============================================================
 */
app.listen(
    PORT,
    "0.0.0.0",

    () => {

        console.log(
            "========================================"
        );

        console.log(
            "PDF RESUMEN VISA GALICIA"
        );

        console.log(
            "========================================"
        );

        console.log(
            `Servidor activo en puerto ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "========================================"
        );

    }
);