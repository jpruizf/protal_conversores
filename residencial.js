// servicios/proveedores/ecogas/residencial.js

const {
    convertirImporte,
    redondearImporte,
    sumarImportes,
    calcularDiferencia,
    controlarDiferencia
} = require("../../normalizadores/importe");

const {
    normalizarFecha,
    normalizarPeriodoAnioMes
} = require("../../normalizadores/fecha");


/**
 * Busca un campo dentro del texto.
 */
function obtenerCampo(
    texto,
    expresion,
    nombreCampo,
    obligatorio = true
) {
    const resultado = texto.match(expresion);

    if (!resultado) {
        if (obligatorio) {
            throw new Error(
                `EcoGas: no se pudo encontrar ` +
                `el campo "${nombreCampo}".`
            );
        }

        return "";
    }

    return resultado[1].trim();
}


/**
 * Determina si el PDF corresponde
 * a EcoGas / Distribuidora de Gas Cuyana.
 */
function esEcoGasResidencial(texto) {
    if (!texto || typeof texto !== "string") {
        return false;
    }

    const contenido = texto.toUpperCase();

    return (
        contenido.includes(
            "DISTRIBUIDORA DE GAS CUYANA"
        ) &&
        contenido.includes(
            "CONCEPTOS FACTURADOS"
        ) &&
        contenido.includes(
            "NÚMERO DE CUENTA"
        )
    );
}


/**
 * Procesa una factura residencial EcoGas.
 */
