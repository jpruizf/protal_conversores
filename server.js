const express = require('express');
const multer = require('multer');
const fs = require('fs');

const {
    detectarFormato
} = require('./services/detectorTarjeta');

const {
    parseHeaderDate,
    parseLine
} = require('./services/parserTarjetas');

const {
    generarExcelTarjetas
} = require('./services/excelService');


const app = express();

const upload = multer({
    dest: 'uploads/'
});



/**
 * Middleware para leer formularios
 * y servir archivos estáticos.
 */
app.use(
    express.urlencoded({
        extended: true
    })
);

app.use(
    express.static('public')
);


/**
 * Ruta de procesamiento y descarga.
 */
app.post(
    '/upload',
    upload.single('file'),
    async (req, res) => {

        const inicio= Date.now();
        const tiempoSegundos = (Date.now() - inicio) / 1000;

        console.log(`[METRICA] TARJETAS | OK | ${tiempoSegundos.toFixed(2)} s`);
        /**
         * Validar archivo recibido.
         */
        if (!req.file) {
            return res
                .status(400)
                .send(
                    'Error: No se ha seleccionado ningún archivo.'
                );
        }


        const filePath =
            req.file.path;


        try {

            /**
             * ====================================================
             * 1. LEER ARCHIVO
             * ====================================================
             */
            const fileContent =
                fs.readFileSync(
                    filePath,
                    'utf-8'
                );


            const lines =
                fileContent.split(/\r?\n/);


            if (
                lines.length === 0 ||
                lines[0].trim() === ''
            ) {
                return res
                    .status(400)
                    .send(
                        'Error: El archivo provisto está vacío.'
                    );
            }


            /**
             * ====================================================
             * 2. DETERMINAR FORMATO
             * ====================================================
             */
            let selectedFormat =
                req.body.formatType;


            if (
                !selectedFormat ||
                selectedFormat === 'AUTO'
            ) {
                selectedFormat =
                    detectarFormato(
                        lines[0]
                    );
            }


            /**
             * ====================================================
             * 3. OBTENER FECHA DEL REPORTE
             * ====================================================
             */
            let fechaReporte =
                'N/A';


            const primeraLinea =
                lines[0];


            const esFormatoVisa =
                selectedFormat === 'RDEBLIQD' ||
                selectedFormat === 'LDEBLIQD' ||
                selectedFormat === 'DEBLIQC';


            if (
                esFormatoVisa &&
                primeraLinea.length >= 37
            ) {

                fechaReporte =
                    parseHeaderDate(
                        primeraLinea.substring(
                            29,
                            37
                        )
                    );

            } else {

                /**
                 * Respaldo para formatos
                 * cuya fecha no esté ubicada
                 * en la posición VISA estándar.
                 */
                const matchFecha =
                    primeraLinea.match(
                        /20\d{6}/
                    );


                if (matchFecha) {
                    fechaReporte =
                        parseHeaderDate(
                            matchFecha[0]
                        );
                }
            }


            /**
             * ====================================================
             * 4. PARSEAR REGISTROS
             * ====================================================
             */
            const registros =
                [];


            lines.forEach(
                (line) => {

                    const rowData =
                        parseLine(
                            line,
                            selectedFormat,
                            fechaReporte
                        );


                    if (
                        !rowData ||
                        rowData.type !==
                            'DETALLE'
                    ) {
                        return;
                    }


                    registros.push(
                        rowData
                    );
                }
            );
        console.log(`[DEBUG] Antes de generar Excel | REGISTROS=${registros.length}`);

            /**
             * ====================================================
             * 5. GENERAR EXCEL
             * ====================================================
             */
            const excelBuffer =
                await generarExcelTarjetas(
                    registros,
                    selectedFormat
                );

                console.log(`[METRICA] ${new Date().toISOString()} | TARJETAS | OK | REGISTROS=${registros.length}`);
            /**
             * ====================================================
             * 6. NOMBRE DEL ARCHIVO
             * ====================================================
             */
            const filenameOutput =
                `Reporte_Unificado_${selectedFormat}_${Date.now()}.xlsx`;


            /**
             * ====================================================
             * 7. RESPUESTA HTTP
             * ====================================================
             */
            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );


            res.setHeader(
                'Content-Disposition',
                `attachment; filename="${filenameOutput}"`
            );


            return res.send(
                excelBuffer
            );


        } catch (err) {

            console.error(
                'Error procesando reporte:',
                err
            );


            if (
                !res.headersSent
            ) {
                return res
                    .status(500)
                    .send(
                        'Sucedió un error interno al intentar estructurar el archivo Excel.'
                    );
            }

        } finally {

            /**
             * ====================================================
             * 8. ELIMINAR ARCHIVO TEMPORAL
             * ====================================================
             */
            if (
                filePath &&
                fs.existsSync(
                    filePath
                )
            ) {

                try {

                    fs.unlinkSync(
                        filePath
                    );

                } catch (error) {

                    console.error(
                        'No se pudo eliminar el archivo temporal:',
                        error
                    );

                }
            }
        }
    }
);



/**
 * ==============================================================
 * INICIAR SERVIDOR
 * ==============================================================
 */
const PORT =
    process.env.PORT ||
    3001;


app.listen(
    PORT,
    '127.0.0.1',
    () => {

        console.log(
            `Conversor de tarjetas activo internamente en http://127.0.0.1:${PORT}`
        );

    }
);