/**
 * comprobantes.js
 *
 * Normalización fiscal/contable de facturas de servicios.
 *
 * IMPORTANTE:
 * Este módulo NO valida proveedores ni formatos.
 * Esa responsabilidad sigue perteneciendo a los parsers.
 *
 * Este módulo transforma el resultado técnico del parser
 * al modelo requerido por el Excel contable.
 */


/*
 * =========================================================
 * CONFIGURACIÓN CONTABLE
 * =========================================================
 */

const TIPOS_COMPROBANTE = {
    A: 1,
    B: 2
};

const TIPO_DOCUMENTO_CUIT = 80;


/*
 * =========================================================
 * UTILIDADES
 * =========================================================
 */

/**
 * Convierte valores monetarios a Number.
 *
 * Soporta, entre otros:
 *
 * 1234.56
 * 1.234,56
 * 1,234.56
 * $ 1.234,56
 */
function convertirNumero(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return 0;
    }

    if (typeof valor === "number") {
        return Number.isFinite(valor)
            ? valor
            : 0;
    }

    let texto = String(valor)
        .trim()
        .replace(/\$/g, "")
        .replace(/\s/g, "");

    if (!texto) {
        return 0;
    }

    const negativo =
        texto.startsWith("-") ||
        texto.endsWith("-");

    texto = texto.replace(/-/g, "");

    const ultimoPunto =
        texto.lastIndexOf(".");

    const ultimaComa =
        texto.lastIndexOf(",");


    /*
     * Tiene punto y coma.
     */
    if (
        ultimoPunto !== -1 &&
        ultimaComa !== -1
    ) {
        if (ultimaComa > ultimoPunto) {

            // 1.234,56
            texto = texto
                .replace(/\./g, "")
                .replace(",", ".");

        } else {

            // 1,234.56
            texto =
                texto.replace(/,/g, "");
        }

    /*
     * Solo coma.
     */
    } else if (ultimaComa !== -1) {

        texto =
            texto.replace(",", ".");

    /*
     * Solo punto.
     */
    } else if (
        ultimoPunto !== -1 &&
        /^\d{1,3}(\.\d{3})+$/.test(texto)
    ) {

        // 1.234.567
        texto =
            texto.replace(/\./g, "");
    }


    const numero =
        Number(texto);

    if (!Number.isFinite(numero)) {
        return 0;
    }

    return negativo
        ? -numero
        : numero;
}


/**
 * Redondea a dos decimales.
 */
function redondear(valor) {
    return Number(
        convertirNumero(valor)
            .toFixed(2)
    );
}


/**
 * Normaliza CUIT.
 *
 * 30-68168854-0
 * =>
 * 30681688540
 */
function normalizarCUIT(valor) {
    if (!valor) {
        return "";
    }

    return String(valor)
        .replace(/\D/g, "");
}


/**
 * Convierte texto a una forma comparable.
 */
function normalizarTexto(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase()
        .trim();
}


/*
 * =========================================================
 * DATOS DEL VENDEDOR
 * =========================================================
 */

/**
 * Obtiene razón social.
 */
function obtenerDenominacionVendedor(datos) {

    if (datos.empresa) {
        return String(
            datos.empresa
        ).trim();
    }


    const proveedor =
        normalizarTexto(
            datos.proveedor
        );


    if (
        proveedor.includes(
            "NATURGY"
        )
    ) {
        return "NATURGY SAN JUAN S.A.";
    }


    if (
        proveedor.includes(
            "ECOGAS"
        )
    ) {
        return "DISTRIBUIDORA DE GAS CUYANA S.A.";
    }


    return datos.proveedor || "";
}


/**
 * Obtiene CUIT del vendedor.
 *
 * La búsqueda prioriza la razón social
 * para evitar tomar el CUIT del cliente.
 */
