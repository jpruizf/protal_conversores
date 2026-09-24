/**
 * ============================================================
 * PARSER RESUMEN VISA BUSINESS - BANCO GALICIA
 * ============================================================
 *
 * Responsabilidad:
 *
 * - Recibir el texto extraído de un PDF.
 * - Detectar datos generales del resumen.
 * - Detectar ciclo de facturación.
 * - Obtener mes de facturación.
 * - Extraer consumos.
 * - Extraer impuestos / comisiones / gastos.
 * - Detectar subtotales por tarjeta.
 * - Obtener TOTAL A PAGAR.
 *
 * NO genera Excel.
 * NO recibe archivos.
 * NO levanta Express.
 *
 * Esas responsabilidades corresponden a otros módulos.
 * ============================================================
 */


/**
 * Convierte un importe argentino a Number.
 *
 * Ejemplos:
 *
 * "1.630.200,00"  -> 1630200
 * "18,61"         -> 18.61
 * "-364.559,00"   -> -364559
 * "$ 85.158,57"   -> 85158.57
 *
 * @param {String|Number} valor
 * @returns {Number}
 */
function convertirImporte(valor) {

    if (
        valor === undefined ||
        valor === null
    ) {
        return 0;
    }


    if (
        typeof valor === "number"
    ) {
        return valor;
    }


    let texto =
        String(valor)
            .trim();


    if (!texto) {
        return 0;
    }


    texto =
        texto
            .replace(/\$/g, "")
            .replace(/U\$S/gi, "")
            .replace(/USD/gi, "")
            .replace(/\s/g, "");


    /**
     * Formato argentino:
     *
     * 1.234.567,89
     *
     * Eliminamos puntos de miles
     * y reemplazamos coma decimal.
     */
    texto =
        texto
            .replace(/\./g, "")
            .replace(",", ".");


    const numero =
        Number(texto);


    if (
        !Number.isFinite(numero)
    ) {
        return 0;
    }


    return numero;
}


/**
 * Normaliza espacios sin destruir
 * saltos de línea.
 *
 * @param {String} texto
 * @returns {String}
 */
function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }


    return String(texto)
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .trim();
}


/**
 * Convierte:
 *
 * 27-Ago-26
 *
 * a:
 *
 * 27-08-26
 *
 * También acepta fechas ya numéricas.
 *
 * @param {String} fecha
 * @returns {String}
 */
function normalizarFecha(fecha) {

    if (!fecha) {
        return "";
    }


    const valor =
        String(fecha)
            .trim();


    /**
     * Ya viene DD-MM-AA.
     */
    if (
        /^\d{2}-\d{2}-\d{2}$/.test(
            valor
        )
    ) {
        return valor;
    }


    const meses = {

        ene: "01",
        feb: "02",
        mar: "03",
        abr: "04",
        may: "05",
        jun: "06",
        jul: "07",
        ago: "08",
        sep: "09",
        set: "09",
        oct: "10",
        nov: "11",
        dic: "12"

    };


    const match =
        valor.match(
            /^(\d{2})-([A-Za-zÁÉÍÓÚáéíóú]{3})-(\d{2})$/
        );


    if (!match) {
        return valor;
    }


    const dia =
        match[1];


    const mesTexto =
        match[2]
            .toLowerCase()
            .normalize("NFD")
            .replace(
                /[\u0300-\u036f]/g,
                ""
            );


    const anio =
        match[3];


    const mes =
        meses[mesTexto];


    if (!mes) {
        return valor;
    }


    return `${dia}-${mes}-${anio}`;
}


/**
 * Obtiene nombre de mes y año
 * a partir de DD-MM-AA.
 *
 * @param {String} fecha
 * @returns {String}
 */
function obtenerMesFacturacion(fecha) {

    const fechaNormalizada =
        normalizarFecha(
            fecha
        );


    const match =
        fechaNormalizada.match(
            /^\d{2}-(\d{2})-(\d{2})$/
        );


    if (!match) {
        return "";
    }


    const meses = [
        "",
        "ENERO",
        "FEBRERO",
        "MARZO",
        "ABRIL",
        "MAYO",
        "JUNIO",
        "JULIO",
        "AGOSTO",
        "SEPTIEMBRE",
        "OCTUBRE",
        "NOVIEMBRE",
        "DICIEMBRE"
    ];


    const numeroMes =
        Number(match[1]);


    const anio =
        `20${match[2]}`;


    return (
        `${meses[numeroMes]} ${anio}`
    );
}


