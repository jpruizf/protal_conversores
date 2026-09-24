const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    detectarTipoTarjeta
} = require("./services/detectorTarjeta");

const {
    parsearLiquidacionesTarjetas
} = require("./services/parserLiquidacionTarjetas");


const {
    generarExcelLiquidacionTarjetas
} = require("./services/excelService");


const {
    detectarEnteRecaudador
}= require("./services/detectorEnteRecaudador");


const {
    createHash
}= require("node:crypto");

const app = express();

const PORT =
    process.env.PORT || 3008;


/**
 * Multer en memoria.
 *
 * El PDF no se guarda físicamente.
 * Se procesa directamente desde el buffer.
 */
const upload = multer({
    storage: multer.memoryStorage()
});


/**
 * Archivos estáticos del frontend.
 */
app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


/**
 * Extrae todo el texto de un PDF.
 *
 * @param {Buffer} bufferPDF
 * @returns {Promise<String>}
 */
async function extraerTextoPDF(bufferPDF) {

    const pdfjsLib =
        await import("pdfjs-dist/legacy/build/pdf.mjs");

    const datosPDF =
        new Uint8Array(bufferPDF);

    const documento =
        await pdfjsLib.getDocument({
            data: datosPDF
        }).promise;

    let textoCompleto = "";

    for (
        let numeroPagina = 1;
        numeroPagina <= documento.numPages;
        numeroPagina++
    ) {

        const pagina =
            await documento.getPage(
                numeroPagina
            );

        const contenido =
            await pagina.getTextContent();

        const textoPagina =
            contenido.items
                .map(
                    item => item.str
                )
                .join(" ");

        textoCompleto +=
            textoPagina + "\n";
    }

    return textoCompleto;
}

/**
 * Genera un hash perceptual simple (aHash)
 * de 8 x 8 = 64 bits.
 *
 * Tolera cambios leves de:
 * - resolución
 * - compresión
 * - escala
 *
 * @param {Object} imagen
 * @returns {String|null}
 */
function calcularHashPerceptual(
    imagen
) {

    if (
        !imagen ||
        !imagen.data ||
        !imagen.width ||
        !imagen.height
    ) {
        return null;
    }


    const {
        data,
        width,
        height
    } = imagen;


    const totalPixeles =
        width * height;


    if (
        totalPixeles <= 0
    ) {
        return null;
    }


    /**
     * PDF.js normalmente entrega
     * RGB o RGBA.
     */
    const bytesPorPixel =
        data.length / totalPixeles;


    if (
        bytesPorPixel !== 3 &&
        bytesPorPixel !== 4
    ) {
        return null;
    }


    const tamanio =
        8;


    const grises = [];


    /**
     * Tomamos una muestra de 8x8
     * distribuida por toda la imagen.
     */
    for (
        let y = 0;
        y < tamanio;
        y++
    ) {

        for (
            let x = 0;
            x < tamanio;
            x++
        ) {

            const px =
                Math.min(
                    width - 1,
                    Math.floor(
                        (x + 0.5) *
                        width /
                        tamanio
                    )
                );


            const py =
                Math.min(
                    height - 1,
                    Math.floor(
                        (y + 0.5) *
                        height /
                        tamanio
                    )
                );


            const indice =
                Math.floor(
                    (
                        py * width +
                        px
                    ) *
                    bytesPorPixel
                );


            const r =
                data[indice];

            const g =
                data[indice + 1];

            const b =
                data[indice + 2];


            /**
             * Conversión aproximada
             * a escala de grises.
             */
            const gris =
                (
                    r * 0.299 +
                    g * 0.587 +
                    b * 0.114
                );


            grises.push(
                gris
            );
        }
    }


    const promedio =
        grises.reduce(
            (acumulado, valor) =>
                acumulado + valor,
            0
        ) /
        grises.length;


    /**
     * Generamos 64 bits.
     */
    let bits = "";


    for (
        const gris
        of grises
    ) {

        bits +=
            gris >= promedio
                ? "1"
                : "0";
    }


    /**
     * Convertimos cada 4 bits
     * a hexadecimal.
     */
    let hexadecimal = "";


    for (
        let i = 0;
        i < bits.length;
        i += 4
    ) {

        hexadecimal +=
            parseInt(
                bits.substring(
                    i,
                    i + 4
                ),
                2
            ).toString(16);
    }


    return hexadecimal;
}

/**
 * Inspecciona las imágenes embebidas
 * en la primera página del PDF.
 *
 * Devuelve información que podremos
 * utilizar como firma visual para
 * distinguir VISA / MASTERCARD.
 *
 * @param {Buffer} bufferPDF
 * @returns {Promise<Array>}
 */