function obtenerCuitVendedor(datos) {

    const texto =
        datos.textoOriginal || "";


    /*
     * NATURGY.
     */
    let resultado =
        texto.match(
            /NATURGY\s+SAN\s+JUAN\s+S\.?A\.?[\s\S]{0,250}?C\.?U\.?I\.?T\.?\s*N?[º°]?\s*([\d.\-]+)/i
        );


    if (
        resultado &&
        resultado[1]
    ) {
        return normalizarCUIT(
            resultado[1]
        );
    }


    /*
     * ECOGAS.
     */
    resultado =
        texto.match(
            /DISTRIBUIDORA\s+DE\s+GAS\s+CUYANA\s+S\.?A\.?[\s\S]{0,300}?C\.?U\.?I\.?T\.?\s*N?[º°]?\s*([\d.\-]+)/i
        );


    if (
        resultado &&
        resultado[1]
    ) {
        return normalizarCUIT(
            resultado[1]
        );
    }


    /*
     * Fallback sobre dato ya extraído.
     */
    if (datos.cuitProveedor) {
        return normalizarCUIT(
            datos.cuitProveedor
        );
    }


    return "";
}


/*
 * =========================================================
 * COMPROBANTE FISCAL
 * =========================================================
 */

/**
 * Extrae:
 *
 * letra
 * punto de venta
 * número de comprobante
 *
 * Ejemplo:
 *
 * B-00003-35427218
 */

/**
 * Obtiene punto de venta y número de comprobante
 * a partir del número de factura extraído
 * correctamente por el parser.
 *
 * Ejemplo:
 *
 * 142032530
 *
 * Punto de venta:      1
 * Número comprobante:  42032530
 */
/**
 * Obtiene únicamente la letra fiscal.
 *
 * Ejemplo:
 * Comp. Servicio Público Nº: A-00003-01179079
 *
 * Devuelve:
 * A
 */
function obtenerLetraComprobante(datos) {

    const texto =
        datos.textoOriginal || "";

    const resultado =
        texto.match(
            /Comp\.?\s*Servicio\s+P[uú]blico\s*N?[º°]?\s*:?\s*([AB])\s*-/i
        );

    if (
        resultado &&
        resultado[1]
    ) {
        return resultado[1]
            .toUpperCase();
    }

    return "";
}


/**
 * Obtiene Punto de Venta y Número de Comprobante
 * utilizando el número de factura.
 *
 * Ejemplo:
 *
 * numeroFactura = 142032530
 *
 * Punto de Venta      = 1
 * Número Comprobante  = 42032530
 */
function obtenerDatosComprobante(datos) {

    let numeroFactura =
        String(
            datos.numeroFactura || ""
        )
            .replace(/\D/g, "");


    /*
     * Si el parser no entregó numeroFactura,
     * intentamos recuperarlo desde:
     *
     * Factura Nº 142032530
     */
    if (!numeroFactura) {

        const texto =
            datos.textoOriginal || "";

        const resultadoFactura =
            texto.match(
                /Factura\s*N[º°]\s*:?\s*(\d{9})/i
            );

        if (
            resultadoFactura &&
            resultadoFactura[1]
        ) {
            numeroFactura =
                resultadoFactura[1];
        }
    }


    /*
     * La letra A/B se obtiene por separado.
     *
     * NO utilizamos 00003-01179079
     * como número de factura.
     */
    const letra =
        obtenerLetraComprobante(
            datos
        );


    /*
     * Si tenemos una factura de 9 dígitos:
     *
     * 142032530
     *
     * 1        = Punto de Venta
     * 42032530 = Número de Comprobante
     */
    if (
        numeroFactura.length === 9
    ) {
        return {

            letra,

            puntoVenta:
                numeroFactura.substring(
                    0,
                    1
                ),

            numeroComprobante:
                numeroFactura.substring(
                    1
                )
        };
    }


    /*
     * Fallback.
     */
    return {

        letra,

        puntoVenta: "",

        numeroComprobante:
            numeroFactura
    };
}

const PUNTOS_VENTA = {
    /*
     * COMPLETAR CON LA RELACIÓN REAL.
     *
     * Ejemplo:
     *
     * "NATURGY_COMERCIAL_T2": "22",
     * "NATURGY_RESIDENCIAL": "4",
     * "ECOGAS_RESIDENCIAL": "1070"
     */
    };
    function obtenerPuntoVenta(datos) {

    const proveedor =
        normalizarTexto(
            datos.proveedor
        );

    const tipo =
        normalizarTexto(
            datos.tipoFactura
        );

    const clave =
        `${proveedor}_${tipo}`;

    return (
        PUNTOS_VENTA[clave] ||
        ""
    );
}

/**
 * Convierte letra en código.
 *
 * A = 1
 * B = 2
 */