/**
 * Busca el número del resumen.
 *
 * Ejemplo:
 *
 * Resumen N° VI00000000005179897
 *
 * @param {String} texto
 * @returns {String}
 */
function extraerNumeroResumen(texto) {

    const match =
        texto.match(
            /Resumen\s+N[°º]?\s*(VI\d+)/i
        );


    return match
        ? match[1]
        : "";
}


/**
 * Busca el identificador técnico.
 *
 * Ejemplo:
 *
 * 20260827075179897H
 *
 * @param {String} texto
 * @returns {String}
 */
function extraerIdentificadorResumen(
    texto
) {

    const match =
        texto.match(
            /\b(\d{17}H)\b/
        );


    return match
        ? match[1]
        : "";
}


/**
 * Extrae información principal
 * de la empresa/banco.
 *
 * @param {String} texto
 * @returns {Object}
 */
function extraerDatosGenerales(texto) {

    const resultado = {

        razonSocial: "",
        condicionIVA: "",
        cuitBanco: "",
        cuenta: "",
        sucursal: "",
        direccion: ""

    };


    /**
     * Razón social + condición IVA.
     */
    const empresaMatch =
        texto.match(
            /^(.+?)\s+Responsable\s+inscripto\s+CUIT\s+Banco:/im
        );


    if (empresaMatch) {

        resultado.razonSocial =
            empresaMatch[1]
                .trim();

        resultado.condicionIVA =
            "Responsable inscripto";

    }


    /**
     * CUIT Banco.
     */
    const cuitMatch =
        texto.match(
            /CUIT\s+Banco:\s*([\d-]+)/i
        );


    if (cuitMatch) {

        resultado.cuitBanco =
            cuitMatch[1];

    }


    /**
     * Número de cuenta.
     */
    const cuentaMatch =
        texto.match(
            /N[°º]?\s*Cuenta:\s*(\d+)/i
        );


    if (cuentaMatch) {

        resultado.cuenta =
            cuentaMatch[1];

    }


    /**
     * Sucursal.
     */
    const sucursalMatch =
        texto.match(
            /Sucursal:\s*(\d+)/i
        );


    if (sucursalMatch) {

        resultado.sucursal =
            sucursalMatch[1];

    }


    /**
     * Dirección.
     *
     * Está normalmente en la línea
     * inmediatamente anterior a N° Cuenta.
     */
    const lineas =
        texto.split("\n");


    for (
        const linea of lineas
    ) {

        if (
            /N[°º]?\s*Cuenta:/i.test(
                linea
            )
        ) {

            const parte =
                linea.split(
                    /N[°º]?\s*Cuenta:/i
                )[0];


            resultado.direccion =
                parte.trim();

            break;

        }

    }


    return resultado;
}


/**
 * Extrae las seis fechas del
 * ciclo de facturación.
 *
 * En los PDFs analizados aparecen:
 *
 * cierre anterior
 * vencimiento anterior
 * cierre actual
 * vencimiento actual
 * próximo cierre
 * próximo vencimiento
 *
 * Ejemplo agosto:
 *
 * 30-Jul-26
 * 10-Ago-26
 * 27-Ago-26
 * 07-Sep-26
 * 01-Oct-26
 * 13-Oct-26
 *
 * @param {String} texto
 * @returns {Object}
 */
function extraerCicloFacturacion(texto) {

    const resultado = {

        cierreAnterior: "",
        vencimientoAnterior: "",

        cierreActual: "",
        vencimientoActual: "",

        proximoCierre: "",
        proximoVencimiento: ""

    };


    /**
     * Buscamos secuencia de 6 fechas
     * con meses escritos.
     */
    const patronFecha =
        "\\d{2}-[A-Za-zÁÉÍÓÚáéíóú]{3}-\\d{2}";


    const regex =
        new RegExp(
            `(${patronFecha})\\s+` +
            `(${patronFecha})\\s+` +
            `(${patronFecha})\\s+` +
            `(${patronFecha})\\s+` +
            `(${patronFecha})\\s+` +
            `(${patronFecha})`,
            "i"
        );


    const match =
        texto.match(
            regex
        );


    if (!match) {

        return resultado;

    }


    resultado.cierreAnterior =
        normalizarFecha(
            match[1]
        );


    resultado.vencimientoAnterior =
        normalizarFecha(
            match[2]
        );


    resultado.cierreActual =
        normalizarFecha(
            match[3]
        );


    resultado.vencimientoActual =
        normalizarFecha(
            match[4]
        );


    resultado.proximoCierre =
        normalizarFecha(
            match[5]
        );


    resultado.proximoVencimiento =
        normalizarFecha(
            match[6]
        );


    return resultado;
}


