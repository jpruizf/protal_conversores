

const form = 
    document.getElementById(
        "formConciliador"
    );

const btnDescargarExcel =
    document.getElementById(
        "btnDescargarExcel"
    );

const estado =
    document.getElementById(
        "estado"
    );

const spinner =
    document.getElementById(
        "spinner"
    );


const inputMayor =
    document.getElementById(
        "mayor"
    );

const inputLiquidaciones =
    document.getElementById(
        "liquidaciones"
    );

const inputBanco =
    document.getElementById(
        "banco"
    );


const nombreMayor =
    document.getElementById(
        "nombreMayor"
    );

const nombreLiquidaciones =
    document.getElementById(
        "nombreLiquidaciones"
    );

const nombreBanco =
    document.getElementById(
        "nombreBanco"
    );


/* ========================================================
   MOSTRAR NOMBRE DE ARCHIVOS
======================================================== */

inputMayor.addEventListener(
    "change",
    () => {

        nombreMayor.textContent =
            inputMayor.files[0]
                ? inputMayor.files[0].name
                : "Ningún archivo seleccionado";
    }
);


inputLiquidaciones.addEventListener(
    "change",
    () => {

        nombreLiquidaciones.textContent =
            inputLiquidaciones.files[0]
                ? inputLiquidaciones.files[0].name
                : "Ningún archivo seleccionado";
    }
);


inputBanco.addEventListener(
    "change",
    () => {

        nombreBanco.textContent =
            inputBanco.files[0]
                ? inputBanco.files[0].name
                : "Ningún archivo seleccionado";
    }
);


/* ========================================================
   EVENTO GENERAR Y DESCARGAR EXCEL
======================================================== */

btnDescargarExcel.addEventListener(
    "click",
    async () => {

        const archivoMayor =
            inputMayor.files[0];

        const archivoLiquidaciones =
            inputLiquidaciones.files[0];

        const archivoBanco =
            inputBanco.files[0];


        /* ====================================================
           VALIDAR ARCHIVOS
        ==================================================== */

        if (
            !archivoMayor ||
            !archivoLiquidaciones ||
            !archivoBanco
        ) {

            mostrarEstado(
                "Debe seleccionar los tres archivos antes de generar el Excel.",
                "error"
            );

            return;
        }


        /* ====================================================
           PREPARAR FORM DATA
        ==================================================== */

        const formData =
            new FormData();


        formData.append(
            "mayor",
            archivoMayor
        );


        formData.append(
            "liquidaciones",
            archivoLiquidaciones
        );


        formData.append(
            "banco",
            archivoBanco
        );


        /* ====================================================
           ESTADO VISUAL
        ==================================================== */

        btnDescargarExcel.disabled =
            true;


        btnDescargarExcel.textContent =
            "Generando Excel...";


        spinner.classList.remove(
            "oculto"
        );


        mostrarEstado(
            "Procesando conciliación y generando Excel...",
            "procesando"
        );


        try {

            /* ====================================================
               ENVIAR ARCHIVOS
            ==================================================== */

            const respuesta =
                await fetch(
                    "./procesar-excel",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            /* ====================================================
               MANEJO DE ERROR DEL SERVIDOR
            ==================================================== */

            if (!respuesta.ok) {

                const tipoContenido =
                    respuesta.headers.get(
                        "content-type"
                    ) || "";


                /*
                 * Si Express devuelve JSON,
                 * mostramos su mensaje.
                 */
                if (
                    tipoContenido.includes(
                        "application/json"
                    )
                ) {

                    const error =
                        await respuesta.json();


                    throw new Error(
                        error.error ||
                        "No se pudo generar el Excel."
                    );
                }


                /*
                 * Si devuelve HTML, evitamos:
                 *
                 * Unexpected token '<'
                 */
                const texto =
                    await respuesta.text();


                throw new Error(
                    `Error del servidor (${respuesta.status}): ${texto}`
                );
            }


            /* ====================================================
               RECIBIR EXCEL
            ==================================================== */

            const blob =
                await respuesta.blob();


            /*
             * Validación adicional.
             *
             * Evita descargar accidentalmente
             * una respuesta vacía.
             */
            if (
                !blob ||
                blob.size === 0
            ) {

                throw new Error(
                    "El servidor devolvió un archivo vacío."
                );
            }


            /* ====================================================
               GENERAR DESCARGA
            ==================================================== */

            const url =
                URL.createObjectURL(
                    blob
                );


            const enlace =
                document.createElement(
                    "a"
                );


            enlace.href =
                url;


            enlace.download =
                "Resultado_Conciliacion.xlsx";


            document.body.appendChild(
                enlace
            );


            enlace.click();


            enlace.remove();


            URL.revokeObjectURL(
                url
            );


            /* ====================================================
               RESULTADO
            ==================================================== */

            mostrarEstado(
                "Excel de conciliación generado correctamente.",
                "exito"
            );


        } catch (error) {

            console.error(
                "[CONCILIADOR]",
                error
            );


            mostrarEstado(
                error.message ||
                "Ocurrió un error al generar el Excel.",
                "error"
            );


        } finally {

            /* ====================================================
               RESTAURAR INTERFAZ
            ==================================================== */

            spinner.classList.add(
                "oculto"
            );


            btnDescargarExcel.disabled =
                false;


            btnDescargarExcel.textContent =
                "Generar y descargar Excel";
        }
    }
);


/* ========================================================
   MOSTRAR ESTADO
======================================================== */

function mostrarEstado(
    mensaje,
    tipo
) {

    estado.textContent =
        mensaje;


    estado.className =
        "estado";


    if (tipo) {

        estado.classList.add(
            tipo
        );
    }
}