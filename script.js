/**
 * script.js
 *
 * Controla el formulario de conversión PDF → Excel
 * desde el navegador.
 *
 * Responsabilidades:
 *
 * 1. Interceptar el envío del formulario.
 * 2. Evitar que la página se recargue.
 * 3. Crear un FormData con el archivo seleccionado.
 * 4. Enviar el PDF al backend mediante POST /convertir.
 * 5. Recibir el archivo Excel generado.
 * 6. Iniciar automáticamente su descarga.
 * 7. Mostrar mensajes de estado, éxito o error al usuario.
 *
 * Este archivo pertenece al frontend.
 * No procesa el contenido del PDF ni genera el Excel.
 * Esas tareas son responsabilidad del servidor.
 */


const formulario = document.getElementById("formulario");
const mensaje = document.getElementById("mensaje");

formulario.addEventListener("submit", async (e) => {
    e.preventDefault();

    mensaje.style.color = "#0d6efd";
    mensaje.textContent = "Procesando archivo...";

    const datos = new FormData(formulario);

    try {

        console.log("=== FORM DATA ===");

        for (const [clave, valor] of datos.entries()) {
            console.log(
        clave,
            valor instanceof File
            ? {
                nombre: valor.name,
                tipo: valor.type,
                tamaño: valor.size
            }
            : valor
    );
}

        const respuesta = await fetch("./convertir-multiple", {
            method: "POST",
            body: datos
        });

        if (!respuesta.ok) {
        const errorServidor = await respuesta.text();

        console.error(
            "ERROR BACKEND:",
            respuesta.status,
            errorServidor
        );

    throw new Error(
        errorServidor ||
        `Error HTTP ${respuesta.status}`
    );
}

        const blob = await respuesta.blob();

        const url = window.URL.createObjectURL(blob);

        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = "Resumen_Comisiones.xlsx";

        document.body.appendChild(enlace);

        enlace.click();

        enlace.remove();

        window.URL.revokeObjectURL(url);

        mensaje.style.color = "green";
        mensaje.textContent = "Conversión realizada correctamente.";

        formulario.reset();

    } catch (error) {

        mensaje.style.color = "red";
        mensaje.textContent = error.message || "Ocurrió un error durante la conversión.";

    }

});