/**
 * Extrae pago mínimo.
 *
 * @param {String} texto
 * @returns {Number}
 */
function extraerPagoMinimo(texto) {

    const match =
        texto.match(
            /PAGO\s+MINIMO[\s\S]{0,100}?En\s+pesos\s+\$\s*([\d.]+,\d{2})/i
        );


    return match
        ? convertirImporte(
            match[1]
        )
        : 0;
}


/**
 * Extrae límites principales.
 *
 * @param {String} texto
 * @returns {Object}
 */
function extraerLimites(texto) {

    const resultado = {

        compras: 0,
        financiacion: 0

    };


    const comprasMatch =
        texto.match(
            /De\s+compras\s+en\s+un\s+pago\s+y\s+en\s+cuotas\s+\$\s*([\d.]+,\d{2})/i
        );


    if (comprasMatch) {

        resultado.compras =
            convertirImporte(
                comprasMatch[1]
            );

    }


    const financiacionMatch =
        texto.match(
            /De\s+financiaci[oó]n\s+\$\s*([\d.]+,\d{2})/i
        );


    if (financiacionMatch) {

        resultado.financiacion =
            convertirImporte(
                financiacionMatch[1]
            );

    }


    return resultado;
}


/**
 * Determina si una línea corresponde
 * a subtotal por tarjeta.
 *
 * Ejemplo:
 *
 * TARJETA 2817 Total Consumos de ...
 *
 * @param {String} linea
 * @returns {Boolean}
 */
function esLineaSubtotalTarjeta(
    linea
) {

    return (
        /^TARJETA\s+\d{4}\s+Total\s+Consumos/i
            .test(
                linea.trim()
            )
    );
}


/**
 * Extrae subtotales por tarjeta.
 *
 * @param {String} texto
 * @returns {Array}
 */
function extraerTarjetas(texto) {

    const tarjetas = [];


    const lineas =
        texto.split("\n");


    const regex =
        /^TARJETA\s+(\d{4})\s+Total\s+Consumos\s+de\s+(.+?)\s+([\d.-]+,\d{2})\s+([\d.-]+,\d{2})$/i;


    for (
        const lineaOriginal of lineas
    ) {

        const linea =
            lineaOriginal.trim();


        const match =
            linea.match(
                regex
            );


        if (!match) {
            continue;
        }


        tarjetas.push({

            numero:
                match[1],

            titular:
                match[2].trim(),

            totalPesos:
                convertirImporte(
                    match[3]
                ),

            totalDolares:
                convertirImporte(
                    match[4]
                )

        });

    }


    return tarjetas;
}


/**
 * Identifica líneas correspondientes
 * a impuestos / comisiones / gastos.
 *
 * @param {String} linea
 * @returns {Boolean}
 */
function esGastoImpuesto(linea) {

    return (
        /IMPUESTO\s+DE\s+SELLOS/i
            .test(linea) ||

        /COMISI[ÓO]N/i
            .test(linea) ||

        /DB\s+IVA/i
            .test(linea) ||

        /PERCEP\.?IVA/i
            .test(linea) ||

        /IIBB\s+PERCEP/i
            .test(linea) ||

        /DB\.?RG\s*5617/i
            .test(linea) ||

        /RETENCI[ÓO]N/i
            .test(linea) ||

        /PERCEPCI[ÓO]N/i
            .test(linea)
    );
}


/**
 * Extrae todos los importes con formato
 * argentino presentes en una línea.
 *
 * @param {String} linea
 * @returns {Array<Number>}
 */
function extraerImportesLinea(linea) {

    const coincidencias =
        linea.match(
            /-?\d{1,3}(?:\.\d{3})*,\d{2}/g
        ) ||
        [];


    return coincidencias.map(
        convertirImporte
    );
}


/**
 * Extrae un movimiento normal.
 *
 * IMPORTANTE:
 *
 * La última cifra de la línea corresponde
 * al importe liquidado en pesos o dólares.
 *
 * La presencia de moneda extranjera
 * dentro de la referencia:
 *
 * USD
 * EUR
 * CNY
 * HKD
 * BRL
 *
 * permite determinar que el último
 * importe corresponde a DÓLARES.
 *
 * @param {String} linea
 * @returns {Object|null}
 */
