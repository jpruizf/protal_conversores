// public/main.js

// 🌟 Asegúrate de que estos IDs existan exactamente igual en tu index.html
const dropArea = document.getElementById('dropArea');
const fileInput = document.getElementById('fileInput');
const fileNameDiv = document.getElementById('file-name');
const dropText = document.getElementById('dropText');

// Verificación de seguridad preventiva para evitar que vuelva a dar null
if (dropArea && fileInput && fileNameDiv && dropText) {

    // Abrir explorador de archivos al hacer clic en el recuadro
    dropArea.addEventListener('click', () => fileInput.click());

    // Detectar selección de archivo
    fileInput.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
            fileNameDiv.textContent = `📄 Archivo seleccionado: ${this.files[0].name}`;
            dropText.textContent = "¡Archivo listo para procesar!";
        } else {
            fileNameDiv.textContent = "";
            dropText.textContent = "Arrastra tu archivo aquí o haz clic para buscar";
        }
    });

    // Eventos visuales de arrastre (Drag & Drop)
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropArea.classList.remove('dragover');
        }, false);
    });

    // Capturar archivo soltado
    dropArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            fileInput.files = files;
            fileNameDiv.textContent = `📄 Archivo seleccionado: ${files[0].name}`;
            dropText.textContent = "¡Archivo listo para procesar!";
        }
    });

} else {
    console.error("Falta uno o más elementos en el HTML. Verifica los IDs 'dropArea', 'fileInput', 'file-name' y 'dropText'.");
}