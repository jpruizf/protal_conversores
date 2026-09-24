const archivoPDF =
    document.getElementById(
        "archivoPDF"
    );


const archivoSeleccionado =
    document.getElementById(
        "archivoSeleccionado"
    );


const btnConvertir =
    document.getElementById(
        "btnConvertir"
    );


const estado =
    document.getElementById(
        "estado"
    );


const spinnerContenedor =
    document.getElementById(
        "spinnerContenedor"
    );


const zonaArchivo =
    document.getElementById(
        "zonaArchivo"
    );


/**
 * ============================================================
 * FUNCIONES DE ESTADO
 * ============================================================
 */

function mostrarEstado(
    mensaje,
    tipo = ""
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


function limpiarEstado() {

    estado.textContent =
        "";

    estado.className =
        "estado";

}


function mostrarSpinner() {

    spinnerContenedor.classList.remove(
        "oculto"
    );

}


function ocultarSpinner() {

    spinnerContenedor.classList.add(
        "oculto"
    );

}


/**
 * ============================================================
 * SELECCIÓN DE ARCHIVO
 * ============================================================
 */

archivoPDF.addEventListener(
    "change",
    () => {

        const archivos =
            archivoPDF.files;


        limpiarEstado();


        if (
            !archivos ||
            archivos.length === 0
        ) {

            archivoSeleccionado.textContent =
                "Ningún archivo seleccionado";

            return;

        }


        archivoSeleccionado.innerHTML =
            Array.from(
                archivos
            )
            .map(
                archivo =>
                    archivo.name
            )
            .join("<br>");

    }
);



/**
 * ============================================================
 * ARRASTRAR ARCHIVO
 * ============================================================
 */

zonaArchivo.addEventListener(
    "dragover",
    evento => {

        evento.preventDefault();


        zonaArchivo.classList.add(
            "arrastrando"
        );

    }
);


zonaArchivo.addEventListener(
    "dragleave",
    () => {

        zonaArchivo.classList.remove(
            "arrastrando"
        );

    }
);


zonaArchivo.addEventListener(
    "drop",
    evento => {

        evento.preventDefault();


        zonaArchivo.classList.remove(
            "arrastrando"
        );


        const archivos =
            evento.dataTransfer.files;


        if (
            !archivos ||
            archivos.length === 0
        ) {
            return;
        }


        const archivo =
            archivos[0];


        if (
            archivo.type !==
            "application/pdf"
        ) {

            mostrarEstado(
                "El archivo seleccionado no es un PDF.",
                "error"
            );

            return;

        }


        const transferencia =
            new DataTransfer();


        transferencia.items.add(
            archivo
        );


        archivoPDF.files =
            transferencia.files;


        archivoSeleccionado.textContent =
            archivo.name;


        limpiarEstado();

    }
);


/**
 * ============================================================
 * CONVERSIÓN
 * ============================================================
 */

btnConvertir.addEventListener(
    "click",
    async () => {

        const archivos = archivoPDF.files;


        if (!archivos || archivos.length === 0 ) {

            mostrarEstado (
                "Seleccioná al menos un archivo PDF.","error"
            );
            return;

        }   


        const formData = new FormData();


        for (const archivo of archivos) {

            formData.append(
                "archivoPDF",
                archivo
            );

        }


        try{

            btnConvertir.disabled =
                true;


            mostrarSpinner();


            mostrarEstado(
                "Procesando resumen...",
                "procesando"
            );


            const respuesta =
                await fetch(
                    "./convertir",
                    {
                        method:
                            "POST",

                        body:
                            formData
                    }
                );


            if (
                !respuesta.ok
            ) {

                let mensaje =
                    "Error al procesar el archivo.";


                try {

                    const error =
                        await respuesta.json();


                    if (
                        error &&
                        error.error
                    ) {

                        mensaje =
                            error.error;

                    }

                }
                catch {

                    // Se mantiene mensaje genérico.

                }


                throw new Error(
                    mensaje
                );

            }


            const blob =
                await respuesta.blob();


            const contentDisposition =
                respuesta.headers.get(
                    "Content-Disposition"
                );


            let nombreArchivo =
                "Resumen_Visa_Galicia.xlsx";


            if (
                contentDisposition
            ) {

                const match =
                    contentDisposition.match(
                        /filename="([^"]+)"/i
                    );


                if (
                    match &&
                    match[1]
                ) {

                    nombreArchivo =
                        match[1];

                }

            }


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
                nombreArchivo;


            document.body.appendChild(
                enlace
            );


            enlace.click();


            enlace.remove();


            URL.revokeObjectURL(
                url
            );


            mostrarEstado(
                "Conversión completada correctamente.",
                "exito"
            );


            /**
             * Limpieza para permitir
             * seleccionar nuevamente
             * incluso el mismo archivo.
             */
            archivoPDF.value =
                "";


            archivoSeleccionado.textContent =
                "Ningún archivo seleccionado";

        }
        catch (
            error
        ) {

            console.error(
                error
            );


            mostrarEstado(
                error.message ||
                "Error al procesar el resumen.",
                "error"
            );

        }
        finally {

            ocultarSpinner();


            btnConvertir.disabled =
                false;

        }

    }
);