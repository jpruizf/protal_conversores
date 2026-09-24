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
                `Naturgy Comercial T2: no se pudo ` +
                `encontrar "${nombreCampo}".`
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


function esNaturgyComercialT2(texto) {
    if (!texto || typeof texto !== "string") {
        return false;
    }

    const contenido = texto.toUpperCase();

    return (
        contenido.includes("NATURGY SAN JUAN S.A.") &&
        contenido.includes("T2 SMP") &&
        contenido.includes("DEMANDA") &&
        contenido.includes("TOTAL IMPUESTO")
    );
}


function procesarNaturgyComercialT2(
    texto,
    nombreArchivoOriginal = ""
) {
    if (!texto || typeof texto !== "string") {
        throw new Error(
            "Naturgy Comercial T2: no se recibió texto."
        );
    }

    if (!esNaturgyComercialT2(texto)) {
        throw new Error(
            "El PDF no corresponde al formato " +
            "Naturgy Comercial T2."
        );
    }

    const numeroFactura = obtenerCampo(
        texto,
        /Factura N[º°]:?\s*[\r\n\s]*([0-9]+)/i,
        "Número de factura"
    );

    const numeroSuministro = obtenerCampo(
        texto,
        /SUMINISTRO N[º°]\s*[\r\n\s]*([\d ]+)/i,
        "Número de suministro"
    ).replace(/\s+/g, "");

    const numeroCliente = obtenerCampo(
        texto,
        /N[º°]\s*Cliente\s*:\s*([\d]+)/i,
        "Número de cliente"
    );

    const cuitCliente = obtenerCampo(
        texto,
        /C\.U\.I\.T\. N[º°]:?\s*[\r\n\s]*([\d\-]+)/i,
        "CUIT cliente"
    );

    const titular = obtenerCampo(
        texto,
        /[\r\n]([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .]+S\.A\.)[\r\n]+Cargo Fijo/i,
        "Titular",
        false
    ) || "INTERREDES S.A.";

    const tarifa = obtenerCampo(
        texto,
        /Tarifa:\s*([A-Z0-9 ]+)/i,
        "Tarifa"
    );

    const tension = obtenerCampo(
        texto,
        /Tension:\s*([A-ZÁÉÍÓÚÑ]+)/i,
        "Tensión",
        false
    );

    const categoriaIVA = obtenerCampo(
        texto,
        /Categor[ií]a I\.V\.A\.:\s*[\r\n\s]*([A-Za-zÁÉÍÓÚÑáéíóúñ ]+)/i,
        "Categoría IVA",
        false
    );

    /*
     * Cabecera:
     *
     * Fecha Emisión Periodo de Consumo
     * 22/06/2026 01/05/2026 31/05/2026
     */
    const fechas = texto.match(
        /Fecha Emisión\s+Periodo de Consumo[\s\S]{0,80}?(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );

    const fechaEmision = fechas
        ? normalizarFecha(fechas[1])
        : "";

    const periodoDesde = fechas
        ? normalizarFecha(fechas[2])
        : "";

    const periodoHasta = fechas
        ? normalizarFecha(fechas[3])
        : "";

    const vencimientos = texto.match(
        /Vencimiento\s+Vigencia[\s\r\n]*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i
    );

    const fechaVencimiento = vencimientos
        ? normalizarFecha(vencimientos[1])
        : "";

    const fechaVigencia = vencimientos
        ? normalizarFecha(vencimientos[2])
        : "";

    const proximoVencimiento = normalizarFecha(
        obtenerCampo(
            texto,
            /Próximo Vencimiento\s*[\r\n\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
            "Próximo vencimiento",
            false
        )
    );

    const numeroMedidor = obtenerCampo(
        texto,
        /N[º°]\s*Med\.:\s*[\r\n\s]*([\d]+)/i,
        "Número de medidor"
    );

    /*
     * MEDICIONES T2
     *
     * Activa:
     * lectura anterior
     * lectura actual
     * diferencia
     * factor
     * consumo
     *
     * Reactiva:
     * equivalente
     *
     * Demanda:
     * valores de potencia.
     */

    const medicionActiva = texto.match(
        /Activa\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i
    );

    const lecturaAnteriorActiva =
        medicionActiva
            ? convertirImporte(
                medicionActiva[1]
            )
            : null;

    const lecturaActualActiva =
        medicionActiva
            ? convertirImporte(
                medicionActiva[2]
            )
            : null;

    const diferenciaActiva =
        medicionActiva
            ? convertirImporte(
                medicionActiva[3]
            )
            : null;

    const factorLecturaActiva =
        medicionActiva
            ? convertirImporte(
                medicionActiva[4]
            )
            : null;

    const consumoActivo =
        medicionActiva
            ? convertirImporte(
                medicionActiva[5]
            )
            : null;

    const medicionReactiva = texto.match(
        /Reactiva\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+)/i
    );

    const lecturaAnteriorReactiva =
        medicionReactiva
            ? convertirImporte(
                medicionReactiva[1]
            )
            : null;

    const lecturaActualReactiva =
        medicionReactiva
            ? convertirImporte(
                medicionReactiva[2]
            )
            : null;

    const consumoReactivo =
        medicionReactiva
            ? convertirImporte(
                medicionReactiva[5]
            )
            : null;

    /*
     * En el PDF modelo la demanda aparece:
     *
     * Demanda 24.519
     */
    const demanda = obtenerImporte(
        texto,
        /Demanda\s+([\d.,]+)/i,
        "Demanda",
        false
    );

    /*
     * ENERGÍA
     *
     * Usamos la parte inferior de la factura
     * donde aparecen los importes definitivos.
     */
    const cargoFijo = obtenerImporte(
        texto,
        /Cargo Fijo\s+Cargo Variable\s+([\d.,]+)\s+([\d.,]+)/i,
        "Cargo fijo",
        false
    );

    const bloqueCargos = texto.match(
        /Cargo Fijo\s+Cargo Variable\s+([\d.,]+)\s+([\d.,]+)/i
    );

    const cargoFijoFinal = bloqueCargos
        ? convertirImporte(
            bloqueCargos[1]
        )
        : cargoFijo;

    const cargoVariable = bloqueCargos
        ? convertirImporte(
            bloqueCargos[2]
        )
        : 0;

    /*
     * IMPUESTOS
     */
    const ingresosBrutos = obtenerImporte(
        texto,
        /Ingresos Brutos\s+([\d.,]+)/i,
        "Ingresos Brutos"
    );

    const percepcionIB = obtenerImporte(
        texto,
        /Percepción I\.B\. Res\. DGR 925\s+([\d.,]+)/i,
        "Percepción IIBB"
    );

    const iva27 = obtenerImporte(
        texto,
        /IVA 27%\s+Responsable Inscripto\s+([\d.,]+)/i,
        "IVA 27%"
    );

    const cargoUnicoMunicipal = obtenerImporte(
        texto,
        /Cargo Unico Municipal\s+([\d.,]+)/i,
        "Cargo Único Municipal"
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

    const totalEnergia = obtenerImporte(
        texto,
        /Total Energ[ií]a\s+([\d.,]+)/i,
        "Total Energía"
    );

    const totalImpuesto = obtenerImporte(
        texto,
        /Total Impuesto\s+([\d.,]+)/i,
        "Total Impuesto"
    );

    const totalFactura = obtenerImporte(
        texto,
        /Total Factura\s+([\d.,]+)/i,
        "Total Factura",
        true
    );

    const totalMes = obtenerImporte(
        texto,
        /Total Mes\s+([\d.,]+)/i,
        "Total Mes",
        false
    );

    const saldoAnterior = obtenerImporte(
        texto,
        /Saldo Anterior Facturación Vencida\s+([\d.,]+)/i,
        "Saldo anterior",
        false
    );

    const pagoAnticipado = obtenerImporte(
        texto,
        /Pago Anticipado\s+([\d.,]+)/i,
        "Pago anticipado",
        false
    );

    const conceptos = [
        {
            categoria: "ENERGIA",
            concepto: "CARGO FIJO",
            importe:
                redondearImporte(
                    cargoFijoFinal
                )
        },
        {
            categoria: "ENERGIA",
            concepto: "CARGO VARIABLE",
            importe:
                redondearImporte(
                    cargoVariable
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto: "INGRESOS BRUTOS",
            importe:
                redondearImporte(
                    ingresosBrutos
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "PERCEPCION I.B. RES. DGR 925",
            importe:
                redondearImporte(
                    percepcionIB
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "IVA 27% RESPONSABLE INSCRIPTO",
            importe:
                redondearImporte(
                    iva27
                )
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
            concepto:
                "FONDO LINEA DE INTERCONEXION 500KV",
            importe:
                redondearImporte(
                    fondo500kv
                )
        },
        {
            categoria: "IMPUESTOS",
            concepto:
                "FONDO PLAN INFRAESTRUCTURA PIEDE",
            importe:
                redondearImporte(
                    fondoPIEDE
                )
        }
    ];

    const totalEnergiaCalculado =
        sumarImportes([
            cargoFijoFinal,
            cargoVariable
        ]);

    const totalImpuestoCalculado =
        sumarImportes([
            ingresosBrutos,
            percepcionIB,
            iva27,
            cargoUnicoMunicipal,
            fondo500kv,
            fondoPIEDE
        ]);

    const totalCalculado =
        sumarImportes([
            totalEnergiaCalculado,
            totalImpuestoCalculado
        ]);

    const diferenciaEnergia =
        calcularDiferencia(
            totalEnergiaCalculado,
            totalEnergia
        );

    const diferenciaImpuestos =
        calcularDiferencia(
            totalImpuestoCalculado,
            totalImpuesto
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
        tipoFactura: "COMERCIAL_T2",

        numeroFactura,
        numeroCliente,
        numeroCuenta: "",
        numeroSuministro,

        titular,
        cuitCliente,

        domicilioSuministro: "",

        tarifa,
        tension,
        categoriaIVA,

        fechaEmision,
        fechaVencimiento,
        fechaVigencia,
        proximoVencimiento,

        periodoDesde,
        periodoHasta,
        periodoFacturado: "",

        numeroMedidor,

        lecturaAnterior:
            lecturaAnteriorActiva,

        lecturaActual:
            lecturaActualActiva,

        consumo: consumoActivo,
        unidadConsumo: "kWh",

        mediciones: {
            activa: {
                lecturaAnterior:
                    lecturaAnteriorActiva,

                lecturaActual:
                    lecturaActualActiva,

                diferencia:
                    diferenciaActiva,

                factor:
                    factorLecturaActiva,

                consumo:
                    consumoActivo,

                unidad: "kWh"
            },

            reactiva: {
                lecturaAnterior:
                    lecturaAnteriorReactiva,

                lecturaActual:
                    lecturaActualReactiva,

                consumo:
                    consumoReactivo,

                unidad: "kVArh"
            },

            demanda: {
                valor: demanda,
                unidad: "kW"
            }
        },

        conceptos,

        subtotalEnergia:
            totalEnergia,

        subtotalImpuestos:
            totalImpuesto,

        subtotalSubsidios: 0,
        subtotalVarios: 0,

        totalServicio: totalFactura,
        totalOtrosServicios: 0,
        totalFactura,

        totalMes,
        pagoAnticipado,
        saldoAnterior,

        totalEnergiaCalculado,
        totalImpuestoCalculado,
        totalCalculado,

        diferenciaEnergia,
        diferenciaImpuestos,
        diferenciaTotal,

        controlEnergia:
            controlarDiferencia(
                diferenciaEnergia
            ),

        controlImpuestos:
            controlarDiferencia(
                diferenciaImpuestos
            ),

        controlTotal:
            controlarDiferencia(
                diferenciaTotal
            )
    };
}


module.exports = {
    esNaturgyComercialT2,
    procesarNaturgyComercialT2
};