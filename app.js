import {
    parsearLineaResumen,
    parsearFechaResumen,
    parsearTotalesResumen,
    parsearBancoAdherente,
    parsearTotalNeto
} from "./parserService.js";

import { generarExcelWeb } from "./excelService.js";

const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const convertButton = document.getElementById("convert-button");
const statusContainer = document.getElementById("status-container");
const statusMessage = document.getElementById("status-message");

let archivoSeleccionado = null;

/* Selección mediante clic */
dropZone.addEventListener("click", () => {
    fileInput.click();
});

/* Selección mediante teclado */
dropZone.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" || evento.key === " ") {
        evento.preventDefault();
        fileInput.click();
    }
});

/* Archivo elegido desde el explorador */
fileInput.addEventListener("change", (evento) => {
    const archivo = evento.target.files[0];

    if (archivo) {
        seleccionarArchivo(archivo);
    }
});

/* Arrastrar archivo */
dropZone.addEventListener("dragover", (evento) => {
    evento.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (evento) => {
    evento.preventDefault();
    dropZone.classList.remove("dragover");

    const archivo = evento.dataTransfer.files[0];

    if (archivo) {
        seleccionarArchivo(archivo);
    }
});

/* Validar archivo */
function seleccionarArchivo(archivo) {
    if (!archivo.name.toLowerCase().endsWith(".txt")) {
        archivoSeleccionado = null;
        convertButton.disabled = true;

        mostrarEstado(
            "Por favor, seleccioná únicamente un archivo TXT.",
            "error"
        );

        return;
    }

    archivoSeleccionado = archivo;
    convertButton.disabled = false;

    mostrarEstado(
        `Archivo cargado: ${archivo.name}`,
        "info"
    );
}

/* Convertir al presionar el botón */
convertButton.addEventListener("click", () => {
    if (!archivoSeleccionado) {
        mostrarEstado(
            "Primero seleccioná un archivo TXT.",
            "error"
        );

        return;
    }

    procesarArchivo(archivoSeleccionado);
});

function procesarArchivo(archivo) {
    mostrarEstado("Procesando archivo...", "info");

    convertButton.disabled = true;
    convertButton.textContent = "Procesando...";

    const lector = new FileReader();

    lector.onload = function (evento) {
        try {
            const contenido = evento.target.result;
            const lineas = contenido.split(/\r?\n/);

            const listaRegistros = [];

            const fechaReporte = parsearFechaResumen(contenido);

            let totalesReporte = null;
            let bancoAdherente = null;
            let totalNeto = null;

            for (const lineaOriginal of lineas) {
                const linea = lineaOriginal.trim();

                if (!linea) {
                    continue;
                }

                /* Línea de totales */
                if (/T\s*O\s*T\s*A\s*L\s*E\s*S/i.test(linea)) {
                    totalesReporte = parsearTotalesResumen(linea);
                    continue;
                }

                /* Comisión del banco adherente */
                if (/^BANCO\s+ADHERENTE/i.test(linea)) {
                    bancoAdherente = parsearBancoAdherente(linea);
                    continue;
                }

                /* Total neto final */
                if (/^TOTAL\s+NETO/i.test(linea)) {
                    totalNeto = parsearTotalNeto(linea);
                    continue;
                }

                /* Línea correspondiente a un banco */
                const registro = parsearLineaResumen(linea);

                if (registro) {
                    registro.fecha = fechaReporte;
                    listaRegistros.push(registro);
                }
            }

            console.log("Fecha del reporte:", fechaReporte);
            console.log("Registros encontrados:", listaRegistros);
            console.log("Totales:", totalesReporte);
            console.log("Banco adherente:", bancoAdherente);
            console.log("Total neto:", totalNeto);

            if (listaRegistros.length === 0) {
                mostrarEstado(
                    "No se encontraron líneas de bancos válidas en el resumen.",
                    "error"
                );

                return;
            }

            const resumenReporte = {
                fecha: fechaReporte,
                totales: totalesReporte,
                bancoAdherente,
                totalNeto
            };

            const nombreSalida = archivo.name.replace(
                /\.txt$/i,
                ".xlsx"
            );

            generarExcelWeb(
                listaRegistros,
                resumenReporte,
                nombreSalida
            );

            mostrarEstado(
                `Conversión finalizada. Se generó ${nombreSalida}.`,
                "success"
            );
        } catch (error) {
            console.error("Error durante la conversión:", error);

            mostrarEstado(
                `Ocurrió un error: ${error.message}`,
                "error"
            );
        } finally {
            convertButton.disabled = false;
            convertButton.textContent = "Convertir a Excel";
        }
    };

    lector.onerror = function () {
        mostrarEstado(
            "No se pudo leer el archivo seleccionado.",
            "error"
        );

        convertButton.disabled = false;
        convertButton.textContent = "Convertir a Excel";
    };

    lector.readAsText(archivo);
}

function mostrarEstado(mensaje, tipo) {
    statusContainer.classList.remove("oculto");

    statusMessage.className = `mensaje-estado ${tipo}`;
    statusMessage.textContent = mensaje;
}