function obtenerTipoComprobante(
    letra
) {

    return (
        TIPOS_COMPROBANTE[
            String(
                letra || ""
            ).toUpperCase()
        ] ?? ""
    );
}


/*
 * =========================================================
 * IMPUESTOS
 * =========================================================
 */

/**
 * Determina si el concepto corresponde
 * a un impuesto/tasa/percepción.
 */
function esConceptoImpositivo(
    concepto
) {

    const texto =
        normalizarTexto(
            concepto
        );

/*
 * Conceptos eléctricos que NO son impuestos.
 */
const conceptosNoImpositivos = [
    "ACTIVA",
    "REACTIVA",
    "DEMANDA",
    "CONSUMO",
    "DDAS.POT",
    "DDAS POT"
];

const excluir =
    conceptosNoImpositivos.some(
        (conceptoExcluido) =>
            texto ===
                conceptoExcluido ||
            texto.startsWith(
                `${conceptoExcluido} `
            )
);

if (excluir) {
    return false;
}


    if (!texto) {
        return false;
    }


    /*
     * Evitar subtotales/totales.
     */
    if (
        texto.includes(
            "SUBTOTAL"
        ) ||
        texto.startsWith(
            "TOTAL "
        )
    ) {
        return false;
    }


    const palabras = [

        "IVA",
        "INGRESOS BRUTOS",
        "IIBB",
        "PERCEPC",
        "IMPUESTO",
        "CONTRIBUCION",
        "TASA",
        "FONDO",
        "PIEDE",
        "INTERCONEXION",
        "CARGO UNICO MUNICIPAL"
    ];


    return palabras.some(
        (palabra) =>
            texto.includes(
                palabra
            )
    );
}


/**
 * Detecta alícuota de IVA.
 *
 * Ejemplos:
 *
 * IVA 21%
 * IVA 27%
 * IVA 10,5%
 */
function obtenerAlicuotaIVA(
    concepto
) {

    const texto =
        normalizarTexto(
            concepto
        );


    if (
        !texto.includes("IVA")
    ) {
        return null;
    }


    const resultado =
        texto.match(
            /(\d+(?:[.,]\d+)?)\s*%/
        );


    if (!resultado) {
        return null;
    }


    const alicuota =
        Number(
            resultado[1]
                .replace(
                    ",",
                    "."
                )
        );


    return Number.isFinite(
        alicuota
    )
        ? alicuota
        : null;
}


/**
 * Agrega un impuesto evitando duplicados.
 */
function agregarImpuesto(
    lista,
    concepto,
    importe,
    origen = ""
) {
    const nombre =
        String(concepto || "").trim();

    if (!nombre) {
        return;
    }

    const valor =
        redondear(importe);

    const clave =
        normalizarTexto(nombre);

    /*
     * Mismo concepto + mismo importe =
     * mismo impuesto detectado por dos fuentes.
     *
     * NO volver a sumarlo.
     */
    const duplicado =
        lista.find(
            (item) =>
                item.clave === clave &&
                Math.abs(
                    item.importe - valor
                ) <= 0.01
        );

    if (duplicado) {

        if (
            origen &&
            !duplicado.origenes.includes(origen)
        ) {
            duplicado.origenes.push(origen);
        }

        return;
    }

    lista.push({
        clave,
        concepto: nombre,
        importe: valor,

        alicuotaIVA:
            obtenerAlicuotaIVA(nombre),

        origenes:
            origen
                ? [origen]
                : []
    });
}


/**
 * Obtiene conceptos de los parsers.
 */
function extraerImpuestosDesdeDatos(
    datos
) {

    const impuestos = [];


    const revisarConceptos =
        (conceptos) => {

            if (
                !Array.isArray(
                    conceptos
                )
            ) {
                return;
            }


            conceptos.forEach(
                (item) => {

                    if (!item) {
                        return;
                    }


                    const concepto =
                        item.concepto ||
                        item.descripcion ||
                        item.nombre ||
                        "";


                    if (
                        !esConceptoImpositivo(
                            concepto
                        )
                    ) {
                        return;
                    }


                    agregarImpuesto(
                        impuestos,
                        concepto,
                        item.importe
                    );
                }
            );
        };


    revisarConceptos(
        datos.conceptos
    );


    /*
     * Ejemplo:
     * OSSE u otros servicios adicionales.
     */
    if (
        Array.isArray(
            datos.serviciosAdicionales
        )
    ) {

        datos.serviciosAdicionales
            .forEach(
                (servicio) => {

                    revisarConceptos(
                        servicio.conceptos
                    );
                }
            );
    }


    return impuestos;
}