function procesarEcoGasResidencial(
    texto,
    nombreArchivoOriginal = ""
) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "EcoGas: no se recibió texto para procesar."
        );
    }

    if (!esEcoGasResidencial(texto)) {
        throw new Error(
            "El PDF no corresponde al formato " +
            "EcoGas residencial soportado."
        );
    }

    const fechaEmision = normalizarFecha(
        obtenerCampo(
            texto,
            /Fecha de emisión:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
            "Fecha de emisión"
        )
    );

    const numeroFactura = obtenerCampo(
        texto,
        /Liquidación de Servicios Públicos\s*"B"[^:]*:\s*([0-9-]+)/i,
        "Número de liquidación"
    );

    const numeroCuenta = obtenerCampo(
        texto,
        /NÚMERO DE CUENTA:\s*([0-9]+)/i,
        "Número de cuenta"
    );

    const numeroMedidor = obtenerCampo(
        texto,
        /Nro medidor:\s*([0-9]+)/i,
        "Número de medidor"
    );

    const periodoOriginal = obtenerCampo(
        texto,
        /Período de consumo\s*(\d{4}\/\d{1,2})/i,
        "Período de consumo"
    );

    const periodoFacturado =
        normalizarPeriodoAnioMes(
            periodoOriginal
        );

    const fechaVencimiento =
        normalizarFecha(
            obtenerCampo(
                texto,
                /Total a pagar hasta el\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
                "Fecha de vencimiento"
            )
        );

    const totalFactura = convertirImporte(
        obtenerCampo(
            texto,
            /TOTAL A PAGAR\s*\$\s*([\d.,]+)/i,
            "Total a pagar"
        )
    );

    const titular = obtenerCampo(
        texto,
        /Liquidación de Servicios Públicos[^]*?\n([A-ZÁÉÍÓÚÑ ]+)\n/i,
        "Titular",
        false
    );

    /*
     * Consumo.
     *
     * En el PDF ejemplo:
     * 0 m³
     */
    const consumo = convertirImporte(
        obtenerCampo(
            texto,
            /Consumo Medido\s*([\d.,]+)\s*m[³3]/i,
            "Consumo medido",
            false
        ) || "0"
    );

    /*
     * Conceptos facturados.
     *
     * En la factura de ejemplo aparecen:
     *
     * CARGO FIJO
     * SUBSIDIO REGIMEN ZONA FRIA
     * RECUPERO DE COSTOS DEB CRED BRIO
     * RECUPERO DE COSTOS COM E IND SAN JUAN
     * RECUPERO DE COSTOS IIBB DISTRIBUCION
     * IVA ALICUOTA GENERAL 21%
     */

    const cargoFijo = convertirImporte(
        obtenerCampo(
            texto,
            /CARGO FIJO[\s\S]*?(\d[\d.,]*)\s*(?:−|-)?\d/i,
            "Cargo fijo",
            false
        ) || "0"
    );

    /*
     * Para los conceptos restantes usamos búsquedas
     * específicas porque pdf-parse puede separar
     * nombres e importes en bloques distintos.
     *
     * Estas expresiones las vamos a endurecer
     * cuando tengamos más ejemplos EcoGas.
     */

    const bloqueConceptosResultado =
        texto.match(
            /CONCEPTOS FACTURADOS([\s\S]*?)FACTURA/i
        );

    const bloqueConceptos =
        bloqueConceptosResultado
            ? bloqueConceptosResultado[1]
            : "";

    /*
     * Recuperamos todos los importes presentes
     * en la zona de conceptos.
     */
    const importesEncontrados = [
        ...bloqueConceptos.matchAll(
            /(?:^|\s)([-−]?\s*\d[\d.,]*)/gm
        )
    ]
        .map(resultado => {
            const limpio = resultado[1]
                .replace("−", "-")
                .trim();

            try {
                return convertirImporte(limpio);
            } catch {
                return null;
            }
        })
        .filter(valor => valor !== null);

    /*
     * En la factura utilizada como modelo
     * el orden es:
     *
     * 5082.15
     * -1524.65
     * 45.14
     * 51.96
     * 62.07
     * 780.50
     */
    const valoresConceptos =
        importesEncontrados.slice(-6);

    const [
        valorCargoFijo = cargoFijo,
        subsidioZonaFria = 0,
        recuperoDebCred = 0,
        recuperoComercioIndustria = 0,
        recuperoIIBB = 0,
        iva = 0
    ] = valoresConceptos;

    const conceptos = [
        {
            categoria: "SERVICIO",
            concepto: "CARGO FIJO",
            importe: redondearImporte(
                valorCargoFijo
            )
        },
        {
            categoria: "SUBSIDIO",
            concepto:
                "SUBSIDIO REGIMEN ZONA FRIA",
            importe: redondearImporte(
                subsidioZonaFria
            )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "RECUPERO DE COSTOS DEB CRED BRIO",
            importe: redondearImporte(
                recuperoDebCred
            )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "RECUPERO DE COSTOS COM E IND SAN JUAN",
            importe: redondearImporte(
                recuperoComercioIndustria
            )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "RECUPERO DE COSTOS IIBB DISTRIBUCION",
            importe: redondearImporte(
                recuperoIIBB
            )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "IVA ALICUOTA GENERAL 21%",
            importe: redondearImporte(
                iva
            )
        }
    ];

    const totalCalculado =
        sumarImportes(
            conceptos.map(
                concepto => concepto.importe
            )
        );

    const diferenciaTotal =
        calcularDiferencia(
            totalCalculado,
            totalFactura
        );

    return {
        nombreArchivoOriginal,

        proveedor: "ECOGAS",
        empresa:
            "DISTRIBUIDORA DE GAS CUYANA S.A.",

        tipoServicio: "GAS",
        tipoFactura: "RESIDENCIAL",

        numeroFactura,
        numeroCliente: "",
        numeroCuenta,
        numeroSuministro: "",

        titular,

        cuitCliente: "",
        domicilioSuministro: "",

        tarifa: obtenerCampo(
            texto,
            /DOMÉSTICO\s+([A-Z0-9 ]+?)\s+CONS/i,
            "Tarifa",
            false
        ),

        categoriaIVA: "CONSUMIDOR FINAL",

        fechaEmision,
        fechaVencimiento,
        fechaVigencia: "",
        proximoVencimiento: "",

        periodoDesde: "",
        periodoHasta: "",
        periodoFacturado,

        numeroMedidor,

        lecturaAnterior: null,
        lecturaActual: null,

        consumo,
        unidadConsumo: "m3",

        conceptos,

        subtotalEnergia: redondearImporte(
            conceptos
                .filter(
                    item =>
                        item.categoria ===
                        "SERVICIO"
                )
                .reduce(
                    (total, item) =>
                        total + item.importe,
                    0
                )
        ),

        subtotalImpuestos: redondearImporte(
            conceptos
                .filter(
                    item =>
                        item.categoria ===
                        "IMPUESTOS"
                )
                .reduce(
                    (total, item) =>
                        total + item.importe,
                    0
                )
        ),

        subtotalSubsidios:
            redondearImporte(
                conceptos
                    .filter(
                        item =>
                            item.categoria ===
                            "SUBSIDIO"
                    )
                    .reduce(
                        (total, item) =>
                            total + item.importe,
                        0
                    )
            ),

        subtotalVarios: 0,

        totalServicio: totalFactura,
        totalOtrosServicios: 0,
        totalFactura,

        totalCalculado,
        diferenciaTotal,

        controlTotal:
            controlarDiferencia(
                diferenciaTotal
            )
    };
}


module.exports = {
    esEcoGasResidencial,
    procesarEcoGasResidencial
};