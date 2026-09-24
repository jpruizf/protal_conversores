/**
 * ELEMENTOS DEL DOM
 */
const archivoPDF =
    document.getElementById("archivoPDF");

const nombreArchivo =
    document.getElementById("nombreArchivo");

const btnConvertir =
    document.getElementById("btnConvertir");

const spinner =
    document.getElementById("spinner");

const estado =
    document.getElementById("estado");

const resumen =
    document.getElementById("resumen");

const tipoTarjeta =
    document.getElementById("tipoTarjeta");

const archivoProcesado =
    document.getElementById("archivoProcesado");

const zonaArchivo =
    document.querySelector(".zona-archivo");


/**
 * Muestra mensajes de estado.
 *
 * tipo:
 * - procesando
 * - exito
 * - error
 */
function mostrarEstado(
    mensaje,
    tipo
) {

    estado.textContent =
        mensaje;

    estado.className =
        `estado ${tipo}`;
}


/**
 * Limpia el estado visual.
 */
function limpiarEstado() {

    estado.textContent = "";

    estado.className =
        "estado";
}


/**
 * Activa o desactiva el spinner.
 */
function mostrarSpinner(
    mostrar
) {

    if (mostrar) {

        spinner.classList.remove(
            "oculto"
        );

    } else {

        spinner.classList.add(
            "oculto"
        );
    }
}


/**
 * Activa o desactiva el botón.
 */
function bloquearBoton(
    bloquear
) {

    btnConvertir.disabled =
        bloquear;
}


/**
 * Obtiene el nombre del archivo
 * descargado desde Content-Disposition.
 */
function obtenerNombreDescarga(
    response
) {

    const contentDisposition =
        response.headers.get(
            "Content-Disposition"
        );

    if (!contentDisposition) {

        return "Resumen_Liquidacion_Tarjetas.xlsx";
    }


    const coincidencia =
        contentDisposition.match(
            /filename="?([^"]+)"?/i
        );


    if (
        coincidencia &&
        coincidencia[1]
    ) {

        return coincidencia[1];
    }


    return "Resumen_Liquidacion_Tarjetas.xlsx";
}


/**
 * Intenta determinar el tipo de tarjeta
 * según el nombre de archivo descargado.
 *
 * Esto es solamente informativo
 * para mostrarlo en pantalla.
 */
function detectarTipoDesdeNombre(
    nombre
) {

    const texto =
        String(nombre)
            .toUpperCase();

    if (
        texto.includes("CREDITO")
    ) {

        return "CRÉDITO";
    }


    if (
        texto.includes("DEBITO")
    ) {

        return "DÉBITO";
    }


    return "-";
}


/**
 * Descarga un Blob como archivo.
 */
function descargarArchivo(
    blob,
    nombre
) {

    const url =
        URL.createObjectURL(
            blob
        );


    const enlace =
        document.createElement("a");


    enlace.href =
        url;

    enlace.download =
        nombre;


    document.body.appendChild(
        enlace
    );


    enlace.click();


    enlace.remove();


    URL.revokeObjectURL(
        url
    );
}


/**
 * Limpia la selección después
 * de una conversión exitosa.
 *
 * Permite convertir otro PDF
 * sin recargar la página.
 */
function limpiarSeleccion() {

    archivoPDF.value = "";

    nombreArchivo.textContent =
        "Ningún archivo seleccionado";
}


/**
 * CAMBIO DE ARCHIVO
 */
archivoPDF.addEventListener(
    "change",
    () => {

        limpiarEstado();

        resumen.classList.add(
            "oculto"
        );

        const archivos =
        archivoPDF.files;


    if (!archivos ||
        archivos.length === 0) 
    {

        nombreArchivo.textContent =
        "Ningún archivo seleccionado";

    return;
}


nombreArchivo.textContent =
    Array.from(archivos)
        .map(
            archivo => archivo.name
        )
        .join(" | ");
        
    }
);


/**
 * CONVERTIR PDF
 */
