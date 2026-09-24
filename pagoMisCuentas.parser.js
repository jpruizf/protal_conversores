// parsers/pagoMisCuentas.parser.js

/**
 * Parser de liquidaciones Pago Mis Cuentas
 *
 * Entrada:
 *   texto plano extraído desde PDF
 *
 * Salida:
 *   objeto normalizado listo para Excel
 *
 * Este módulo NO:
 * - lee archivos PDF
 * - genera Excel
 * - levanta servidor
 */


// ---------------------------------------------------------
// NORMALIZACIÓN
// ---------------------------------------------------------

function normalizarTexto(texto = '') {
    return String(texto)
        .replace(/\u00a0/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}


function normalizarClave(texto = '') {
    return normalizarTexto(texto)
        .toUpperCase()
        .replace(/[ÁÀÄÂ]/g, 'A')
        .replace(/[ÉÈËÊ]/g, 'E')
        .replace(/[ÍÌÏÎ]/g, 'I')
        .replace(/[ÓÒÖÔ]/g, 'O')
        .replace(/[ÚÙÜÛ]/g, 'U');
}


// ---------------------------------------------------------
// UTILIDADES
// ---------------------------------------------------------

function escaparRegex(texto) {
    return texto.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
    );
}


function extraerConAliases(texto, aliases, patronValor) {
    const textoNormalizado = normalizarTexto(texto);

    for (const alias of aliases) {

        const aliasRegex = escaparRegex(alias)
            .replace(/\s+/g, '\\s+');

        const regex = new RegExp(
            `${aliasRegex}\\s*[:\\-]?\\s*(${patronValor})`,
            'i'
        );

        const match = textoNormalizado.match(regex);

        if (match) {
            return match[1].trim();
        }
    }

    return null;
}


// ---------------------------------------------------------
// FORMATOS DE VALOR
// ---------------------------------------------------------

const PATRON_MONEDA =
    '-?[\\d.]+(?:,\\d{1,2})?';

const PATRON_FECHA =
    '\\d{2}\\/\\d{2}\\/\\d{4}';

const PATRON_NUMERO =
    '[\\d.]+';


// ---------------------------------------------------------
// COMPROBANTE
// ---------------------------------------------------------

function extraerComprobante(texto) {
    const textoNormalizado =
        normalizarTexto(texto);

    /*
     * Caso directo:
     *
     * NRO.COMPROBANTE 310278
     */

    let match = textoNormalizado.match(
        /NRO\.?\s*COMPROBANTE\s*([\d.]+)/i
    );

    if (match) {
        return match[1].trim();
    }

    /*
     * Caso Supervielle:
     *
     * NRO.COMPROBANTE
     * Y COMPROBANTE DE RETENCION DE IMPUESTOS
     * 177.632
     */

    match = textoNormalizado.match(
        /NRO\.?\s*COMPROBANTE(?:\s+Y\s+COMPROBANTE\s+DE\s+RETENCION\s+DE\s+IMPUESTOS)?\s*([\d.]+)/i
    );

    if (match) {
        return match[1].trim();
    }

    return null;
}


// ---------------------------------------------------------
// EMPRESA
// ---------------------------------------------------------

function extraerEmpresa(texto) {
    const textoNormalizado =
        normalizarTexto(texto);

    /*
     * Actualmente buscamos la razón social que termine
     * en S.A. / S.A
     *
     * Ejemplo conocido:
     * INTERREDES S.A.
     */

    const match = textoNormalizado.match(
        /\b([A-ZÁÉÍÓÚÑ0-9.&\- ]{2,}?\s+S\.?A\.?)\b/i
    );

    if (!match) {
        return null;
    }

    return match[1]
        .replace(/\s+/g, ' ')
        .trim();
}


// ---------------------------------------------------------
// FORMA DE PAGO
// ---------------------------------------------------------

