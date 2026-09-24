const formConversor =
    document.getElementById("formConversor");

const archivoTXT =
    document.getElementById("archivoTXT");

const botonSeleccionar =
    document.getElementById("botonSeleccionar");

const botonConvertir =
    document.getElementById("botonConvertir");

const zonaArchivo =
    document.getElementById("zonaArchivo");

const nombreArchivo =
    document.getElementById("nombreArchivo");

const estadoProceso =
    document.getElementById("estadoProceso");

const mensajeEstado =
    document.getElementById("mensajeEstado");

const spinner =
    document.getElementById("spinner");

let archivoSeleccionado = [];

/**
 * Abre el selector de archivos.
 */
botonSeleccionar.addEventListener(
    "click",
    () => {
        archivoTXT.click();
    }
);

/**
 * Procesa el archivo seleccionado manualmente.
 */
archivoTXT.addEventListener(
    "change",
    () => {
        const archivos =
            Array.from(archivoTXT.files);

        seleccionarArchivos(archivos);
    }
);

/**
 * Permite hacer clic sobre toda la zona.
 */
zonaArchivo.addEventListener(
    "click",
    (evento) => {
        if (
            evento.target !== botonSeleccionar &&
            !botonSeleccionar.contains(evento.target)
        ) {
            archivoTXT.click();
        }
    }
);

/**
 * Evita que el navegador abra el archivo arrastrado.
 */
["dragenter", "dragover"].forEach(
    (nombreEvento) => {
        zonaArchivo.addEventListener(
            nombreEvento,
            (evento) => {
                evento.preventDefault();
                evento.stopPropagation();

                zonaArchivo.classList.add(
                    "arrastrando"
                );
            }
        );
    }
);

["dragleave", "drop"].forEach(
    (nombreEvento) => {
        zonaArchivo.addEventListener(
            nombreEvento,
            (evento) => {
                evento.preventDefault();
                evento.stopPropagation();

                zonaArchivo.classList.remove(
                    "arrastrando"
                );
            }
        );
    }
);

/**
 * Recibe el archivo arrastrado.
 */
zonaArchivo.addEventListener(
    "drop",
    (evento) => {
        const archivos =
            evento.dataTransfer.files;

        if (!archivos || archivos.length === 0) {
            return;
        }

        seleccionarArchivo(Array.from(archivos));
    }
);

/**
 * Valida y registra el archivo seleccionado.
 */
function seleccionarArchivos(archivos) {
    limpiarEstado();

    if (
        !archivos ||
        archivos.length === 0
    ) {
        archivosSeleccionados = [];

        nombreArchivo.textContent =
            "Ningún archivo seleccionado";

        botonConvertir.disabled = true;

        zonaArchivo.classList.remove(
            "archivo-valido"
        );

        return;
    }

    const archivosInvalidos =
        archivos.filter(
            (archivo) =>
                obtenerExtension(
                    archivo.name
                ) !== "txt"
        );

    if (
        archivosInvalidos.length > 0
    ) {
        archivosSeleccionados = [];

        archivoTXT.value = "";

        nombreArchivo.textContent =
            "Archivo no válido";

        botonConvertir.disabled = true;

        zonaArchivo.classList.remove(
            "archivo-valido"
        );

        mostrarEstado(
            "error",
            "Todos los archivos seleccionados deben tener extensión .txt"
        );

        return;
    }

    archivosSeleccionados =
        archivos;

    if (
        archivosSeleccionados.length === 1
    ) {
        const archivo =
            archivosSeleccionados[0];

        nombreArchivo.textContent =
            `${archivo.name} — ${formatearTamanio(
                archivo.size
            )}`;
    } else {
        const tamanioTotal =
            archivosSeleccionados.reduce(
                (total, archivo) =>
                    total + archivo.size,
                0
            );

        nombreArchivo.textContent =
            `${archivosSeleccionados.length} informes seleccionados — ${formatearTamanio(
                tamanioTotal
            )}`;
    }

    botonConvertir.disabled = false;

    zonaArchivo.classList.add(
        "archivo-valido"
    );
}

/**
 * Envía el archivo al servidor.
 */
formConversor.addEventListener(
    "submit",
    async (evento) => {
        evento.preventDefault();

        if (archivosSeleccionados.length === 0) {
            mostrarEstado(
                "error",
                "Debe seleccionar un informe TXT."
            );

            return;
        }

        const formData = new FormData();

        /*
         * Este nombre debe coincidir con:
         *
         * upload.single("archivoTXT")
         *
         * definido en server.js.
         */
        const esLote =
    archivosSeleccionados.length > 1;

        if (esLote) {
            archivosSeleccionados.forEach(
            (archivo) => {
                formData.append(
                    "archivosTXT",
                    archivo
            );
        }
        );
    } else {
        formData.append(
            "archivoTXT",
            archivosSeleccionados[0]
        );
        }

        iniciarConversion();

        try {
            const rutaConversion = 
            archivosSeleccionados.length > 1
            ? "/liquidacion/convertir-lote"
            : "/liquidacion/convertir";

            console.log(
                "Cantidad de archivos:",
                archivosSeleccionados.length
            );

            console.log(
                "Ruta seleccionada:",
                rutaConversion
            );

            const respuesta = await fetch(
                rutaConversion,
                {
                    method: "POST",
                    body: formData,
                }
            );

            if (!respuesta.ok) {
                const mensajeError =
                    await obtenerMensajeError(
                        respuesta
                    );

                throw new Error(mensajeError);
            }

            const archivoExcel =
                await respuesta.blob();

            if (archivoExcel.size === 0) {
                throw new Error(
                    "El servidor devolvió un archivo vacío."
                );
            }

            const nombreOriginal =
                archivosSeleccionados.length === 1
                ? archivosSeleccionados[0].name
                : "Liquidaciones_lote.txt";

            const nombreDescarga =
                obtenerNombreDescarga(
                respuesta,
                nombreOriginal
            );
                

            descargarArchivo(
                archivoExcel,
                nombreDescarga
            );

            mostrarEstado(
                "exito",
                "Conversión realizada correctamente. El archivo Excel fue descargado."
            );

            reiniciarFormulario();
        } catch (error) {
            console.error(
                "Error durante la conversión:",
                error
            );

            mostrarEstado(
                "error",
                error.message ||
                    "No se pudo realizar la conversión."
            );
        } finally {
            finalizarConversion();
        }
    }
);

