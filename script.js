const archivoPDF =
    document.getElementById(
        "archivoPDF"
    );

const archivoExcel =
    document.getElementById(
        "archivoExcel"
    );

const pdfSeleccionados =
    document.getElementById(
        "pdfSeleccionados"
    );

const excelSeleccionado =
    document.getElementById(
        "excelSeleccionado"
    );

const btnConvertir =
    document.getElementById(
        "btnConvertir"
    );

const spinnerContenedor =
    document.getElementById(
        "spinnerContenedor"
    );

const estado =
    document.getElementById(
        "estado"
    );


/**
 * Limpia mensajes y estados visuales.
 */
function limpiarEstado() {
    estado.textContent = "";

    estado.classList.remove(
        "exito",
        "error"
    );
}


/**
 * Muestra u oculta el spinner.
 */
function mostrarSpinner(mostrar) {
    if (mostrar) {
        spinnerContenedor
            .classList
            .remove("oculto");
    }
    else {
        spinnerContenedor
            .classList
            .add("oculto");
    }
}


/**
 * Muestra un mensaje de estado.
 */
function mostrarEstado(
    mensaje,
    tipo = ""
) {
    estado.textContent =
        mensaje;

    estado.classList.remove(
        "exito",
        "error"
    );

    if (tipo) {
        estado.classList.add(
            tipo
        );
    }
}


/**
 * Actualiza la lista de PDF seleccionados.
 */
archivoPDF.addEventListener(
    "change",
    () => {

        limpiarEstado();

        const archivos =
            Array.from(
                archivoPDF.files
            );


        if (
            archivos.length === 0
        ) {
            pdfSeleccionados
                .textContent =
                "Ningún PDF seleccionado";

            return;
        }


        if (
            archivos.length === 1
        ) {
            pdfSeleccionados
                .textContent =
                archivos[0].name;

            return;
        }


        pdfSeleccionados
            .textContent =
            `${archivos.length} archivos PDF seleccionados`;
    }
);


/**
 * Actualiza el Excel seleccionado.
 */
archivoExcel.addEventListener(
    "change",
    () => {

        limpiarEstado();

        const archivo =
            archivoExcel.files[0];


        if (!archivo) {
            excelSeleccionado
                .textContent =
                "Ningún Excel seleccionado";

            return;
        }


        excelSeleccionado
            .textContent =
            archivo.name;
    }
);


/**
 * Convierte los archivos.
 */
btnConvertir.addEventListener(
    "click",
    async () => {

        limpiarEstado();


        const archivosPDF =
            Array.from(
                archivoPDF.files
            );

        const excel =
            archivoExcel.files[0];


        /**
         * Validaciones.
         */
        if (
            archivosPDF.length === 0
        ) {
            mostrarEstado(
                "Seleccioná al menos un archivo PDF de comisiones.",
                "error"
            );

            return;
        }


        if (!excel) {
            mostrarEstado(
                "Seleccioná el archivo Excel de liquidaciones.",
                "error"
            );

            return;
        }


        /**
         * Validamos PDF.
         */
        const pdfInvalido =
            archivosPDF.find(
                archivo =>
                    archivo.type !==
                    "application/pdf"
            );


        if (pdfInvalido) {
            mostrarEstado(
                `El archivo "${pdfInvalido.name}" no es un PDF válido.`,
                "error"
            );

            return;
        }


        /**
         * Validamos Excel.
         */
        const extensionExcel =
            excel.name
                .split(".")
                .pop()
                .toLowerCase();


        if (
            extensionExcel !==
            "xlsx"
        ) {
            mostrarEstado(
                "El archivo de liquidaciones debe tener formato .xlsx.",
                "error"
            );

            return;
        }


        /**
         * Preparamos los archivos.
         */
        const formData =
            new FormData();


        archivosPDF.forEach(
            archivo => {

                formData.append(
                    "archivoPDF",
                    archivo
                );
            }
        );


        formData.append(
            "archivoExcel",
            excel
        );


        /**
         * Bloqueamos el botón
         * mientras procesa.
         */
        btnConvertir.disabled =
            true;

        mostrarSpinner(true);

        mostrarEstado(
            "Procesando archivos..."
        );


        try {

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


            /**
             * Si hubo error,
             * intentamos leer el JSON
             * devuelto por el servidor.
             */
            if (!respuesta.ok) {

                let mensajeError =
                    "Ocurrió un error al procesar los archivos.";


                try {
                    const datosError =
                        await respuesta.json();

                    if (
                        datosError &&
                        datosError.error
                    ) {
                        mensajeError =
                            datosError.error;
                    }
                }
                catch {
                    /*
                     * Si la respuesta no es JSON,
                     * mantenemos el mensaje genérico.
                     */
                }


                throw new Error(
                    mensajeError
                );
            }


            /**
             * Convertimos la respuesta
             * en archivo descargable.
             */
            const blob =
                await respuesta.blob();


            const url =
                window.URL
                    .createObjectURL(
                        blob
                    );


            const enlace =
                document.createElement(
                    "a"
                );


            enlace.href =
                url;

            enlace.download =
                "Resumen_Comisiones_Conciliado.xlsx";


            document.body
                .appendChild(
                    enlace
                );


            enlace.click();


            enlace.remove();


            window.URL
                .revokeObjectURL(
                    url
                );


            mostrarEstado(
                "Proceso completado correctamente.",
                "exito"
            );


            /**
             * Limpiamos inputs para permitir
             * una nueva conversión sin
             * recargar la página.
             */
            archivoPDF.value =
                "";

            archivoExcel.value =
                "";


            pdfSeleccionados
                .textContent =
                "Ningún PDF seleccionado";


            excelSeleccionado
                .textContent =
                "Ningún Excel seleccionado";

        }
        catch (error) {

            console.error(
                "[ERROR]",
                error
            );


            mostrarEstado(
                error.message ||
                "Ocurrió un error durante la conversión.",
                "error"
            );
        }
        finally {

            mostrarSpinner(false);

            btnConvertir.disabled =
                false;
        }
    }
);