function parsearMovimiento(linea) {

    const matchFecha =
        linea.match(
            /^(\d{2}-\d{2}-\d{2})\s+(.+)$/
        );


    if (!matchFecha) {
        return null;
    }


    const fecha =
        matchFecha[1];


    const resto =
        matchFecha[2].trim();


    /**
     * Tomamos el último importe
     * de la línea.
     */
    const matchImporteFinal =
        resto.match(
            /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/
        );


    if (!matchImporteFinal) {
        return null;
    }


    const importe =
        convertirImporte(
            matchImporteFinal[1]
        );


    /**
     * Eliminamos importe final.
     */
    let referencia =
        resto.substring(
            0,
            resto.length -
            matchImporteFinal[0].length
        )
        .trim();


    /**
     * Antes del importe final suele estar
     * el comprobante numérico de 6 dígitos.
     *
     * Ejemplo:
     *
     * GOOGLE... USD 0,49 270223 0,49
     *
     * Eliminamos únicamente el comprobante
     * final para dejar una referencia limpia.
     */
    referencia =
        referencia.replace(
            /\s+\d{6}\s*$/,
            ""
        );


    /**
     * Detectamos moneda extranjera.
     *
     * Aunque el consumo original sea EUR,
     * CNY, HKD o BRL, Galicia finalmente
     * lo liquida en la columna DÓLARES.
     */
    const esDolares =
        /\b(?:USD|EUR|CNY|HKD|BRL)\b/i
            .test(
                referencia
            );


    return {

        fecha,

        referencia,

        importePesos:
            esDolares
                ? 0
                : importe,

        importeDolares:
            esDolares
                ? importe
                : 0,

        tarjeta:
            "",

        asiento:
            "",

        tipo:
            "CONSUMO"

    };
}


/**
 * Extrae un movimiento de impuesto,
 * comisión o gasto.
 *
 * @param {String} linea
 * @returns {Object|null}
 */
function parsearGasto(linea) {

    const match =
        linea.match(
            /^(\d{2}-\d{2}-\d{2})\s+(.+)$/
        );


    if (!match) {
        return null;
    }


    const fecha =
        match[1];


    const resto =
        match[2]
            .trim();


    const importes =
        extraerImportesLinea(
            resto
        );


    if (
        importes.length === 0
    ) {
        return null;
    }


    /**
     * En líneas como:
     *
     * DB IVA $ RESP INSC. 21% 5.867,00 1.232,07
     *
     * 5.867 es base imponible
     * 1.232,07 es el cargo real.
     *
     * Por eso tomamos el ÚLTIMO importe.
     */
    const importe =
        importes[
            importes.length - 1
        ];


    return {

        fecha,

        referencia:
            resto,

        importePesos:
            importe,

        importeDolares:
            0,

        tarjeta:
            "",

        asiento:
            "",

        tipo:
            "GASTO"

    };
}


/**
 * Extrae la zona real de movimientos.
 *
 * Comienza en:
 *
 * DETALLE DEL CONSUMO
 *
 * y termina antes de:
 *
 * TOTAL A PAGAR
 *
 * @param {String} texto
 * @returns {String}
 */
function extraerBloqueMovimientos(
    texto
) {

    const inicio =
        texto.search(
            /DETALLE\s+DEL\s+CONSUMO/i
        );


    if (
        inicio === -1
    ) {
        return "";
    }


    const desdeDetalle =
        texto.substring(
            inicio
        );


    const fin =
        desdeDetalle.search(
            /TOTAL\s+A\s+PAGAR/i
        );


    if (
        fin === -1
    ) {
        return desdeDetalle;
    }


    return desdeDetalle.substring(
        0,
        fin
    );
}


/**
 * Extrae consumos e impuestos.
 *
 * @param {String} texto
 * @returns {Object}
 */
function extraerMovimientos(texto) {

    const bloque =
        extraerBloqueMovimientos(
            texto
        );


    const movimientos = [];
    const gastos = [];


    const lineas =
        bloque
            .split("\n")
            .map(
                linea =>
                    linea.trim()
            )
            .filter(Boolean);


    for (
        const linea of lineas
    ) {

        /**
         * Encabezados.
         */
        if (
            /DETALLE\s+DEL\s+CONSUMO/i
                .test(linea) ||

            /^FECHA\s+REFERENCIA/i
                .test(linea)
        ) {
            continue;
        }


        /**
         * No agregamos subtotales
         * TARJETA como movimientos.
         */
        if (
            esLineaSubtotalTarjeta(
                linea
            )
        ) {
            continue;
        }


        /**
         * Gastos / impuestos.
         */
        if (
            esGastoImpuesto(
                linea
            )
        ) {

            const gasto =
                parsearGasto(
                    linea
                );


            if (gasto) {

                gastos.push(
                    gasto
                );


                movimientos.push(
                    gasto
                );

            }


            continue;
        }


        /**
         * Consumo normal.
         */
        const movimiento =
            parsearMovimiento(
                linea
            );


        if (movimiento) {

            movimientos.push(
                movimiento
            );

        }

    }


    return {

        movimientos,
        gastos

    };
}


