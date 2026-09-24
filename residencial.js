
const {
    convertirImporte,
    redondearImporte,
    sumarImportes,
    calcularDiferencia,
    controlarDiferencia
} = require("../../normalizadores/importe");

const {
    normalizarFecha
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
                `Naturgy Residencial: no se pudo encontrar ` +
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


/**
 * Detecta factura residencial Naturgy sin OSSE.
 */
function esNaturgyResidencial(texto) {
    if (!texto || typeof texto !== "string") {
        return false;
    }

    const contenido = texto.toUpperCase();

    return (
        contenido.includes("NATURGY SAN JUAN S.A.") &&
        contenido.includes("CONSUMO FACTURADO") &&
        contenido.includes("SUBTOTAL ENERGÍA") &&
        !contenido.includes("FACTURA CONJUNTA CON OSSE") &&
        !contenido.includes("T2 SMP")
    );
}


/**
 * Procesa factura residencial Naturgy.
 */
function procesarNaturgyResidencial(
    texto,
    nombreArchivoOriginal = ""
) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "Naturgy Residencial: no se recibió texto."
       ) ;
    }

    if (!esNaturgyResidencial(texto)) {
        throw new Error(
            "El PDF no corresponde al formato " +
            "Naturgy Residencial soportado."
        );
    }

   function obtenerNumeroFactura(texto) {
    const patrones = [
        /Factura\s*N[º°]\s*:?\s*(\d{7,12})/i,
        /Factura\s*N[º°]\s*(?:Tarifa\s*)+(\d{7,12})\s*T\d+-R\d+/i,
        /Factura\s*N[º°][\s\S]{0,80}?(\d{7,12})\s*T\d+-R\d+/i
    ];

    for (const patron of patrones) {
        const resultado = texto.match(patron);

        if (resultado) {
            return resultado[1].trim();
        }
    }

    throw new Error(
        'Naturgy Residencial: no se pudo encontrar el campo "Número de factura".'
    );
    }


    const numeroFactura= obtenerNumeroFactura(texto);
    
    const numeroSuministro = obtenerCampo(
        texto,
        /N[º°]\s*SUMINISTRO\s*[\r\n\s]*([\d ]+)/i,
        "Número de suministro"
    ).replace(/\s+/g, "");

    const numeroCliente = obtenerCampo(
        texto,
        /N[º°]\s*Cliente\s*([\d]+)/i,
        "Número de cliente"
    );

    const titular = obtenerCampo(
        texto,
        /(?:Nombre:\s*)?[\r\n\s]*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ \-]+)\s*[\r\n]+(?:Domicilio Postal|FLORIDA|Domicilio)/i,
        "Titular",
        false
    );

    const cuitCliente = obtenerCampo(
        texto,
        /Cuit N[º°]\/DNI N[º°]\s*([\d.\-]+)/i,
        "CUIT/DNI",
        false
    );

    const fechaEmision = normalizarFecha(
        obtenerCampo(
            texto,
            /Fecha Emisión\s+Periodo de Consumo\s*[\r\n\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
            "Fecha de emisión"
        )
    );

    const periodoMatch = texto.match(
        /Fecha Emisión\s+Periodo de Consumo\s*[\r\n\s]*\d{1,2}\/\d{1,2}\/\d{2,4}\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );

    const periodoDesde = periodoMatch
        ? normalizarFecha(periodoMatch[1])
        : "";

    const periodoHasta = periodoMatch
        ? normalizarFecha(periodoMatch[2])
        : "";

    const numeroMedidor = obtenerCampo(
        texto,
        /N[º°]\s*Medidor\s+Lect\.Anterior\s+Lect\.Actual[\s\S]{0,100}?([\d]{5,})\s+Conectado/i,
        "Número de medidor",
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

    const consumoMedido = medicion
        ? convertirImporte(medicion[6])
        : null;

    const consumoFacturado = obtenerImporte(
        texto,
        /Consumo Facturado[\s\r\n]*([\d.,]+)\s*kWh/i,
        "Consumo facturado"
    );

    const tarifa = obtenerCampo(
        texto,
        /Tarifa[\s\r\n]+([A-Z0-9\-]+)/i,
        "Tarifa",
        false
    );

    const fechaVencimiento = normalizarFecha(
        obtenerCampo(
            texto,
            /Vencimiento\s+Vigencia\s+Próx\.?\s*Vencimiento\s*[\r\n\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
            "Vencimiento",
            false
        )
    );

    const fechasPago = texto.match(
        /Vencimiento\s+Vigencia\s+Próx\.?\s*Vencimiento\s*[\r\n\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );

    const fechaVigencia = fechasPago
        ? normalizarFecha(fechasPago[2])
        : "";

    const proximoVencimiento = fechasPago
        ? normalizarFecha(fechasPago[3])
        : "";

    /*
     * ENERGÍA
     */
    const cargoFijo = obtenerImporte(
        texto,
        /Energ[ií]a\s*:[\s\S]{0,200}?Cargo Fijo\s*([\d.,]+)/i,
        "Cargo fijo"
    );

    const cargoVariable = obtenerImporte(
        texto,
        /Energ[ií]a\s*:[\s\S]{0,250}?Cargo Variable\s*([\d.,]+)/i,
        "Cargo variable"
    );

    /*
     * Subsidio estatal.
     *
     * Puede aparecer en cero o con importe negativo.
     */
    const subsidioEstatal = obtenerImporte(
        texto,
        /Sub\.?\s*Est\.?\s*Nac\.?[\s\S]{0,50}?([-−]?\s*[\d.,]+)/i,
        "Subsidio estatal",
        false
    );

    /*
     * IMPUESTOS
     */
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

    const iva = obtenerImporte(
        texto,
        /IVA Consumidor Final\s+([\d.,]+)/i,
        "IVA"
    );

    const fondo500kv = obtenerImporte(
        texto,
        /Fondo para la Línea de Interconexión en 500kV\s+([\d.,]+)/i,
        "Fondo Línea 500kV"
    );

    const fondoPIEDE = obtenerImporte(
        texto,
        /Aporte Fondo Plan Infraestructura PIEDE Ley 863-A\s+([\d.,]+)/i,
        "Fondo PIEDE"
    );

    const subtotalEnergiaInformado = obtenerImporte(
        texto,
        /Subtotal Energ[ií]a\s+([\d.,]+)/i,
        "Subtotal Energía"
    );

    const subtotalImpuestosInformado = obtenerImporte(
        texto,
        /Subtotal Impuestos y Contribuciones\s+([\d.,]+)/i,
        "Subtotal Impuestos"
    );

    const totalFactura = obtenerImporte(
        texto,
        /Total Mes\s+([\d.,]+)/i,
        "Total Mes",
        true
    );

    const saldoAnterior = obtenerImporte(
        texto,
        /Saldo Anterior Facturación Vencida\s+([\d.,]+)/i,
        "Saldo anterior",
        false
    );

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
            concepto: "SUBSIDIO ESTATAL NACIONAL",
            importe: redondearImporte(subsidioEstatal)
        },
        {
            categoria: "IMPUESTOS",
            concepto: "INGRESOS BRUTOS",
            importe: redondearImporte(ingresosBrutos)
        },
        {
            categoria: "IMPUESTOS",
            concepto: "CARGO UNICO MUNICIPAL",
            importe: redondearImporte(cargoUnicoMunicipal)
        },
        {
            categoria: "IMPUESTOS",
            concepto: "IVA CONSUMIDOR FINAL",
            importe: redondearImporte(iva)
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

    const subtotalEnergiaCalculado =
        sumarImportes([
            cargoFijo,
            cargoVariable,
            subsidioEstatal
        ]);

    const subtotalImpuestosCalculado =
        sumarImportes([
            ingresosBrutos,
            cargoUnicoMunicipal,
            iva,
            fondo500kv,
            fondoPIEDE
        ]);

    const totalCalculado =
        sumarImportes([
            subtotalEnergiaCalculado,
            subtotalImpuestosCalculado
        ]);

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
        tipoFactura: "RESIDENCIAL",

        numeroFactura,
        numeroCliente,
        numeroCuenta: "",
        numeroSuministro,

        titular,
        cuitCliente,

        domicilioSuministro: "",

        tarifa,
        categoriaIVA: "CONSUMIDOR FINAL",

        fechaEmision,
        fechaVencimiento,
        fechaVigencia,
        proximoVencimiento,

        periodoDesde,
        periodoHasta,
        periodoFacturado: "",

        numeroMedidor,
        lecturaAnterior,
        lecturaActual,

        consumoMedido,
        consumo: consumoFacturado,
        unidadConsumo: "kWh",

        conceptos,

        subtotalEnergia:
            subtotalEnergiaInformado ||
            subtotalEnergiaCalculado,

        subtotalImpuestos:
            subtotalImpuestosInformado ||
            subtotalImpuestosCalculado,

        subtotalSubsidios:
            redondearImporte(subsidioEstatal),

        subtotalVarios: 0,

        totalServicio: totalFactura,
        totalOtrosServicios: 0,
        totalFactura,

        saldoAnterior,

        totalCalculado,
        diferenciaTotal,

        controlTotal:
            controlarDiferencia(diferenciaTotal)
    };
}


module.exports = {
    esNaturgyResidencial,
    procesarNaturgyResidencial
};