/**
 * Busca impuestos directamente
 * sobre el texto original.
 *
 * Sirve como complemento cuando el parser
 * no cargó algún concepto en datos.conceptos.
 */
function extraerImpuestosDesdeTexto(
    datos,
    impuestos
) {

    const texto =
        datos.textoOriginal || "";


    if (!texto) {
        return;
    }


    const lineas =
        texto
            .split(/\r?\n/)
            .map(
                (linea) =>
                    linea.trim()
            )
            .filter(Boolean);


    for (const linea of lineas) {

        /*
         * Concepto + importe al final.
         */
        const resultado =
            linea.match(
                /^(.+?)\s+(-?\$?\s*[\d.,]+)\s*$/
            );


        if (!resultado) {
            continue;
        }


        const concepto =
            resultado[1]
                .trim();


        if (
            !esConceptoImpositivo(
                concepto
            )
        ) {
            continue;
        }


        /*
         * Evitar textos que solamente
         * describen condición fiscal.
         */
        const conceptoNormal =
            normalizarTexto(
                concepto
            );


        if (
            conceptoNormal.includes(
                "RESP. INSC"
            ) ||
            conceptoNormal.includes(
                "RESP.INSC"
            ) ||
            conceptoNormal.includes(
                "CONSUMIDOR FINAL"
            ) ||
            conceptoNormal.includes(
                "DESCONTADO"
            )
        ) {
            continue;
        }


        agregarImpuesto(
            impuestos,
            concepto,
            resultado[2]
        );
    }
}


/**
 * Extrae la tabla completa de impuestos.
 */
function extraerTablaImpuestos(
    datos
) {

    const impuestos =
        extraerImpuestosDesdeDatos(
            datos
        );


    extraerImpuestosDesdeTexto(
        datos,
        impuestos
    );


    return impuestos;
}


/*
 * =========================================================
 * CÁLCULOS
 * =========================================================
 */

/**
 * Importe total factura.
 */
function obtenerImporteTotal(
    datos
) {

    const candidatos = [

        datos.totalFactura,
        datos.totalAPagar,
        datos.totalMes,
        datos.totalServicio
    ];


    for (const valor of candidatos) {

        const numero =
            convertirNumero(
                valor
            );


        if (
            Number.isFinite(
                numero
            ) &&
            numero !== 0
        ) {
            return redondear(
                numero
            );
        }
    }


    return 0;
}


/**
 * Total IVA =
 * suma de todos los conceptos IVA.
 */
function calcularTotalIVA(
    impuestos
) {

    const total =
        impuestos
            .filter(
                (item) =>
                    normalizarTexto(
                        item.concepto
                    ).includes(
                        "IVA"
                    )
            )
            .reduce(
                (acumulado, item) =>
                    acumulado +
                    convertirNumero(
                        item.importe
                    ),
                0
            );


    return redondear(
        total
    );
}


/**
 * Total Neto Gravado =
 *
 * SUMA(
 *   importe IVA * 100 / alícuota
 * )
 */
function calcularTotalNetoGravado(
    datos,
    impuestos
) {

    const candidatos = [
        datos.totalEnergia,
        datos.subtotalEnergia
    ];

    for (const valor of candidatos) {

        const numero =
            convertirNumero(valor);

        if (
            Number.isFinite(numero) &&
            numero !== 0
        ) {
            return numero;
        }
    }

    /*
     * Fallback:
     * base IVA - Ingresos Brutos.
     */
    let baseIVA = 0;

    for (const impuesto of impuestos) {

        if (
            !impuesto.alicuotaIVA ||
            impuesto.alicuotaIVA <= 0
        ) {
            continue;
        }

        baseIVA +=
            convertirNumero(
                impuesto.importe
            ) *
            100 /
            impuesto.alicuotaIVA;
    }

    const ingresosBrutos =
        obtenerIngresosBrutos(
            impuestos
        );

    return redondear(
        baseIVA -
        ingresosBrutos
    );
}


/**
 * Determina si el vendedor figura
 * como Responsable Inscripto.
 */
