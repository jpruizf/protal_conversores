// servicios/parserServicios.js

const {
    TIPOS_SERVICIO,
    detectarServicio
} = require("./detectorServicios");


const {
    procesarEcoGasResidencial
} = require(
    "./proveedores/ecogas/residencial"
);


const {
    procesarNaturgyResidencial
} = require(
    "./proveedores/naturgy/residencial"
);


const {
    procesarNaturgyResidencialOSSE
} = require(
    "./proveedores/naturgy/residencialOSSE"
);


const {
    procesarNaturgyComercialT2
} = require(
    "./proveedores/naturgy/comercialT2"
);


/**
 * Procesa automáticamente una factura
 * de servicios utilizando el parser adecuado.
 *
 * @param {string} texto
 * Texto previamente extraído del PDF.
 *
 * @param {string} nombreArchivoOriginal
 * Nombre original del PDF.
 *
 * @returns {Object}
 */
function agregarTextoOriginal(datos, texto) {
    if (!datos || typeof datos !== "object") {
        throw new Error(
            "El parser del servicio no devolvió datos válidos."
        );
    }

    return {
        ...datos,
        textoOriginal: texto || ""
    };
}

function procesarServicio(
    texto,
    nombreArchivoOriginal = ""
) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "No se recibió texto válido para procesar."
        );
    }

    const tipoServicio =
        detectarServicio(texto);

    switch (tipoServicio) {

        case TIPOS_SERVICIO
            .ECOGAS_RESIDENCIAL:

            return agregarTextoOriginal( 
            procesarEcoGasResidencial(
                texto,
                nombreArchivoOriginal), texto
            );


        case TIPOS_SERVICIO
            .NATURGY_RESIDENCIAL:

            return agregarTextoOriginal(procesarNaturgyResidencial(
                texto,
                nombreArchivoOriginal), texto
            );


        case TIPOS_SERVICIO
            .NATURGY_RESIDENCIAL_OSSE:

            return agregarTextoOriginal(
            procesarNaturgyResidencialOSSE(
                texto,
                nombreArchivoOriginal), texto
            );


        case TIPOS_SERVICIO
            .NATURGY_COMERCIAL_T2:

            return agregarTextoOriginal 
            (procesarNaturgyComercialT2(
                texto,
                nombreArchivoOriginal), texto
            );


        default:

            throw new Error(
                `No existe un parser para ` +
                `el formato "${tipoServicio}".`
            );
    }
}


module.exports = {
    procesarServicio
};
