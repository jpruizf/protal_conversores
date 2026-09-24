const express = require("express");
const multer = require("multer");
const path = require("path");


// ============================================================
// INFORME ACTUAL
// ============================================================
const { procesarInformeLiquidacion } = require("./parserServer");
const { generarExcelLiquidacion } = require("./excelService");


// ============================================================
// SAN JUAN LINK
// ============================================================
const {
    procesarSanJuanLink
}= require("./parserSanJuanLink");
const {
    generarExcelSanJuanLink
}= require("./excelServiceSanJuanLink");

// ============================================================
// DETECTOR AUTOMÁTICO
// ============================================================



// ============================================================
// Generador de excel por lote de informes
// ============================================================
const {
    generarExcelLote
} = require("./excelServiceLote");

const {
    TIPOS_INFORME,
    detectarTipoLiquidacion
}= require("./detectorLiquidacion");

const app = express();
const PORT = process.env.PORT || 3005;

// El archivo TXT se procesa en memoria.
// No depende de carpetas uploads ni de rutas específicas del equipo.
const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 10 * 1024 * 1024, // Máximo: 10 MB
    },

    fileFilter: (req, file, callback) => {
        const extension = path.extname(file.originalname).toLowerCase();

        if (extension !== ".txt") {
            return callback(
                new Error("El archivo seleccionado debe tener extensión .txt")
            );
        }

        callback(null, true);
    },
});

// Publica index.html, script.js y style.css.
app.use(express.static(path.join(__dirname, "public")));

// Verificación rápida del servidor.
app.get("/estado", (req, res) => {
    res.json({
        estado: "activo",
        servicio: "Conversor Informe de Liquidación TXT a Excel",
        puerto: PORT,
    });
});

// Recibe el informe TXT y devuelve el Excel.
app.post(
    "/convertir",
    upload.single("archivoTXT"),
    async (req, res, next) => {
        const inicio= Date.now();
        const tiempoSegundos = (Date.now() - inicio) / 1000;

        console.log(`[METRICA] LIQUIDACION | OK | ${tiempoSegundos.toFixed(2)} s`);
        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "Debe seleccionar un archivo TXT.",
                });
            }

            // El informe utiliza caracteres comunes del formato Windows.
            // latin1 evita errores con tildes, eñes y símbolos del reporte.
            const contenidoTXT = req.file.buffer.toString("latin1");

            if (!contenidoTXT.trim()) {
                return res.status(400).json({
                    error: "El archivo TXT está vacío.",
                });
            }

            // El parser deberá devolver los datos generales y
            // los registros PX-BRUTO consolidados por fecha.
      
            const tipoInforme =
            detectarTipoLiquidacion(contenidoTXT);
        console.log("====================================");
        console.log("ARCHIVO:", req.file.originalname);
        console.log("TIPO DETECTADO:", tipoInforme);
        console.log("====================================");

let datosLiquidacion;
let excelBuffer;
let sufijoSalida;

switch (tipoInforme) {

    case TIPOS_INFORME.PAGO_FACIL:

        datosLiquidacion =
            procesarInformeLiquidacion(
                contenidoTXT
            );

        if (
            !datosLiquidacion ||
            !Array.isArray(
                datosLiquidacion.detalles
            ) ||
            datosLiquidacion.detalles.length === 0
        ) {
            return res.status(422).json({
                error:
                    "No se encontraron registros válidos en el informe de liquidación."
            });
        }

        excelBuffer =
            await generarExcelLiquidacion(
                datosLiquidacion
            );

        sufijoSalida =
            "liquidacion";

        break;


    case TIPOS_INFORME.SAN_JUAN_LINK:

        datosLiquidacion =
            procesarSanJuanLink(
                contenidoTXT
            );

        if (
            !datosLiquidacion ||
            !Array.isArray(
                datosLiquidacion.detalles
            ) ||
            datosLiquidacion.detalles.length === 0
        ) {
            return res.status(422).json({
                error:
                    "No se encontraron registros de bancos emisores en el informe San Juan Link."
            });
        }

        excelBuffer =
            await generarExcelSanJuanLink(
                datosLiquidacion
            );

        sufijoSalida =
            "san_juan_link";

        break;


        default:

        return res.status(422).json({
            error:
                "El archivo TXT no corresponde a un formato de liquidación reconocido."
        });
        }


        /* Validar que cualquiera de los dos servicios Excel
        haya devuelto correctamente un Buffer. */

        if (!Buffer.isBuffer(excelBuffer)) {
            throw new Error(
            "El módulo de generación Excel no devolvió un archivo Excel válido."
            );
        }

            const nombreOriginal = path.parse(req.file.originalname).name;

            const nombreSeguro = nombreOriginal
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
                .trim();

            const nombreSalida =
                `${nombreSeguro || "Informe_liquidacion"}_convertido.xlsx`;

            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${nombreSalida}"`
            );

            res.setHeader("Content-Length", excelBuffer.length);

            return res.send(excelBuffer);
        } catch (error) {
            next(error);
        }
    }
);

// ============================================================
// CONVERSIÓN MÚLTIPLE
// Varios TXT -> un único Excel
// ============================================================

// ============================================================
// CONVERSIÓN MÚLTIPLE
// Varios TXT -> un único Excel
// ============================================================

