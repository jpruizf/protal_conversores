const fs = require("fs");

/**
 * Convierte AAAAMMDD a DD/MM/AAAA.
 */
function formatearFecha(fecha) {
    if (!fecha || fecha.length !== 8) {
        return fecha || "";
    }

    return `${fecha.substring(6, 8)}/${fecha.substring(4, 6)}/${fecha.substring(0, 4)}`;
}

/**
 * Convierte números con dos decimales implícitos.
 *
 * 000003070000 -> 30700.00
 */
function convertirImporte(valor) {
    if (valor === undefined || valor === null) {
        return 0;
    }

    const limpio = String(valor).trim();

    if (!/^\d+$/.test(limpio)) {
        return 0;
    }

    return Number(limpio) / 100;
}

/**
 * Lee el TXT y elimina solamente líneas vacías.
 *
 * IMPORTANTE:
 * No usar trim() porque estos archivos son de posiciones fijas.
 */
function leerLineasBRD(rutaArchivo) {
    const contenido = fs.readFileSync(rutaArchivo, "utf8");

    return contenido
        .split(/\r?\n/)
        .map(linea => linea.trimEnd())
        .filter(linea => linea.length > 0);
}

/**
 * Detecta automáticamente qué variante BRD estamos procesando.
 *
 * BRD_98:
 *   0BRD...
 *   1...
 *   1...
 *   2...
 *
 * BRD_HEADER_DATOS:
 *   HEADER...
 *   DATOS...
 *   DATOS...
 *   TRAILER...
 */
function detectarFormatoBRD(lineas) {
    if (!Array.isArray(lineas) || lineas.length === 0) {
        throw new Error("El archivo BRD está vacío.");
    }

    const primeraLinea = lineas[0];

    if (primeraLinea.startsWith("0BRD")) {
        return "BRD_98";
    }

    if (primeraLinea.startsWith("HEADER")) {
        return "BRD_HEADER_DATOS";
    }

    throw new Error(
        `Formato BRD no reconocido. Inicio encontrado: "${primeraLinea.substring(0, 20)}"`
    );
}

/* ============================================================
 * FORMATO 1
 * BRD 98 posiciones
 * ============================================================
 */

function parsearCabeceraBRD98(linea) {
    if (!linea.startsWith("0BRD")) {
        throw new Error("Cabecera BRD 98 inválida.");
    }

    return {
        formato: linea.substring(1, 4).trim(),
        fechaReporte: formatearFecha(
            linea.substring(4, 12)
        )
    };
}

/**
 * Registro detalle BRD 98.
 *
 * Confirmado con los archivos recibidos:
 *
 * 0       tipo registro
 * 1-8     código principal
 * 9-23    identificador
 * 28-39   monto
 * 40-47   fecha
 * 48-54   código operación
 */
function parsearLineaDetalleBRD98(linea) {
    if (!linea.startsWith("1")) {
        throw new Error(
            `Registro detalle BRD 98 inválido: ${linea.substring(0, 20)}`
        );
    }

    return {
        "Código Principal": linea.substring(1, 9).trim(),
        "Identificador": linea.substring(9, 24).trim(),

        "Fecha Vencimiento": "",

        "Código Operación": linea.substring(48, 55).trim(),

        "Fecha Pago": formatearFecha(
            linea.substring(40, 48)
        ),

        "Monto": convertirImporte(
            linea.substring(28, 40)
        ),

        "Código OP": "",
        "Fecha Proceso": "",
        "Tipo Pago": "",
        "Código Final": "",

        "Control": linea.substring(48, 55).trim()
    };
}

function parsearLineaCierreBRD98(linea) {
    if (!linea.startsWith("2")) {
        throw new Error("Cierre BRD 98 inválido.");
    }

    const totalRegistros = Number(
        linea.substring(1, 7)
    );

    const totalConsolidado = convertirImporte(
        linea.substring(7, 23)
    );

    return {
        codigoCierre: linea.substring(0, 1),
        totalRegistros,
        totalPagos: Math.max(totalRegistros - 2, 0),
        totalConsolidado
    };
}

