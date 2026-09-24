const express = require("express");
const multer = require("multer");

const {
    parsearMayor
} = require("./services/parserMayor");

const {
    parsearLiquidaciones,
    parsearResumenLiquidaciones
} = require("./services/parserLiquidaciones");

const {
    parsearBanco
} = require("./services/parserBanco");

const {
    conciliar
} = require("./services/conciliador");

const {
    generarExcelResultadoConciliacion
} = require(
    "./services/excelResultadoConciliacion"
);

const app = express();

const PORT = 3007;


/* ========================================================
   CONFIGURACIÓN MULTER
======================================================== */

const upload = multer({
    storage: multer.memoryStorage(),

    limits: {
        fileSize: 20 * 1024 * 1024
    },

    fileFilter: (req, file, cb) => {

        const nombre =
            file.originalname.toLowerCase();

        if (
            nombre.endsWith(".xlsx") ||
            nombre.endsWith(".xls")
        ) {
            return cb(null, true);
        }

        cb(
            new Error(
                "Solo se permiten archivos Excel."
            )
        );
    }
});


/* ========================================================
   ARCHIVOS ESTÁTICOS
======================================================== */

app.use(
    express.static("public")
);



/* ========================================================
   ENDPOINT GENERAR EXCEL
======================================================== */
app.post(
    "/procesar-excel",

    upload.fields([
        {
            name: "mayor",
            maxCount: 1
        },
        {
            name: "liquidaciones",
            maxCount: 1
        },
        {
            name: "banco",
            maxCount: 1
        }
    ]),

    async (req, res) => {

        try {

            if (
                !req.files ||
                !req.files.mayor ||
                !req.files.liquidaciones ||
                !req.files.banco
            ) {
                return res
                    .status(400)
                    .json({
                        ok: false,
                        error:
                            "Debe seleccionar los tres archivos: Mayor, Liquidaciones y Mayor Banco."
                    });
            }


            const archivoMayor =
                req.files.mayor[0];

            const archivoLiquidaciones =
                req.files.liquidaciones[0];

            const archivoBanco =
                req.files.banco[0];


            console.log(
                "\n========================================"
            );

            console.log(
                "[EXCEL] Solicitud recibida"
            );


            const mayor =
                await parsearMayor(
                    archivoMayor.buffer
                );

            console.log(
                `[EXCEL] Mayor leído: ${mayor.length}`
            );


            const liquidaciones =
                await parsearLiquidaciones(
                    archivoLiquidaciones.buffer
                );

            const resumenLiquidaciones =
            await parsearResumenLiquidaciones(
             archivoLiquidaciones.buffer
            );


            console.log(
            `[EXCEL] Resumen liquidaciones leído: ${resumenLiquidaciones.length}`
            );
            console.log(
                `[EXCEL] Liquidaciones leídas: ${liquidaciones.length}`
            );


            const banco =
                await parsearBanco(
                    archivoBanco.buffer
                );

            console.log(
    `[EXCEL] Mayor leído: ${mayor.length}`
);

mayor
    .slice(0, 10)
    .forEach(
        item => {
            console.log(
                `[MAYOR] ` +
                `FECHA=${item.fecha} | ` +
                `DEBE=${(
                    item.debeCentavos / 100
                ).toFixed(2)}`
            );
        }
    );


console.log(
    `[EXCEL] Resumen liquidaciones leído: ${resumenLiquidaciones.length}`
);

resumenLiquidaciones
    .forEach(
        item => {
            console.log(
                `[RESUMEN] ` +
                `FECHA=${item.fecha} | ` +
                `BRUTO=${(
                    item.brutoCentavos / 100
                ).toFixed(2)} | ` +
                `NETO=${(
                    item.netoCentavos / 100
                ).toFixed(2)}`
            );
        }
    );


console.log(
    `[EXCEL] Banco leído: ${banco.length}`
);

banco
    .forEach(
        item => {
            console.log(
                `[BANCO RAW] ` +
                `FECHA=${item.fecha} | ` +
                `CREDITO=${(
                    item.creditoCentavos / 100
                ).toFixed(2)}`
            );
        }
    );

            console.log(
                `[EXCEL] Banco leído: ${banco.length}`
            );


            console.log(
                "[EXCEL] Iniciando conciliación"
            );


            const resultadoConciliacion =
                conciliar(
                    mayor,
                    liquidaciones,
                    banco,
                    resumenLiquidaciones
                );


            console.log(
                "[EXCEL] Conciliación terminada"
            );


            console.log(
                "[EXCEL] Generando archivo"
            );


            const bufferExcel =
                await generarExcelResultadoConciliacion(
                    resultadoConciliacion,
                    mayor,
                    liquidaciones,
                    banco
                );


            console.log(
                `[EXCEL] Archivo generado: ${bufferExcel.length} bytes`
            );


            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );

            res.setHeader(
                "Content-Disposition",
                'attachment; filename="Resultado_Conciliacion.xlsx"'
            );


            console.log(
                "[EXCEL] Enviando archivo"
            );


            return res.send(
                Buffer.from(
                    bufferExcel
                )
            );

        } catch (error) {

            console.error(
                "[CONCILIADOR EXCEL ERROR]",
                error
            );


            return res
                .status(500)
                .json({
                    ok: false,
                    error:
                        error.message ||
                        "Ocurrió un error al generar el Excel."
                });
        }
    }
);



/* ========================================================
   MANEJO DE ERRORES MULTER
======================================================== */

app.use(
    (error, req, res, next) => {

        if (
            error instanceof multer.MulterError
        ) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        `Error al cargar archivos: ${error.message}`
                });
        }


        if (error) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        error.message
                });
        }


        next();
    }
);


/* ========================================================
   INICIO DEL SERVIDOR
======================================================== */

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            "========================================"
        );

        console.log(
            "CONCILIADOR INTERREDES"
        );

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