app.post(
    "/convertir-lote",
    upload.array("archivosTXT", 50),
    async (req, res, next) => {
        try {

            /* =================================================
               VALIDAR ARCHIVOS
            ================================================= */

            if (
                !req.files ||
                !Array.isArray(req.files) ||
                req.files.length === 0
            ) {
                return res.status(400).json({
                    error:
                        "Debe seleccionar al menos un archivo TXT."
                });
            }


            /* =================================================
               RESULTADOS DEL LOTE
            ================================================= */

            const resultados = [];

            const errores = [];


            /* =================================================
               PROCESAR CADA ARCHIVO
            ================================================= */

            for (const archivo of req.files) {

                try {

                    const contenidoTXT =
                        archivo.buffer.toString(
                            "latin1"
                        );

                    if (
                        !contenidoTXT.trim()
                    ) {
                        errores.push({
                            archivo:
                                archivo.originalname,

                            error:
                                "El archivo está vacío."
                        });

                        continue;
                    }


                    /* =========================================
                       DETECTAR TIPO DE INFORME
                    ========================================= */

                    const tipoInforme =
                        detectarTipoLiquidacion(
                            contenidoTXT
                        );

                    console.log(
                        "===================================="
                    );

                    console.log(
                        "ARCHIVO LOTE:",
                        archivo.originalname
                    );

                    console.log(
                        "TIPO DETECTADO:",
                        tipoInforme
                    );

                    console.log(
                        "===================================="
                    );


                    let datosLiquidacion;


                    /* =========================================
                       SELECCIONAR PARSER
                    ========================================= */

                    switch (tipoInforme) {

                        /* ===============================
                           PAGO FÁCIL
                        =============================== */

                        case TIPOS_INFORME.PAGO_FACIL:

                            datosLiquidacion =
                                procesarInformeLiquidacion(
                                    contenidoTXT
                                );

                            break;


                        /* ===============================
                           SAN JUAN LINK
                        =============================== */

                        case TIPOS_INFORME.SAN_JUAN_LINK:

                            datosLiquidacion =
                                procesarSanJuanLink(
                                    contenidoTXT
                                );

                            break;


                        /* ===============================
                           DESCONOCIDO
                        =============================== */

                        default:

                            errores.push({
                                archivo:
                                    archivo.originalname,

                                error:
                                    "Formato de informe no reconocido."
                            });

                            continue;
                    }


                    /* =========================================
                       VALIDAR RESULTADO DEL PARSER
                    ========================================= */

                    if (
                        !datosLiquidacion ||
                        !Array.isArray(
                            datosLiquidacion.detalles
                        ) ||
                        datosLiquidacion.detalles.length === 0
                    ) {
                        errores.push({
                            archivo:
                                archivo.originalname,

                            error:
                                "El informe no contiene registros válidos."
                        });

                        continue;
                    }


                    /* =========================================
                       GUARDAR RESULTADO
                    ========================================= */

                    resultados.push({
                        nombreArchivo:
                            archivo.originalname,

                        tipoInforme,

                        datos:
                            datosLiquidacion
                    });


                } catch (errorArchivo) {

                    console.error(
                        `Error procesando ${archivo.originalname}:`,
                        errorArchivo
                    );

                    errores.push({
                        archivo:
                            archivo.originalname,

                        error:
                            errorArchivo.message ||
                            "Error procesando el archivo."
                    });
                }
            }


            /* =================================================
               VALIDAR QUE AL MENOS UNO FUE PROCESADO
            ================================================= */

            if (
                resultados.length === 0
            ) {
                return res.status(422).json({
                    error:
                        "No se pudo procesar ningún informe del lote.",

                    errores
                });
            }


            /* =================================================
               INFORMACIÓN TEMPORAL DE DIAGNÓSTICO
            ================================================= */

            console.log(
                "===================================="
            );

            console.log(
                "LOTE PROCESADO"
            );

            console.log(
                "Archivos recibidos:",
                req.files.length
            );

            console.log(
                "Archivos válidos:",
                resultados.length
            );

            console.log(
                "Archivos con error:",
                errores.length
            );

            console.log(
                "===================================="
            );


            /*
             * ==================================================
             * SIGUIENTE FASE
             * ==================================================
             *
             * Aquí llamaremos a:
             *
             * const excelBuffer =
             *     await generarExcelLote(
             *         resultados,
             *         errores
             *     );
             *
             * y devolveremos el Excel.
             *
             * Por ahora podemos responder JSON para comprobar
             * que la carga múltiple y los parsers funcionan.
             */
    const excelBuffer =
    await generarExcelLote(
        resultados,
        errores
    );

    if (!Buffer.isBuffer(excelBuffer)) {
        throw new Error(
            "El módulo excelServiceLote no devolvió un archivo Excel válido."
        );
    }

    res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
        "Content-Disposition",
        'attachment; filename="Liquidaciones_lote.xlsx"'
        );

        res.setHeader(
            "Content-Length",
            excelBuffer.length
        );

        return res.send(excelBuffer);


        } catch (error) {
            next(error);
        }
    }
);


// Manejo centralizado de errores.
app.use((error, req, res, next) => {
    console.error("Error en el conversor:", error);

    if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({
                error: "El archivo supera el límite permitido de 10 MB.",
            });
        }

        return res.status(400).json({
            error: `Error al cargar el archivo: ${error.message}`,
        });
    }

    if (
        error.message ===
        "El archivo seleccionado debe tener extensión .txt"
    ) {
        return res.status(400).json({
            error: error.message,
        });
    }

    return res.status(500).json({
        error:
            error.message ||
            "Ocurrió un error inesperado durante la conversión.",
    });
});

app.listen(PORT, "127.0.0.1", () => {
    console.log("====================================================");
    console.log(" Conversor Informe de Liquidacion TXT a Excel");
    console.log(` Servidor activo: http://127.0.0.1:${PORT}`);
    console.log("====================================================");
});