function esResponsableInscripto(
    datos
) {

    const texto =
        normalizarTexto(
            datos.textoOriginal
        );


    return (
        texto.includes(
            "RESP. INSC"
        ) ||
        texto.includes(
            "RESP.INSC"
        ) ||
        texto.includes(
            "RESP INSC"
        ) ||
        texto.includes(
            "RESP.INCRIPTO"
        ) ||
        texto.includes(
            "RESP INCRIPTO"
        ) ||
        texto.includes(
            "RESPONSABLE INSCRIPTO"
        )
    );
}


/**
 * Crédito Fiscal Computable.
 *
 * Regla definida:
 *
 * únicamente Responsable Inscripto
 * y alícuota 27%.
 *
 * Crédito =
 * IVA 27% * 100 / 27
 */

function obtenerIngresosBrutos(
    impuestos
) {
    const item =
        impuestos.find(
            (impuesto) => {

                const concepto =
                    normalizarTexto(
                        impuesto.concepto
                    );

                return (
                    concepto.includes(
                        "INGRESOS BRUTOS"
                    ) &&
                    !concepto.includes(
                        "PERCEPC"
                    )
                );
            }
        );

    return item
        ? redondear(item.importe)
        : 0;
}

function calcularCreditoFiscalComputable(
    datos,
    impuestos
) {

    if (
        !esResponsableInscripto(
            datos
        )
    ) {
        return 0;
    }


    let credito = 0;


    for (const impuesto of impuestos) {

        const alicuota =
            impuesto.alicuotaIVA;


        if (alicuota !== 27) {
            continue;
        }


        const importe =
            convertirNumero(
                impuesto.importe
            );


        credito +=
            importe *
            100 /
            27;
    }

    console.log("CREDITO FISCAL COMPLETO:",
        credito
    );

    return credito;
}


/**
 * Percepciones generales.
 */
function calcularPercepciones(
    impuestos
) {

    const total =
        impuestos
            .filter(
                (item) =>
                    normalizarTexto(
                        item.concepto
                    ).includes(
                        "PERCEPC"
                    )
            )
            .reduce(
                (acumulado, item) =>
                    acumulado +
                    convertirNumero(
                        item.importe
                    ),
                0
            );


    return redondear(
        total
    );
}


/**
 * Percepciones de Ingresos Brutos.
 */
function calcularPercepcionesIB(
    impuestos
) {
    let total = 0;

    for (const item of impuestos) {

        const concepto =
            normalizarTexto(
                item.concepto
            );

        const esPercepcion =
            concepto.includes(
                "PERCEPC"
            );

        const esIngresosBrutos =
            /I\.?\s*B\.?/i.test(
                concepto
            ) ||
            concepto.includes(
                "IIBB"
            ) ||
            concepto.includes(
                "INGRESOS BRUTOS"
            );

        if (
            esPercepcion &&
            esIngresosBrutos
        ) {
            total +=
                convertirNumero(
                    item.importe
                );
        }
    }

    return redondear(total);
}

/**
 * Impuesto Interno.
 *
 * Suma los impuestos definidos evitando
 * duplicados del mismo concepto e importe.
 *
 * Incluye:
 *
 * - Ingresos Brutos
 * - Percepción I.B.
 * - IVA
 * - Cargo Único Municipal
 * - Fondo Interconexión 500kV
 * - Fondo PIEDE
 */