btnConvertir.addEventListener(
    "click",
    async () => {

        limpiarEstado();

        resumen.classList.add(
            "oculto"
        );


        const archivos =
            archivoPDF.files;


        /**
         * Validación:
         * debe existir un archivo.
         */
        if (
            !archivos ||
            archivos.length === 0
        ) {

        mostrarEstado(
            "Debe seleccionar al menos un archivo PDF.",
            "error"
        );

    return;
}
        /**
         * FormData para enviar
         * múltiples archivos PDF.
         */
        const formData =
            new FormData();


        for (const archivo of archivos) {

            const esPDF =
                archivo.type ===
                    "application/pdf" ||
                archivo.name
                    .toLowerCase()
                    .endsWith(".pdf");


            if (!esPDF) {

                mostrarEstado(
                    `El archivo "${archivo.name}" no es un PDF válido.`,
                    "error"
                );

                return;
            }


            /**
             * Todos los archivos utilizan
             * el mismo nombre de campo.
             *
             * Debe coincidir con:
             * upload.array("archivoPDF", 20)
             */
            formData.append(
                "archivoPDF",
                archivo
            );
        }


        try {

            bloquearBoton(true);

            mostrarSpinner(true);


            mostrarEstado(
                "Procesando liquidaciones...",
                "procesando"
            );


            const response =
                await fetch(
                    "./convertir",
                    {
                        method: "POST",
                        body: formData
                    }
                );


            /**
             * Manejo de errores enviados
             * por el backend.
             */
            if (!response.ok) {

                let mensajeError =
                    "Ocurrió un error al procesar los PDF.";


                try {

                    const datosError =
                        await response.json();


                    if (
                        datosError &&
                        datosError.error
                    ) {

                        mensajeError =
                            datosError.error;
                    }

                } catch (error) {

                    // La respuesta no era JSON.
                }


                throw new Error(
                    mensajeError
                );
            }


            /**
             * Nombre del Excel generado.
             */
            const nombreDescarga =
                obtenerNombreDescarga(
                    response
                );


            /**
             * Excel recibido como Blob.
             */
            const blob =
                await response.blob();


            /**
             * Descarga automática.
             */
            descargarArchivo(
                blob,
                nombreDescarga
            );


            /**
             * Información visual.
             *
             * No afecta la generación
             * de las hojas del Excel.
             */
            tipoTarjeta.textContent =
                detectarTipoDesdeNombre(
                    nombreDescarga
                );


            archivoProcesado.textContent =
                Array.from(archivos)
                    .map(
                        archivo =>
                            archivo.name
                    )
                    .join(" | ");


            resumen.classList.remove(
                "oculto"
            );


            mostrarEstado(
                "Conversión realizada correctamente.",
                "exito"
            );


            /**
             * Permite realizar otra conversión
             * sin recargar la página.
             */
            limpiarSeleccion();

        } catch (error) {

            console.error(
                "[FRONTEND]",
                error
            );


            mostrarEstado(
                error.message ||
                    "Error al procesar los archivos.",
                "error"
            );

        } finally {

            mostrarSpinner(false);

            bloquearBoton(false);
        }

    }
);

         


/**
 * DRAG & DROP
 *
 * La zona sigue siendo un label,
 * pero agregamos indicación visual
 * cuando se arrastra un archivo.
 */
[
    "dragenter",
    "dragover"
].forEach(
    evento => {

        zonaArchivo.addEventListener(
            evento,
            (event) => {

                event.preventDefault();

                zonaArchivo.classList.add(
                    "arrastrando"
                );
            }
        );

    }
);


[
    "dragleave",
    "drop"
].forEach(
    evento => {

        zonaArchivo.addEventListener(
            evento,
            (event) => {

                event.preventDefault();

                zonaArchivo.classList.remove(
                    "arrastrando"
                );
            }
        );

    }
);


/**
 * ARCHIVO ARRASTRADO
 */
zonaArchivo.addEventListener(
    "drop",
    (event) => {

        const archivos =
            event.dataTransfer.files;


        if (
            !archivos ||
            archivos.length === 0
        ) {

            return;
        }


        const archivo =
            archivos[0];


        const esPDF =
            archivo.type ===
                "application/pdf" ||
            archivo.name
                .toLowerCase()
                .endsWith(".pdf");


        if (!esPDF) {

            mostrarEstado(
                "El archivo seleccionado debe ser un PDF.",
                "error"
            );

            return;
        }


        /**
         * DataTransfer permite asignar
         * el archivo arrastrado al input.
         */
        const transferencia =
            new DataTransfer();


        transferencia.items.add(
            archivo
        );


        archivoPDF.files =
            transferencia.files;


        nombreArchivo.textContent =
            archivo.name;


        limpiarEstado();

        resumen.classList.add(
            "oculto"
        );
    }
);