async function extraerFirmasVisualesPDF(
    bufferPDF
) {

    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );


    const datosPDF =
        new Uint8Array(
            bufferPDF
        );


    const documento =
        await pdfjsLib.getDocument({
            data: datosPDF
        }).promise;


    /**
     * Solamente necesitamos inspeccionar
     * la primera página porque el logo
     * del ente está en el encabezado.
     */
    const pagina =
        await documento.getPage(1);


    const operadores =
        await pagina.getOperatorList();


    const firmas = [];


    /**
     * Obtiene un objeto de imagen
     * cargado por PDF.js.
     */
    function obtenerObjetoImagen(
        id
    ) {

        return new Promise(
            (resolve) => {

                pagina.objs.get(
                    id,
                    imagen => {
                        resolve(imagen);
                    }
                );

            }
        );
    }


    for (
        let i = 0;
        i < operadores.fnArray.length;
        i++
    ) {

        const operador =
            operadores.fnArray[i];


        const argumentos =
            operadores.argsArray[i];


        /**
         * Imagen normal embebida.
         */
        if (
            operador ===
            pdfjsLib.OPS.paintImageXObject
        ) {

            const idImagen =
                argumentos[0];


            const imagen =
                await obtenerObjetoImagen(
                    idImagen
                );


            if (!imagen) {
                continue;
            }


            const firma = {
                id: idImagen,

                width:
                imagen.width || null,

                height:
                imagen.height || null,

                hash: null,

                perceptualHash:
            calcularHashPerceptual(
                imagen
            )
        };


            /**
             * Si PDF.js nos entrega
             * los píxeles de la imagen,
             * calculamos SHA-256.
             */
            if (
                imagen.data &&
                imagen.data.byteLength
            ) {

                const bufferImagen =
                    Buffer.from(
                        imagen.data.buffer,
                        imagen.data.byteOffset,
                        imagen.data.byteLength
                    );


                firma.hash =
                    createHash("sha256")
                        .update(bufferImagen)
                        .digest("hex");
            }


            firmas.push(
                firma
            );
        }


        /**
         * Imagen inline.
         */
        if (
            operador ===
            pdfjsLib.OPS.paintInlineImageXObject
        ) {

            const imagen =
                argumentos[0];


            if (!imagen) {
                continue;
            }


            const firma = {
                id: "INLINE",
                width:
                    imagen.width || null,
                height:
                    imagen.height || null,
                hash: null,

                perceptualHash:
                    calcularHashPerceptual(
                    imagen
                )
            };


            if (
                imagen.data &&
                imagen.data.byteLength
            ) {

                const bufferImagen =
                    Buffer.from(
                        imagen.data.buffer,
                        imagen.data.byteOffset,
                        imagen.data.byteLength
                    );


                firma.hash =
                    createHash("sha256")
                        .update(bufferImagen)
                        .digest("hex");
            }


            firmas.push(
                firma
            );
        }
    }

    return firmas;
}


/**
 * Endpoint de diagnóstico.
 *
 * Recibe un PDF y devuelve:
 * - nombre del archivo
 * - tipo de tarjeta
 * - cantidad de liquidaciones
 * - registros extraídos
 */
app.post(
    "/convertir",
    upload.array("archivoPDF", 20),

    async (req, res) => {

        try {

            /**
             * Validación:
             * debe existir al menos un archivo.
             */
            if (
                !req.files ||
                req.files.length === 0
            ) {

                return res
                    .status(400)
                    .json({
                        error:
                            "Debe seleccionar al menos un archivo PDF."
                    });
            }


            /**
             * Arrays donde vamos a separar
             * las liquidaciones según tipo.
             */
            const resumenesLiquidaciones = [];


            /**
             * Procesamos cada PDF recibido.
             */
            for (const archivo of req.files) {

                /**
                 * Validación MIME.
                 */
                if (
                    archivo.mimetype !==
                    "application/pdf"
                ) {

                    return res
                        .status(400)
                        .json({
                            error:
                                `El archivo "${archivo.originalname}" no es un PDF válido.`
                        });
                }


                /**
                 * 1.
                 * Extraer texto completo.
                 */
                const contenidoPDF =
                    await extraerTextoPDF(
                        archivo.buffer
                    );
                const firmasVisuales =
                    await extraerFirmasVisualesPDF(
                        archivo.buffer
                );


                console.log( `[IMAGENES] ${archivo.originalname}`,
                    firmasVisuales
                );
                
                const enteRecaudador =
                    detectarEnteRecaudador(
                        contenidoPDF,
                        archivo.originalname,
                        firmasVisuales
                    );


                if (enteRecaudador === "DESCONOCIDO") 
                {

                    return res.status(400).json({
                        error: `No se pudo identificar el ente recaudador del archivo "${archivo.originalname}".`
                        });
                }

                /**
                 * 2.
                 * Detectar crédito / débito.
                 */
                const tipoTarjeta =
                    detectarTipoTarjeta(
                        contenidoPDF
                    );


                if (
                    tipoTarjeta ===
                    "DESCONOCIDO"
                ) {

                    return res
                        .status(400)
                        .json({
                            error:
                                `No se pudo determinar el tipo de tarjeta del archivo "${archivo.originalname}".`
                        });
                }


                /**
                 * 3.
                 * Extraer liquidaciones.
                 */
                const liquidaciones =
                parsearLiquidacionesTarjetas(
                    contenidoPDF
                );


                const liquidacionesNumeradas =
                    liquidaciones.map(
                    (liquidacion, indice) => ({
                        ...liquidacion,

                    enteRecaudador,

                    tipoTarjeta,

                    numeroLiquidacion:
                        indice + 1
                })
            );

    resumenesLiquidaciones.push({
    archivo:
        archivo.originalname,

    enteRecaudador,

    tipoTarjeta,

    liquidaciones:
        liquidacionesNumeradas
});

 
        }// Cierra: for (const archivo of req.files)

            /**
             * Generación del Excel.
             *
             * Ahora excelService deberá aceptar
             * ambos arrays.
             */
            const bufferExcel =
                await generarExcelLiquidacionTarjetas(
                    resumenesLiquidaciones
                );


            /**
             * Nombre del archivo resultante.
             */
            let nombreArchivo =
                "Resumen_Liquidacion_Tarjetas.xlsx";


            


            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );


            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${nombreArchivo}"`
            );


            return res.send(
                Buffer.from(bufferExcel)
            );

        } catch (error) {

            console.error(
                "[ERROR]",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Error procesando los PDF."
                });
        }
    }
);


/**
 * Inicio del servidor.
 */
app.listen(
    PORT,
    () => {

        console.log(
            `Servidor iniciado en puerto ${PORT}`
        );

        console.log(
            `http://localhost:${PORT}`
        );

        console.log(
            "========================================"
        );

    }
);