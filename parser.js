//----------------------------
// importo la libreria fs sistema de ficheros
//---------------------------
const fs = require("fs");

//------------------------------
// Formateo la fecha
//------------------------------

function formatearFecha(fecha) {
    if (!fecha || fecha.length !== 8) return fecha;
    return `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`;
}
//--------------------------------------
// Limpio el codigo principal
//--------------------------------------
function limpiarCodigoPrincipal(codigo) {
    // Ejemplo: 50000099045058 → 99045058
    if (!codigo) return "";
    return codigo.substring(6);
}
//--------------------------------------------------
// Mapeo el Numero de cliente y lo convierto 
// en formato numerico
//--------------------------------------------------
function extraerNumeroCliente(linea) {
    const campo = linea.substring(1, 14).trim();

    if (!campo) {
        return "";
    }

    return campo.replace(/^0+/, "") || "0";
}
//--------------------------------------------------
// Mapeo el resto de datos del cuerpo del reporte y los
// convierto en campo del encabezado y contenido del campo
//--------------------------------------------------
function parsearLineaDetalle(linea) {
    const codigoCompleto = linea.substring(0, 14).trim();

    return {
        "Nro Cliente": extraerNumeroCliente(linea),
        "Código Principal": limpiarCodigoPrincipal(codigoCompleto),
        "Identificador": linea.substring(20, 34).trim(),
        "Fecha Vencimiento": formatearFecha(linea.substring(40, 48)),
        "Código Operación": linea.substring(48, 49),
        "Fecha Pago": formatearFecha(linea.substring(49, 57)),
        "Monto": Number(linea.substring(57, 68)) / 100,
        "Código OP": linea.substring(67, 69),
        "Fecha Proceso": formatearFecha(linea.substring(69, 77)),
        "Tipo Pago": linea.substring(77, 79),
        "Código Final": linea.substring(79, 83),
        "Control": linea.substring(86, 100).trim()
    };
}
//-----------------------------------------------
// Mapeo el trailer y genero un trailer en el excel
//-----------------------------------------------
function parsearLineaCierre(linea) {
    return {
        "Código de Cierre": linea.substring(0, 8).trim(),
        "Fecha de Cierre": formatearFecha(linea.substring(8, 16)),
        "Total de Pagos": Number(linea.substring(16, 23)),
        "Total Consolidado": Number(linea.substring(23, 41)) / 100
    };
}
//----------------------------------------------
// Proceso el trailer del archivo y genero 
// el cierre del excel
//----------------------------------------------
function procesarTXT(rutaArchivo) {
    const contenido = fs.readFileSync(rutaArchivo, "utf8");

    const lineas = contenido
        .split(/\r?\n/)
        .map(linea => linea.trimEnd())
        .filter(linea => linea.length > 0);

    const detalles = lineas
        .filter(linea => linea.startsWith("5"))
        .map(parsearLineaDetalle);

    const lineaCierre = lineas.find(linea => linea.startsWith("9"));
    const cierre = lineaCierre ? parsearLineaCierre(lineaCierre) : null;

    if (cierre) {
        detalles.unshift({
            "Código Principal": "",
            "Identificador": "",
            "Fecha Vencimiento": "",
            "Código Operación": "",
            "Fecha Pago": "",
            "Monto": "",
            "Código OP": "",
            "Fecha Proceso": "",
            "Tipo Pago": "",
            "Código Final": "",
            "Control": "",
            "Código de Cierre": cierre["Código de Cierre"],
            "Fecha de Cierre": cierre["Fecha de Cierre"],
            "Total de Pagos": cierre["Total de Pagos"],
            "Total Consolidado": cierre["Total Consolidado"]
        });
    }

    return detalles;
}

module.exports = {
    procesarTXT
};