function extraerFormaPago(texto) {
    const textoNormalizado =
        normalizarTexto(texto);

    /*
     * Variante:
     *
     * FORMA DE PAGO
     * TRANSFERENCIA BANCARIA
     */

    if (
        /FORMA\s+DE\s+PAGO\s+TRANSFERENCIA\s+BANCARIA/i
            .test(textoNormalizado)
    ) {
        return {
            tipo: 'TRANSFERENCIA BANCARIA',
            banco: null,
            sucursal: null,
            cuenta_corriente: null
        };
    }


    /*
     * Variante bancaria:
     *
     * BANCO 027
     * SUCURSAL 091
     * CUENTA CORRIENTE NRO. 4717875003
     */

    const banco =
        extraerConAliases(
            textoNormalizado,
            ['BANCO'],
            '[A-Z0-9.\\-]+'
        );

    const sucursal =
        extraerConAliases(
            textoNormalizado,
            ['SUCURSAL'],
            '[A-Z0-9.\\-]+'
        );

    const cuenta =
        extraerConAliases(
            textoNormalizado,
            [
                'CUENTA CORRIENTE NRO.',
                'CUENTA CORRIENTE NRO',
                'CAJA DE AHORROS NRO.',
                'CAJA DE AHORRO NRO.',
                'CAJA DE AHORROS NRO',
                'CAJA DE AHORRO NRO'
            ],
            '[A-Z0-9.\\-]+'
        );


    if (banco || sucursal || cuenta) {
        return {
            tipo: 'BANCO',
            banco,
            sucursal,
            cuenta_corriente: cuenta
        };
    }


    /*
     * Si encontramos FORMA DE PAGO pero no podemos
     * identificarla todavía, dejamos constancia
     * sin inventar valores.
     */

    if (
        /FORMA\s+DE\s+PAGO/i.test(
            textoNormalizado
        )
    ) {
        return {
            tipo: null,
            banco: null,
            sucursal: null,
            cuenta_corriente: null
        };
    }


    return {
        tipo: null,
        banco: null,
        sucursal: null,
        cuenta_corriente: null
    };
}


// ---------------------------------------------------------
// PARSER PRINCIPAL
// ---------------------------------------------------------

function parsearPagoMisCuentas(texto) {

    if (
        texto === null ||
        texto === undefined ||
        typeof texto !== 'string'
    ) {
        throw new Error(
            'El parser esperaba texto extraído del PDF.'
        );
    }

    const contenido =
        normalizarTexto(texto);

    if (!contenido) {
        throw new Error(
            'El texto recibido está vacío.'
        );
    }


    const formaPago =
        extraerFormaPago(contenido);


    return {

        // -------------------------------------------------
        // DATOS PRINCIPALES
        // -------------------------------------------------

        comprobante:
            extraerComprobante(contenido),

        empresa:
            extraerEmpresa(contenido),

        fecha_pago:
            extraerConAliases(
                contenido,
                [
                    'FECHA DE PAGO'
                ],
                PATRON_FECHA
            ),


        // -------------------------------------------------
        // LIQUIDACIÓN
        // -------------------------------------------------

        recaudacion_bruta:
            extraerConAliases(
                contenido,
                [
                    'RECAUDACION'
                ],
                PATRON_MONEDA
            ),

        arancel:
            extraerConAliases(
                contenido,
                [
                    'ARANCEL TOTAL',
                    'COMISION'
                ],
                PATRON_MONEDA
            ),

        iva_arancel:
            extraerConAliases(
                contenido,
                [
                    'IVA ARANCEL TOTAL',
                    'I.V.A. S/COMISION',
                    'IVA S/COMISION'
                ],
                PATRON_MONEDA
            ),


        // -------------------------------------------------
        // RETENCIONES / PERCEPCIONES
        // -------------------------------------------------

        retencion_iva:
            extraerConAliases(
                contenido,
                [
                    'RETENCION I.V.A. RG 3130',
                    'RETENCION DE IVA 3130',
                    'RETENCION IVA RG 3130'
                ],
                PATRON_MONEDA
            ),

        retencion_iibb:
            extraerConAliases(
                contenido,
                [
                    'RETENCION IIBB SIRTAC'
                ],
                PATRON_MONEDA
            ),

        percepcion_iva:
            extraerConAliases(
                contenido,
                [
                    'PERCEPCION I.V.A. RG 3337',
                    'PERCEPCION DE IVA',
                    'PERCEPCION IVA RG 3337'
                ],
                PATRON_MONEDA
            ),


        // -------------------------------------------------
        // RECAUDACIÓN NETA
        // -------------------------------------------------

        recaudacion_neta:
            extraerConAliases(
                contenido,
                [
                    'RECAUDACION NETA'
                ],
                PATRON_MONEDA
            ),


        // -------------------------------------------------
        // FORMA DE PAGO
        // -------------------------------------------------

        forma_pago:
            formaPago.tipo,

        banco:
            formaPago.banco,

        sucursal:
            formaPago.sucursal,

        cuenta_corriente:
            formaPago.cuenta_corriente
    };
}


// ---------------------------------------------------------
// EXPORTACIONES
// ---------------------------------------------------------

module.exports = {
    parsearPagoMisCuentas,
    normalizarTexto
};