/**
 * Activa el estado visual de procesamiento.
 */
function iniciarConversion() {
    botonConvertir.disabled = true;

    botonConvertir.textContent =
        archivosSeleccionados.length > 1
        ? "Procesando informes..."
        : "Procesando informe";

    spinner.classList.remove("oculto");

    estadoProceso.classList.remove(
        "oculto",
        "estado-exito",
        "estado-error"
    );

    estadoProceso.classList.add(
        "estado-procesando"
    );

    mensajeEstado.textContent =
        "Leyendo y consolidando el informe...";
}

/**
 * Finaliza el estado de procesamiento.
 */
function finalizarConversion() {
    spinner.classList.add("oculto");

    botonConvertir.textContent =
        "Convertir a Excel";

    botonConvertir.disabled =
        archivosSeleccionados.length === 0;
}

/**
 * Muestra mensajes de éxito o error.
 */
function mostrarEstado(tipo, mensaje) {
    estadoProceso.classList.remove(
        "oculto",
        "estado-procesando",
        "estado-exito",
        "estado-error"
    );

    if (tipo === "exito") {
        estadoProceso.classList.add(
            "estado-exito"
        );
    } else if (tipo === "error") {
        estadoProceso.classList.add(
            "estado-error"
        );
    } else {
        estadoProceso.classList.add(
            "estado-procesando"
        );
    }

    mensajeEstado.textContent =
    archivosSeleccionados.length > 1
        ? `Procesando ${archivosSeleccionados.length} informes...`
        : "Leyendo y consolidando el informe...";
}

/**
 * Limpia los mensajes anteriores.
 */
function limpiarEstado() {
    estadoProceso.classList.add("oculto");

    estadoProceso.classList.remove(
        "estado-procesando",
        "estado-exito",
        "estado-error"
    );

    mensajeEstado.textContent = "";

    spinner.classList.add("oculto");
}

/**
 * Intenta leer el mensaje de error enviado por server.js.
 */
async function obtenerMensajeError(respuesta) {
    try {
        const tipoContenido =
            respuesta.headers.get(
                "content-type"
            ) || "";

        if (
            tipoContenido.includes(
                "application/json"
            )
        ) {
            const resultado =
                await respuesta.json();

            return (
                resultado.error ||
                "No se pudo convertir el archivo."
            );
        }

        const texto = await respuesta.text();

        return (
            texto ||
            "No se pudo convertir el archivo."
        );
    } catch (error) {
        return "No se pudo interpretar la respuesta del servidor.";
    }
}

/**
 * Descarga el archivo Excel recibido.
 */
function descargarArchivo(blob, nombre) {
    const urlTemporal =
        URL.createObjectURL(blob);

    const enlace =
        document.createElement("a");

    enlace.href = urlTemporal;
    enlace.download = nombre;

    document.body.appendChild(enlace);

    enlace.click();
    enlace.remove();

    setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
    }, 1000);
}

/**
 * Obtiene el nombre enviado por el servidor.
 */
function obtenerNombreDescarga(
    respuesta,
    nombreOriginal
) {
    const disposicion =
        respuesta.headers.get(
            "content-disposition"
        );

    if (disposicion) {
        const coincidencia = disposicion.match(
            /filename="?([^"]+)"?/i
        );

        if (coincidencia) {
            return coincidencia[1];
        }
    }

    const nombreSinExtension =
        nombreOriginal.replace(
            /\.[^/.]+$/,
            ""
        );

    return `${nombreSinExtension}_convertido.xlsx`;
}

/**
 * Obtiene la extensión de un archivo.
 */
function obtenerExtension(nombre) {
    const partes = String(nombre)
        .toLowerCase()
        .split(".");

    if (partes.length < 2) {
        return "";
    }

    return partes.pop();
}

/**
 * Muestra el tamaño del archivo.
 */
function formatearTamanio(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return "0 KB";
    }

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) {
        return `${kilobytes.toFixed(1)} KB`;
    }

    const megabytes = kilobytes / 1024;

    return `${megabytes.toFixed(2)} MB`;
}

/**
 * Restablece el selector después de una conversión.
 */
function reiniciarFormulario() {
    archivosSeleccionados = [];
    archivoTXT.value = "";

    nombreArchivo.textContent =
        "Ningún archivo seleccionado";

    zonaArchivo.classList.remove(
        "archivo-valido"
    );

    botonConvertir.disabled = true;
}