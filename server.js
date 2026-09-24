const express = require("express");
const multer = require("multer");
const path = require("path");

const {
    procesarSEPSA
} = require("./services/parserComisionesSEPSA");

const {
    procesarLiquidacionesExcel
} = require("./services/parserLiquidacionesExcel");

const {
    conciliarComisiones
} = require("./services/conciliadorComisiones");

const {
    generarExcelConciliacion
} = require("./services/excelService");


const app = express();

const PORT = 3010;


/**
 * Multer en memoria.
 *
 * No necesitamos guardar temporalmente
 * los archivos en disco.
 */
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize:
            20 * 1024 * 1024
    }
});


/**
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


/**
 * Convierte un PDF recibido como Buffer
 * a texto plano.
 */
async function extraerTextoPdf(buffer) {
    if (!buffer) {
        throw new Error(
            "No se recibió contenido PDF."
        );
    }

    const pdfjsLib =
        await import(
            "pdfjs-dist/legacy/build/pdf.mjs"
        );

    const data =
        new Uint8Array(buffer);

    const pdf =
        await pdfjsLib
            .getDocument({
                data,

                disableWorker: true
            })
            .promise;


    let textoCompleto = "";


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
            await pagina
                .getTextContent();

        const textoPagina =
            contenido.items
                .map(
                    item =>
                        item.str
                )
                .join(" ");

        textoCompleto +=
            textoPagina + "\n";
    }


    return textoCompleto;
}


/**
 * POST /convertir
 *
 * Espera:
 *
 * - archivoPDF:
 *      uno o varios PDF
 *
 * - archivoExcel:
 *      un archivo Excel
 */
app.post(
    "/convertir",

    upload.fields([
        {
            name:
                "archivoPDF",

            maxCount:
                20
        },
        {
            name:
                "archivoExcel",

            maxCount:
                1
        }
    ]),

    async (req, res) => {

        try {

            /**
             * Validación de archivos.
             */
            const archivosPDF =
                req.files
                    ?.archivoPDF ||
                [];

            const archivosExcel =
                req.files
                    ?.archivoExcel ||
                [];


            if (
                archivosPDF.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Seleccioná al menos un archivo PDF de comisiones."
                    });
            }


            if (
                archivosExcel.length === 0
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "Seleccioná el archivo Excel de liquidaciones."
                    });
            }


            const archivoExcel =
                archivosExcel[0];


            /**
             * Validamos extensión Excel.
             */
            const extensionExcel =
                path
                    .extname(
                        archivoExcel
                            .originalname
                    )
                    .toLowerCase();


            if (
                extensionExcel !== ".xlsx"
            ) {
                return res
                    .status(400)
                    .json({
                        error:
                            "El archivo de liquidaciones debe tener formato .xlsx."
                    });
            }


            /**
             * Procesamos primero
             * el Excel de liquidaciones.
             */
            const liquidaciones =
                await procesarLiquidacionesExcel(
                    archivoExcel.buffer,
                    archivoExcel.originalname
                );


            /**
             * Procesamos todos
             * los PDF recibidos.
             */
            const resumenesComision = [];


            for (
                const archivoPDF
                of archivosPDF
            ) {

                const extension =
                    path
                        .extname(
                            archivoPDF
                                .originalname
                        )
                        .toLowerCase();


                if (
                    extension !== ".pdf"
                ) {
                    throw new Error(
                        `El archivo "${archivoPDF.originalname}" no es un PDF válido.`
                    );
                }


                const texto =
                    await extraerTextoPdf(
                        archivoPDF.buffer
                    );


                const resumen =
                    procesarSEPSA(
                        texto,
                        archivoPDF.originalname
                    );


                resumenesComision.push(
                    resumen
                );
            }


            /**
             * Conciliamos PDF
             * contra Excel.
             */
            const resultados =
                conciliarComisiones(
                    resumenesComision,
                    liquidaciones
                );


            /**
             * Generamos Excel final.
             */
            const bufferExcel =
                await generarExcelConciliacion(
                    resultados
                );


            /**
             * Nombre de archivo.
             */
            const nombreSalida =
                "Resumen_Comisiones_Conciliado.xlsx";


            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${nombreSalida}"`
            );


            return res.send(
                Buffer.from(
                    bufferExcel
                )
            );

        }
        catch (error) {

            console.error(
                "[ERROR CONVERSIÓN]",
                error
            );


            return res
                .status(500)
                .json({
                    error:
                        error.message ||
                        "Ocurrió un error al procesar los archivos."
                });
        }
    }
);


/**
 * Inicio del servidor.
 */
app.listen(
    PORT,
    "0.0.0.0",

    () => {
        console.log(
            `Conversor Resumen Comisiones escuchando en puerto ${PORT}`
        );
    }
);