function procesarBRD98(lineas) {
    const lineaCabecera = lineas[0];

    const cabecera =
        parsearCabeceraBRD98(lineaCabecera);

    const lineasDetalle = lineas.filter(
        linea => linea.startsWith("1")
    );

    if (lineasDetalle.length === 0) {
        throw new Error(
            "El BRD 98 no contiene registros de detalle."
        );
    }

    const detalles = lineasDetalle.map(
        parsearLineaDetalleBRD98
    );

    const lineaCierre = [...lineas]
        .reverse()
        .find(linea => linea.startsWith("2"));

    if (!lineaCierre) {
        throw new Error(
            "El BRD 98 no contiene registro de cierre."
        );
    }

    const cierre =
        parsearLineaCierreBRD98(lineaCierre);

    validarTotalesBRD(detalles, cierre);

    detalles.unshift(
        crearFilaResumen({
            formato: cabecera.formato,
            fechaReporte: cabecera.fechaReporte,
            codigoCierre: cierre.codigoCierre,
            totalRegistros: cierre.totalRegistros,
            totalPagos: cierre.totalPagos,
            totalConsolidado: cierre.totalConsolidado
        })
    );

    return detalles;
}

/* ============================================================
 * FORMATO 2
 * HEADER / DATOS / TRAILER
 * ============================================================
 */

/**
 * Por ahora solamente validamos la estructura.
 *
 * NO asignamos posiciones internas del HEADER hasta confirmar
 * oficialmente qué representa cada campo.
 */
function parsearCabeceraHeaderDatos(linea) {
    if (!linea.startsWith("HEADER")) {
        throw new Error(
            "Cabecera HEADER/DATOS inválida."
        );
    }

    return {
        formato: "BRD_HEADER_DATOS",

        codigo: linea.substring(6, 9).trim(),

        fechaProceso: formatearFecha(
            linea.substring(9, 17)
        ),

        fechaCierre: formatearFecha(
            linea.substring(17, 25)
        ),

        numeroControl: linea.substring(25, 30).trim()
    };
}


/**
 * Cierre HEADER / DATOS / TRAILER.
 *
 * Del archivo recibido sí podemos determinar de forma segura
 * la existencia del TRAILER y validar la cantidad encontrada.
 *
 * Dejamos el registro completo disponible hasta confirmar
 * formalmente cada posición.
 */
/**
 * Parser del registro DATOS.
 */
/**
 * Convierte DDMMAAAA a DD/MM/AAAA.
 *
 * Ejemplo:
 * 31082026 -> 31/08/2026
 */
function formatearFechaDDMMAAAA(fecha) {
    if (!fecha || fecha.length !== 8) {
        return fecha || "";
    }

    return `${fecha.substring(0, 2)}/${fecha.substring(2, 4)}/${fecha.substring(4, 8)}`;
}

/**
 * Convierte AAMMDD a DD/MM/AAAA.
 *
 * Ejemplo:
 * 260808 -> 08/08/2026
 */
function formatearFechaAAMMDD(fecha) {
    if (!fecha || fecha.length !== 6) {
        return fecha || "";
    }

    return `${fecha.substring(4, 6)}/${fecha.substring(2, 4)}/20${fecha.substring(0, 2)}`;
}

/**
 * Parser del registro DATOS.
 */
function parsearLineaDetalleHeaderDatos(linea) {
    if (!linea.startsWith("DATOS")) {
        throw new Error(
            `Registro DATOS inválido: ${linea.substring(0, 20)}`
        );
    }

    return {
        "Código Principal":
            linea.substring(5, 12).trim(),

        "Identificador":
            linea.substring(12, 18).trim(),

        "Fecha Vencimiento":
            formatearFechaDDMMAAAA(
                linea.substring(195, 203)
            ),

        "Código Operación":
            linea.substring(58, 71).trim(),

        "Fecha Pago":
            formatearFechaAAMMDD(
                linea.substring(224, 230)
            ),

        "Monto":
            convertirImporte(
                linea.substring(77, 89)
            ),

        "Código OP":
            linea.substring(164, 170).trim(),

        "Fecha Proceso":
            formatearFechaAAMMDD(
                linea.substring(224, 230)
            ),

        "Tipo Pago":
            linea.substring(210, 212).trim(),

        "Código Final":
            linea.substring(203, 212).trim(),

        "Control":
            linea.substring(271, 279).trim()
    };
}

/**
 * Lee el registro TRAILER del formato HEADER / DATOS.
 */
function parsearLineaCierreHeaderDatos(linea) {
    if (!linea.startsWith("TRAILER")) {
        throw new Error(
            "Cierre HEADER/DATOS inválido."
        );
    }

    const totalRegistros = Number(
        linea.substring(7, 15)
    );

    const totalConsolidado = convertirImporte(
        linea.substring(15, 29)
    );

    const totalPagosFinal = Number(
        linea.substring(29, 36)
    );

    return {
        codigoCierre: "TRAILER",
        totalRegistros,
        totalPagos: totalPagosFinal,
        totalConsolidado
    };
}

