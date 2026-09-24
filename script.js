const formulario = document.getElementById("formulario");
const archivoTXT = document.getElementById("archivoTXT");
const mensaje = document.getElementById("mensaje");
const btnDescargar = document.getElementById("btnDescargar");

let urlDescarga = null;

formulario.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!archivoTXT.files.length) {
        mensaje.textContent = "Seleccioná un archivo TXT.";
        return;
    }

    btnDescargar.style.display = "none";

    if (urlDescarga) {
        window.URL.revokeObjectURL(urlDescarga);
        urlDescarga = null;
    }

    const formData = new FormData();
    formData.append("archivoTXT", archivoTXT.files[0]);

    mensaje.textContent = "Convirtiendo archivo...";

    try {
        const respuesta = await fetch("./convertir", {
            method: "POST",
            body: formData
        });

        if (!respuesta.ok) {
            throw new Error("Error al convertir el archivo.");
        }

        const blob = await respuesta.blob();

        urlDescarga = window.URL.createObjectURL(blob);

        btnDescargar.style.display = "inline-block";

        mensaje.textContent =
            "Archivo convertido correctamente. Ya podés descargarlo.";

    } catch (error) {
        console.error(error);
        mensaje.textContent = "Error al convertir el archivo.";
    }
});

btnDescargar.addEventListener("click", function () {
    if (!urlDescarga) {
        return;
    }

    const link = document.createElement("a");

    link.href = urlDescarga;
    link.download = "reporte_convertido.xlsx";

    document.body.appendChild(link);
    link.click();
    link.remove();
});