/**
 * Extrae TOTAL A PAGAR.
 *
 * Ejemplo:
 *
 * TOTAL A PAGAR 19.470.137,99 4.591,33
 *
 * @param {String} texto
 * @returns {Object}
 */
function extraerTotalPagar(texto) {

    const resultado = {

        totalPesos: 0,
        totalDolares: 0

    };


    const match =
        texto.match(
            /TOTAL\s+A\s+PAGAR\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i
        );


    if (!match) {

        return resultado;

    }


    resultado.totalPesos =
        convertirImporte(
            match[1]
        );


    resultado.totalDolares =
        convertirImporte(
            match[2]
        );


    return resultado;
}


/**
 * Calcula total de gastos detectados.
 *
 * @param {Array} gastos
 * @returns {Number}
 */
function calcularTotalGastos(gastos) {

    return gastos.reduce(
        (
            acumulado,
            gasto
        ) =>

            acumulado +
            (
                Number(
                    gasto.importePesos
                ) ||
                0
            ),

        0
    );
}


/**
 * Parser principal.
 *
 * @param {String} textoPdf
 * @returns {Object}
 */
function parsearResumen(
    textoPdf
) {

    if (
        !textoPdf ||
        typeof textoPdf !== "string"
    ) {

        throw new Error(
            "El parser no recibió texto válido del PDF."
        );

    }


    const texto =
        normalizarTexto(
            textoPdf
        );


    /**
     * Validación mínima.
     */
    if (
        !/VISA\s+BUSINESS/i.test(
            texto
        )
    ) {

        throw new Error(
            "El documento no parece ser un resumen VISA BUSINESS."
        );

    }


    const numeroResumen =
        extraerNumeroResumen(
            texto
        );


    const identificadorResumen =
        extraerIdentificadorResumen(
            texto
        );


    const empresa =
        extraerDatosGenerales(
            texto
        );


    const ciclo =
        extraerCicloFacturacion(
            texto
        );


    /**
     * Definimos mes por cierre actual.
     *
     * Ejemplo:
     *
     * cierre actual 27-08-26
     * =>
     * AGOSTO 2026
     */
    const mesFacturacion =
        obtenerMesFacturacion(
            ciclo.vencimientoActual
        );


    const pagoMinimo =
        extraerPagoMinimo(
            texto
        );


    const limites =
        extraerLimites(
            texto
        );


    const tarjetas =
        extraerTarjetas(
            texto
        );


    const {
        movimientos,
        gastos
    } =
        extraerMovimientos(
            texto
        );


    const {
        totalPesos,
        totalDolares
    } =
        extraerTotalPagar(
            texto
        );


    const totalComisionesGastos =
        calcularTotalGastos(
            gastos
        );


    return {

        ente:
            "GALICIA",

        tarjeta:
            "VISA BUSINESS",

        numeroResumen,

        identificadorResumen,

        empresa,

        ciclo,

        mesFacturacion,

        pagoMinimo,

        limites,

        tarjetas,

        movimientos,

        gastos,

        totalComisionesGastos,

        totalPesos,

        totalDolares,

        /**
         * Información de diagnóstico.
         * Nos servirá muchísimo durante
         * las primeras pruebas.
         */
        diagnostico: {

            cantidadMovimientos:
                movimientos.length,

            cantidadConsumos:
                movimientos.filter(
                    movimiento =>
                        movimiento.tipo ===
                        "CONSUMO"
                ).length,

            cantidadGastos:
                gastos.length,

            cantidadTarjetas:
                tarjetas.length

        }

    };
}


/**
 * ============================================================
 * EXPORTACIONES
 * ============================================================
 */

module.exports = {

    parsearResumen,

    convertirImporte,

    normalizarFecha,

    obtenerMesFacturacion,

    extraerNumeroResumen,

    extraerIdentificadorResumen,

    extraerDatosGenerales,

    extraerCicloFacturacion,

    extraerPagoMinimo,

    extraerLimites,

    extraerTarjetas,

    extraerMovimientos,

    extraerTotalPagar

};