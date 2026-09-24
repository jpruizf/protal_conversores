const {
    convertirImporte,
    redondearImporte,
    sumarImportes,
    calcularDiferencia,
    controlarDiferencia} = require("../../normalizadores/importe");

const {
    normalizarFecha,
    normalizarPeriodoMesAnio
} = require("../../normalizadores/fecha");


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
                `Naturgy + OSSE: no se pudo encontrar ` +
                `el campo "${nombreCampo}".`
            );
        }

        return "";
    }

    return resultado[1].trim();
}


function obtenerImporte(
    texto,
    expresion,
    nombreCampo,
    obligatorio = false
) {
    const valor = obtenerCampo(
        texto,
        expresion,
        nombreCampo,
        obligatorio
    );

    return valor
        ? convertirImporte(valor)
        : 0;
}


function esNaturgyResidencialOSSE(texto) {
    if (!texto || typeof texto !== "string") {
        return false;
    }

    const contenido = texto.toUpperCase();

    return (
        contenido.includes("NATURGY SAN JUAN S.A.") &&
        contenido.includes("FACTURA CONJUNTA CON OSSE") &&
        contenido.includes(
            "OBRAS SANITARIAS SOCIEDAD DEL ESTADO"
        )
    );
}


function procesarNaturgyResidencialOSSE(
    texto,
    nombreArchivoOriginal = ""
) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "Naturgy + OSSE: no se recibió texto."
        );
    }

    if (!esNaturgyResidencialOSSE(texto)) {
        throw new Error(
            "El PDF no corresponde al formato " +
            "Naturgy Residencial + OSSE."
        );
    }

    function obtenerNumeroFactura(texto) {
    const patrones = [
        /Factura\s*N[º°]\s*:?\s*(\d{7,12})/i,

        /Factura\s+Conjunta\s+con\s+OSSE[\s\S]{0,120}?(\d{7,12})\s*T\d+-R\d+/i,

        /\b(\d{7,12})\s*T1-R\d+\b/i
    ];

    for (const patron of patrones) {
        const resultado = texto.match(patron);

        if (resultado) {
            return resultado[1].trim();
        }
    }

    throw new Error(
        'Naturgy + OSSE: no se pudo encontrar el campo "Número de factura".'
    );
    }

    function obtenerNumeroSuministro(texto) {
    const patrones = [
        /*
         * Caso ideal:
         * Nº SUMINISTRO 20 0031 17771
         */
        /N[º°]\s*SUMINISTRO\s*:?\s*([\d ]{8,20})/i,

        /*
         * Caso observado en la factura OSSE.
         */
        /\b(20\s+\d{4}\s+\d{5})\b[\s\S]{0,120}?Factura\s+Conjunta\s+con\s+OSSE/i,

        /*
         * Fallback Naturgy.
         */
        /\b(20\s+\d{4}\s+\d{5})\b/i
    ];

    for (const patron of patrones) {
        const resultado = texto.match(patron);

        if (resultado && resultado[1]) {
            return resultado[1]
                .replace(/\s+/g, "");
        }
    }

    throw new Error(
        'Naturgy + OSSE: no se pudo encontrar el campo "Número de suministro".'
    );
    }
    const numeroFactura= obtenerNumeroFactura(texto);
    
    const numeroSuministro = obtenerNumeroSuministro(texto);

    const numeroCliente = obtenerCampo(
        texto,
        /N[º°]\s*Cliente\s+([\d]+)/i,
        "Número de cliente"
    );

    const titular = obtenerCampo(
        texto,
        /Nombre:\s*([^\r\n]+)/i,
        "Titular"
    );

    const fechaEmision = normalizarFecha(
        obtenerCampo(
            texto,
            /Fecha Emisión\s+Periodo de Consumo\s*[\r\n\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
            "Fecha emisión"
        )
    );

    const periodo = texto.match(
        /Fecha Emisión\s+Periodo de Consumo\s*[\r\n\s]*\d{1,2}\/\d{1,2}\/\d{2,4}\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );

    const periodoDesde = periodo
        ? normalizarFecha(periodo[1])
        : "";

    const periodoHasta = periodo
        ? normalizarFecha(periodo[2])
        : "";

    const numeroMedidor = obtenerCampo(
        texto,
        /N[º°]\s*Medidor\s+Lect\.Anterior[\s\S]{0,100}?([\d]{5,})\s+Conectado/i,
        "Medidor",
        false
    );

    const medicion = texto.match(
        /([\d]{5,})\s+Conectado\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+Real/i
    );

    const lecturaAnterior = medicion
        ? convertirImporte(medicion[2])
        : null;

    const lecturaActual = medicion
        ? convertirImporte(medicion[3])
        : null;

    const consumoBimestre = medicion
        ? convertirImporte(medicion[6])
        : null;

    const consumoFacturado = obtenerImporte(
        texto,
        /Consumo Facturado[\s\r\n]*([\d.,]+)\s*kWh/i,
        "Consumo facturado"
    );

    /*
     * NATURGY - ENERGÍA
     */
    const cargoFijo = obtenerImporte(
        texto,
        /Energ[ií]a:[\s\S]{0,200}?Cargo Fijo\s+([\d.,]+)/i,
        "Cargo fijo"
    );

    const subsidioTarifaSocial = obtenerImporte(
        texto,
        /Subsidio Tarifa Social\s+([-−]?\s*[\d.,]+)/i,
        "Subsidio tarifa social"
    );

    const cargoVariable = obtenerImporte(
        texto,
        /Cargo Variable\s+([\d.,]+)/i,
        "Cargo variable"
    );

    const subsidioEstatal = obtenerImporte(
        texto,
        /Sub\.?\s*Est\.?\s*Nac\.?[\s\S]{0,50}?([-−]?\s*[\d.,]+)/i,
        "Subsidio estatal"
    );

    const ingresosBrutos = obtenerImporte(
        texto,
        /Ingresos Brutos\s+([\d.,]+)/i,
        "Ingresos Brutos"
    );

    const cargoUnicoMunicipal = obtenerImporte(
        texto,
        /Cargo Unico Municipal\s+([\d.,]+)/i,
        "Cargo Único Municipal"
    );

    const ivaNaturgy = obtenerImporte(
        texto,
        /IVA Consumidor Final\s+([\d.,]+)/i,
        "IVA Naturgy"
    );

    const fondo500kv = obtenerImporte(
        texto,
        /Fondo para la Línea de Interconexión en 500kV\s+([\d.,]+)/i,
        "Fondo 500kV"
    );

    const fondoPIEDE = obtenerImporte(
        texto,
        /Aporte Fondo Plan Infraestructura PIEDE Ley 863-A\s+([\d.,]+)/i,
        "Fondo PIEDE"
    );

    const subtotalEnergia = obtenerImporte(
        texto,
        /Subtotal Energ[ií]a\s+([\d.,]+)/i,
        "Subtotal Energía"
    );

    const subtotalImpuestos = obtenerImporte(
        texto,
        /Subtotal Impuestos y Contribuciones\s+([\d.,]+)/i,
        "Subtotal impuestos"
    );

    /*
     * Total individual Naturgy.
     */
    const totalNaturgy = obtenerImporte(
        texto,
        /Total Naturgy San Juan S\.A\.\s+([\d.,]+)/i,
        "Total Naturgy",
        true
    );

    /*
     * OSSE
     *
     * pdf-parse coloca en este modelo:
     *
     * Importe IVA 21% 6203.70
     * 29541.45
     *
     * por eso extraemos el bloque conjuntamente.
     */
    const bloqueOSSE = texto.match(
        /Importe Basico[\s\S]{0,100}?Importe IVA 21%\s+([\d.,]+)\s+([\d.,]+)/i
    );

    const ivaOSSE = bloqueOSSE
        ? convertirImporte(bloqueOSSE[1])
        : 0;

    const importeBasicoOSSE = bloqueOSSE
        ? convertirImporte(bloqueOSSE[2])
        : 0;

    /*
     * En el talón OSSE aparece:
     *
     * Periodo:
     * ...
     * Total a Pagar: 35745.15
     */
    const totalOSSE = obtenerImporte(
        texto,
        /Periodo:\s*[\d\s\/]+[\s\S]{0,150}?Total a Pagar:\s*([\d.,]+)/i,
        "Total OSSE",
        true
    );

    /*
     * Total conjunto.
     */
    const totalConjuntoMatch = texto.match(
        /Total a Pagar\s+([\d.,]+)\s+([\d.,]+)[\s\S]{0,80}?Importe Basico/i
    );

    const totalFactura = totalConjuntoMatch
        ? convertirImporte(
            totalConjuntoMatch[1]
        )
        : sumarImportes([
            totalNaturgy,
            totalOSSE
        ]);

    const conceptos = [
        {
            categoria: "ENERGIA",
            concepto: "CARGO FIJO",
            importe: redondearImporte(cargoFijo)
        },
        {
            categoria: "ENERGIA",
            concepto: "CARGO VARIABLE",
            importe: redondearImporte(cargoVariable)
        },
        {
            categoria: "SUBSIDIO",
            concepto: "SUBSIDIO TARIFA SOCIAL",
            importe:
                redondearImporte(
                    subsidioTarifaSocial
                )
        },
        {
            categoria: "SUBSIDIO",
            concepto: "SUBSIDIO ESTATAL NACIONAL",
            importe:
                redondearImporte(
                    subsidioEstatal
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto: "INGRESOS BRUTOS",
            importe: redondearImporte(ingresosBrutos)
        },
        {
            categoria: "IMPUESTOS",
            concepto: "CARGO UNICO MUNICIPAL",
            importe:
                redondearImporte(
                    cargoUnicoMunicipal
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto: "IVA CONSUMIDOR FINAL",
            importe: redondearImporte(ivaNaturgy)
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "FONDO LINEA DE INTERCONEXION 500KV",
            importe: redondearImporte(fondo500kv)
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "FONDO PLAN INFRAESTRUCTURA PIEDE",
            importe: redondearImporte(fondoPIEDE)
        }
    ];

    const conceptosOSSE = [
        {
            categoria: "OSSE",
            concepto: "IMPORTE BASICO",
            importe:
                redondearImporte(
                    importeBasicoOSSE
                )
        },
        {
            categoria: "OSSE",
            concepto: "IVA 21%",
            importe: redondearImporte(ivaOSSE)
        }
    ];

    const totalNaturgyCalculado =
        sumarImportes([
            cargoFijo,
            cargoVariable,
            subsidioTarifaSocial,
            subsidioEstatal,
            ingresosBrutos,
            cargoUnicoMunicipal,
            ivaNaturgy,
            fondo500kv,
            fondoPIEDE
        ]);

    const totalOSSECalculado =
        sumarImportes([
            importeBasicoOSSE,
            ivaOSSE
        ]);

    const totalCalculado =
        sumarImportes([
            totalNaturgyCalculado,
            totalOSSECalculado
        ]);

    const diferenciaNaturgy =
        calcularDiferencia(
            totalNaturgyCalculado,
            totalNaturgy
        );

    const diferenciaOSSE =
        calcularDiferencia(
            totalOSSECalculado,
            totalOSSE
        );

    const diferenciaTotal =
        calcularDiferencia(
            totalCalculado,
            totalFactura
        );

    return {
        nombreArchivoOriginal,

        proveedor: "NATURGY",
        empresa: "NATURGY SAN JUAN S.A.",

        tipoServicio: "ELECTRICIDAD",
        tipoFactura: "RESIDENCIAL_OSSE",

        numeroFactura,
        numeroCliente,
        numeroCuenta: "",
        numeroSuministro,

        titular,

        fechaEmision,
        fechaVencimiento: "",
        fechaVigencia: "",
        proximoVencimiento: "",

        periodoDesde,
        periodoHasta,
        periodoFacturado: "",

        numeroMedidor,
        lecturaAnterior,
        lecturaActual,

        consumoMedido: consumoBimestre,
        consumo: consumoFacturado,
        unidadConsumo: "kWh",

        conceptos,

        subtotalEnergia,
        subtotalImpuestos,

        subtotalSubsidios:
            sumarImportes([
                subsidioTarifaSocial,
                subsidioEstatal
            ]),

        subtotalVarios: 0,

        totalServicio: totalNaturgy,

        serviciosAdicionales: [
            {
                proveedor: "OSSE",
                empresa:
                    "OBRAS SANITARIAS SOCIEDAD DEL ESTADO",
                tipoServicio: "AGUA",

                conceptos: conceptosOSSE,

                importeBasico:
                    redondearImporte(
                        importeBasicoOSSE
                    ),

                iva:
                    redondearImporte(
                        ivaOSSE
                    ),

                total:
                    redondearImporte(
                        totalOSSE
                    ),

                totalCalculado:
                    totalOSSECalculado,

                diferencia:
                    diferenciaOSSE,

                control:
                    controlarDiferencia(
                        diferenciaOSSE
                    )
            }
        ],

        totalOtrosServicios:
            redondearImporte(totalOSSE),

        totalFactura,

        totalNaturgyCalculado,
        totalOSSECalculado,
        totalCalculado,

        diferenciaNaturgy,
        diferenciaOSSE,
        diferenciaTotal,

        controlNaturgy:
            controlarDiferencia(
                diferenciaNaturgy
            ),

        controlOSSE:
            controlarDiferencia(
                diferenciaOSSE
            ),

        controlTotal:
            controlarDiferencia(
                diferenciaTotal
            )
    };
}


module.exports = {
    esNaturgyResidencialOSSE,
    procesarNaturgyResidencialOSSE
};