function procesarBRDHeaderDatos(lineas) {
    const lineaCabecera = lineas[0];

    const cabecera =
        parsearCabeceraHeaderDatos(lineaCabecera);

    const lineasDetalle = lineas.filter(
        linea => linea.startsWith("DATOS")
    );

    if (lineasDetalle.length === 0) {
        throw new Error(
            "El archivo HEADER/DATOS no contiene registros DATOS."
        );
    }

    const detalles = lineasDetalle.map(
        parsearLineaDetalleHeaderDatos
    );

    const lineaCierre = [...lineas]
        .reverse()
        .find(linea =>
            linea.startsWith("TRAILER")
        );

    if (!lineaCierre) {
        throw new Error(
            "El archivo HEADER/DATOS no contiene TRAILER."
        );
    }

    const cierre =
        parsearLineaCierreHeaderDatos(
            lineaCierre
        );

    console.log(
        `[BRD] Formato HEADER/DATOS detectado. ` +
        `${detalles.length} registros encontrados.`
    );

    console.log(
        `[BRD] Total trailer: ${cierre.totalConsolidado.toFixed(2)}`
    );

    if (
        detalles.length !==
        cierre.totalPagos
    ) {
        console.warn(
            `[BRD] Se encontraron ${detalles.length} pagos, ` +
            `pero el trailer informa ${cierre.totalPagos}.`
        );
    }

    detalles.unshift(
        crearFilaResumen({
            formato: cabecera.formato,

            fechaReporte:
                cabecera.fechaCierre,

            codigoCierre:
                cierre.codigoCierre,

            totalRegistros:
                cierre.totalRegistros,

            totalPagos:
                cierre.totalPagos,

            totalConsolidado:
                cierre.totalConsolidado
        })
    );

    console.log(
    "[DEBUG BRD] Fila resumen:",
    JSON.stringify(detalles[0], null, 2)
    );

    console.log(
        "[DEBUG BRD] Primer detalle:",
        JSON.stringify(detalles[1], null, 2)
    );

    return detalles;
}

/* ============================================================
 * VALIDACIONES COMUNES
 * ============================================================
 */

function validarTotalesBRD(detalles, cierre) {
    if (
        Number.isFinite(cierre.totalPagos) &&
        detalles.length !== cierre.totalPagos
    ) {
        console.warn(
            `[BRD] Cantidad inconsistente: ` +
            `se encontraron ${detalles.length} pagos ` +
            `pero el cierre informa ${cierre.totalPagos}.`
        );
    }

    if (
        !Number.isFinite(cierre.totalConsolidado)
    ) {
        return;
    }

    const sumaDetalles = detalles.reduce(
        (acumulado, registro) => {
            const monto = Number(
                registro["Monto"] || 0
            );

            return acumulado +
                (Number.isFinite(monto) ? monto : 0);
        },
        0
    );

    const diferencia = Math.abs(
        sumaDetalles -
        cierre.totalConsolidado
    );

    if (diferencia > 0.01) {
        console.warn(
            `[BRD] Importe inconsistente: ` +
            `detalle=${sumaDetalles.toFixed(2)}, ` +
            `cierre=${cierre.totalConsolidado.toFixed(2)}.`
        );
    }
}

function crearFilaResumen({
    formato,
    fechaReporte,
    codigoCierre,
    totalRegistros,
    totalPagos,
    totalConsolidado
}) {
    return {
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

        "Formato": formato,
        "Fecha de Cierre": fechaReporte || "",
        "Código de Cierre": codigoCierre || "",
        "Total de Registros": totalRegistros ?? "",
        "Total de Pagos": totalPagos ?? "",
        "Total Consolidado": totalConsolidado ?? ""
    };
}

/* ============================================================
 * ENTRADA PRINCIPAL
 * ============================================================
 */

/**
 * Esta sigue siendo la función pública que utilizará
 * el resto de la aplicación.
 *
 * De esta manera no deberíamos tener que modificar todos
 * los archivos que actualmente llaman a procesarTXTBRD().
 */
function procesarTXTBRD(rutaArchivo) {
    const lineas =
        leerLineasBRD(rutaArchivo);

    const formato =
        detectarFormatoBRD(lineas);

    console.log(
        `[BRD] Formato detectado: ${formato}`
    );

    switch (formato) {
        case "BRD_98":
            return procesarBRD98(lineas);

        case "BRD_HEADER_DATOS":
            return procesarBRDHeaderDatos(lineas);

        default:
            throw new Error(
                `Formato BRD no implementado: ${formato}`
            );
    }
}

module.exports = {
    procesarTXTBRD,

    /*
     * Estas exportaciones adicionales son útiles para tests.
     */
    detectarFormatoBRD,
    procesarBRD98,
    procesarBRDHeaderDatos
};