function calcularImpuestoInterno(
    impuestos
) {

    /*
     * Guardaremos combinaciones únicas:
     *
     * CATEGORIA|IMPORTE
     *
     * Ejemplo:
     *
     * FONDO_PIEDE|40472.47
     *
     * Si aparece nuevamente, no se suma.
     */
    const importesProcesados =
        new Set();

    let total = 0;


    for (const item of impuestos) {

        if (!item) {
            continue;
        }


        const concepto =
            normalizarTexto(
                item.concepto
            );


        const importe =
            redondear(
                convertirNumero(
                    item.importe
                )
            );


        if (
            !Number.isFinite(importe)
        ) {
            continue;
        }


        /*
         * ---------------------------------------
         * Determinar categoría fiscal
         * ---------------------------------------
         */

        let categoria = null;


        /*
         * 1. Percepción I.B.
         *
         * Se evalúa ANTES de Ingresos Brutos
         * para evitar confundir ambos conceptos.
         */
        const esPercepcion =
            concepto.includes(
                "PERCEPC"
            );

        const esIB =
            concepto.includes("I.B") ||
            concepto.includes("IB") ||
            concepto.includes("IIBB") ||
            concepto.includes(
                "INGRESOS BRUTOS"
            );


        if (
            esPercepcion &&
            esIB
        ) {

            categoria =
                "PERCEPCION_IB";


        /*
         * 2. Ingresos Brutos.
         */
        } else if (
            concepto.includes(
                "INGRESOS BRUTOS"
            )
        ) {

            categoria =
                "INGRESOS_BRUTOS";


        /*
         * 3. IVA.
         */
        } else if (
            concepto.includes(
                "IVA"
            )
        ) {

            categoria =
                "IVA";


        /*
         * 4. Cargo Único Municipal.
         */
        } else if (
            concepto.includes(
                "CARGO UNICO MUNICIPAL"
            )
        ) {

            categoria =
                "CARGO_UNICO_MUNICIPAL";


        /*
         * 5. Fondo Línea de Interconexión.
         */
        } else if (
            concepto.includes(
                "INTERCONEXION"
            ) &&
            (
                concepto.includes(
                    "500KV"
                ) ||
                concepto.includes(
                    "500 KV"
                )
            )
        ) {

            categoria =
                "FONDO_INTERCONEXION_500KV";


        /*
         * 6. Fondo PIEDE.
         */
        } else if (
            concepto.includes(
                "PIEDE"
            )
        ) {

            categoria =
                "FONDO_PIEDE";
        }


        /*
         * No pertenece a ninguno de
         * los impuestos definidos.
         */
        if (!categoria) {
            continue;
        }


        /*
         * Crear clave única.
         *
         * Dos nombres diferentes pero con
         * la misma categoría e importe
         * serán considerados el mismo impuesto.
         */
        const clave =
            `${categoria}|${importe.toFixed(2)}`;


        /*
         * Si ya fue procesado,
         * NO volver a sumar.
         */
        if (
            importesProcesados.has(
                clave
            )
        ) {
            continue;
        }


        importesProcesados.add(
            clave
        );


        total += importe;
    }


    return redondear(
        total
    );
}


/*
 * =========================================================
 * NORMALIZACIÓN FINAL
 * =========================================================
 */

function normalizarComprobante(
    datos
) {

    if (
        !datos ||
        typeof datos !== "object"
    ) {
        throw new Error(
            "No se recibieron datos válidos para normalizar el comprobante."
        );
    }


    const comprobante =
        obtenerDatosComprobante(
            datos
        );


    const impuestos =
        extraerTablaImpuestos(
            datos
        );


    const cuitVendedor =
        obtenerCuitVendedor(
            datos
        );


    return {

        fechaEmision:
            datos.fechaEmision ||
            "",

        tipoComprobante:
            obtenerTipoComprobante(
            comprobante.letra
        ),

        letraComprobante:
            comprobante.letra,

        puntoVenta:
            comprobante.puntoVenta,

        numeroComprobante:
            comprobante.numeroComprobante,


        tipoDocVendedor:
            cuitVendedor
                ? TIPO_DOCUMENTO_CUIT
                : "",


        nroDocVendedor:
            cuitVendedor,


        denominacionVendedor:
            obtenerDenominacionVendedor(
                datos
            ),


        importeTotal:
            obtenerImporteTotal(
                datos
            ),


        totalIVA:
            calcularTotalIVA(
                impuestos
            ),


        creditoFiscalComputable:
            obtenerIngresosBrutos(impuestos),


        percepcionesIB:
            calcularPercepcionesIB(
                impuestos
            ),


        impuestoInterno:
            calcularImpuestoInterno(
                impuestos
            ),
        /*
        * Tipo de cambio constante.
        */
        tipoCambio: 1,

        /*
         * Detalle completo.
         *
         * excelServicios.js utilizará esto
         * para crear columnas dinámicas.
         */
        impuestos
    };
}


module.exports = {

    normalizarComprobante,

    extraerTablaImpuestos,

    calcularTotalIVA,

    calcularTotalNetoGravado,

    calcularCreditoFiscalComputable,

    calcularPercepciones,

    calcularPercepcionesIB,

    calcularImpuestoInterno
};