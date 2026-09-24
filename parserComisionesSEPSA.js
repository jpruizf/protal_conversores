/**
 * Convierte un importe del PDF a número.
 *
 * Ejemplos:
 * "2,231,700.61"  -> 2231700.61
 * "46,865.71-"    -> -46865.71
 * "0.00"          -> 0
 */
function convertirImporte(valor) {
    if (valor === undefined || valor === null) {
        return 0;
    }

    let texto = String(valor).trim();

    if (!texto) {
        return 0;
    }

    const esNegativo =
        texto.endsWith("-") ||
        texto.startsWith("-");

    texto = texto
        .replace(/\s/g, "")
        .replace(/-/g, "")
        .replace(/,/g, "");

    const numero = Number(texto);

    if (!Number.isFinite(numero)) {
        throw new Error(
            `Importe inválido encontrado: ${valor}`
        );
    }

    return esNegativo
        ? -numero
        : numero;
}


/**
 * Convierte una fecha DD/MM/AA o DD/MM/AAAA
 * al formato DD/MM/AAAA.
 */
function normalizarFecha(fecha) {
    if (!fecha) {
        return "";
    }

    const partes =
        fecha
            .trim()
            .split("/");

    if (partes.length !== 3) {
        return fecha.trim();
    }

    let [dia, mes, anio] = partes;

    if (anio.length === 2) {
        anio = `20${anio}`;
    }

    return (
        `${dia.padStart(2, "0")}/` +
        `${mes.padStart(2, "0")}/` +
        `${anio}`
    );
}


/**
 * Busca el primer resultado de una expresión regular.
 */
function obtenerCampo(
    texto,
    expresion,
    nombreCampo,
    obligatorio = true
) {
    const resultado =
        texto.match(expresion);

    if (!resultado) {
        if (obligatorio) {
            throw new Error(
                `No se pudo encontrar el campo "${nombreCampo}" en el PDF.`
            );
        }

        return "";
    }

    return resultado[1].trim();
}


/**
 * Confirma que el texto corresponde
 * a un reporte previo de comisiones SEPSA.
 */
function esFormatoSEPSA(texto) {
    if (!texto) {
        return false;
    }

    return (
        texto.includes(
            "SERVICIO ELECTRONICO DE PAGO"
        ) &&
        texto.includes(
            "REPORTE PREVIO DE COMISIONES"
        ) &&
        texto.includes(
            "Total Recaudado"
        ) &&
        texto.includes(
            "Total Neto"
        )
    );
}


/**
 * Procesa un reporte previo de comisiones SEPSA.
 */
function procesarSEPSA(
    texto,
    nombreArchivoOriginal = ""
) {
    if (
        !texto ||
        typeof texto !== "string"
    ) {
        throw new Error(
            "No se recibió texto para procesar."
        );
    }

    /*
     * Normaliza los espacios generados
     * durante la extracción del PDF.
     */
    const textoNormalizado =
        texto
            .replace(/\s+/g, " ")
            .trim();

    if (!esFormatoSEPSA(texto)) {
        throw new Error(
            "El PDF no corresponde al formato SEPSA - Reporte Previo de Comisiones."
        );
    }


    const codigoArchivo =
        obtenerCampo(
            texto,
            /Resumen correspondiente al archivo:\s*:\s*([A-Z0-9]+)/i,
            "Archivo",
            false
        );


    const fechaEmision =
        normalizarFecha(
            obtenerCampo(
                textoNormalizado,
                /Fecha de Emision\s*:\s*(\d{2}\/\d{2}\/\d{2,4})/i,
                "Fecha de emisión"
            )
        );


    const totalRegistrosTexto =
        obtenerCampo(
            texto,
            /Total Registros[\s.]*:\s*([\d,.-]+)/i,
            "Total de registros"
        );

    const totalRegistros =
        Math.trunc(
            convertirImporte(
                totalRegistrosTexto
            )
        );


    const totalRecaudado =
        convertirImporte(
            obtenerCampo(
                texto,
                /Total Recaudado[\s.]*:\s*([\d,.-]+)/i,
                "Total recaudado"
            )
        );


    const comision =
        convertirImporte(
            obtenerCampo(
                texto,
                /Comision[\s.]*:\s*([\d,.-]+)/i,
                "Comisión"
            )
        );


    const ivaComision =
        convertirImporte(
            obtenerCampo(
                texto,
                /IVA S\/Comisi[oó]n[\s.]*:\s*([\d,.-]+)/i,
                "IVA sobre comisión"
            )
        );


    const retencionRG3130 =
        convertirImporte(
            obtenerCampo(
                texto,
                /Ret R\.G\. 3130[\s.]*:\s*([\d,.-]+)/i,
                "Retención RG 3130",
                false
            ) || "0"
        );


    const efectivo =
        convertirImporte(
            obtenerCampo(
                texto,
                /Efectivo\s+([\d,.-]+)/i,
                "Efectivo",
                false
            ) || "0"
        );


    const debito =
        convertirImporte(
            obtenerCampo(
                texto,
                /Debito\s+([\d,.-]+)/i,
                "Débito",
                false
            ) || "0"
        );


    const pagosQR =
        convertirImporte(
            obtenerCampo(
                texto,
                /Pagos QR\s+([\d,.-]+)/i,
                "Pagos QR",
                false
            ) || "0"
        );


    /**
     * Comisión, IVA y retención pueden venir
     * expresados como valores negativos en el PDF.
     *
     * Para el nuevo proyecto nos interesa
     * conservarlos como importes positivos.
     */
    const comisionPositiva =
        Math.abs(comision);

    const ivaComisionPositivo =
        Math.abs(ivaComision);

    const retencionRG3130Positiva =
        Math.abs(retencionRG3130);


    /**
     * Control interno del propio PDF.
     *
     * La suma de medios de pago debería coincidir
     * con el Total Recaudado.
     */
    const totalMediosPago =
        Number(
            (
                efectivo +
                debito +
                pagosQR
            ).toFixed(2)
        );

    const diferenciaMediosPago =
        Number(
            (
                totalMediosPago -
                totalRecaudado
            ).toFixed(2)
        );


    return {
        nombreArchivoOriginal,

        ente: "SEPSA",

        archivoProceso:
            codigoArchivo,

        fechaEmision,

        totalRegistros,

        totalRecaudado,

        comision:
            comisionPositiva,

        ivaComision:
            ivaComisionPositivo,

        retencionRG3130:
            retencionRG3130Positiva,

        efectivo,

        debito,

        pagosQR,

        totalMediosPago,

        diferenciaMediosPago,

        controlMediosPago:
            Math.abs(
                diferenciaMediosPago
            ) <= 0.01
                ? "CORRECTO"
                : "REVISAR"
    };
}


module.exports = {
    esFormatoSEPSA,
    procesarSEPSA
};