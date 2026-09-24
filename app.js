// public/app.js

let fileContent = "";
const fileInput = document.getElementById('fileInput');
const bancoSelect = document.getElementById('bancoSelect');
const status = document.getElementById('status');
const btnConvertir = document.getElementById('btnConvertir');
const dropzone = document.getElementById('dropzone');

// Función para resetear el formulario a su estado inicial
function resetearFormulario()
{
    fileInput.value = '';

    document.getElementById('dropzone').childNodes[0].textContent = 'Arrastra aqui tus archivos .PDF / .HTML  O Haz click para buscarlos.';

    status.innerText = '';

    if(typeof fileContent !== 'undefined')
    {
        fileContent= null;
    }
}

function manejarCargaArchivo(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        fileContent = evt.target.result;
        status.innerText = `✔ Archivo "${file.name}" cargado correctamente.`;
        status.style.color = "#2f855a";
        btnConvertir.style.display = "block";
    };
    reader.readAsText(file);
}

// Vincular el evento inicial
fileInput.addEventListener('change', manejarCargaArchivo);

// Evento de clic para enviar los PDFs al backend
btnConvertir.addEventListener('click', async () => {
    status.innerText = "Procesando archivos PDF...";
    status.style.color = "#dd6b20";

    try {
        const archivos = fileInput.files;

        if (!archivos || archivos.length === 0) {
            throw new Error("No se seleccionaron archivos PDF.");
        }

        const formData = new FormData();

        for (const archivo of archivos) {
            formData.append('archivos', archivo);
        }

        const response = await fetch('./convertir/pdfs', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const mensajeError = await response.text();
            throw new Error(mensajeError || "Error en el servidor");
        }

        // Descargar el Excel generado por el backend
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'liquidaciones.xlsx';

        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);

        status.innerText =
            "¡Excel generado con éxito! El formulario se reinició.";

        status.style.color = "#2f855a";

        resetearFormulario();

    } catch (err) {
        status.innerText =
            `Error: ${err.message}`;

        status.style.color = "#c53030";

        console.error(err);
    }
});