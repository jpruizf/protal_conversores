// servicios/detectorServicios.js

const {
    esEcoGasResidencial
} = require(
    "./proveedores/ecogas/residencial"
);

const {
    esNaturgyResidencial
} = require(
    "./proveedores/naturgy/residencial"
);

const {
    esNaturgyResidencialOSSE
} = require(
    "./proveedores/naturgy/residencialOSSE"
);

const {
    esNaturgyComercialT2
} = require(
    "./proveedores/naturgy/comercialT2"
);


/**
 * Identificadores internos de formatos soportados.
 *
 * La idea es centralizar estos nombres acá
 * para evitar strings distintos por todo el proyecto.
 */
const TIPOS_SERVICIO = {
    ECOGAS_RESIDENCIAL:
        "ECOGAS_RESIDENCIAL",

    NATURGY_RESIDENCIAL:
        "NATURGY_RESIDENCIAL",

    NATURGY_RESIDENCIAL_OSSE:
        "NATURGY_RESIDENCIAL_OSSE",

    NATURGY_COMERCIAL_T2:
        "NATURGY_COMERCIAL_T2"
};


/**
 * Detecta qué parser debe utilizarse
 * para un PDF de servicios.
 *
 * IMPORTANTE:
 * El orden de las comprobaciones importa.
 *
 * Los formatos más específicos deben evaluarse
 * antes que los formatos generales.
 *
 * @param {string} texto
 * @returns {string}
 */
function detectarServicio(texto) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "No se recibió texto válido para detectar el servicio."
        );
    }

    /*
     * Naturgy + OSSE debe evaluarse antes
     * que Naturgy residencial.
     */
    if (esNaturgyResidencialOSSE(texto)) {
        return TIPOS_SERVICIO
            .NATURGY_RESIDENCIAL_OSSE;
    }

    /*
     * T2 también es un formato específico
     * de Naturgy.
     */
    if (esNaturgyComercialT2(texto)) {
        return TIPOS_SERVICIO
            .NATURGY_COMERCIAL_T2;
    }

    /*
     * Naturgy residencial genérico.
     */
    if (esNaturgyResidencial(texto)) {
        return TIPOS_SERVICIO
            .NATURGY_RESIDENCIAL;
    }

    /*
     * EcoGas.
     */
    if (esEcoGasResidencial(texto)) {
        return TIPOS_SERVICIO
            .ECOGAS_RESIDENCIAL;
    }

    throw new Error(
        "La factura no corresponde a un " +
        "servicio o proveedor soportado."
    );
}


module.exports = {
    TIPOS_SERVICIO,
    detectarServicio
};