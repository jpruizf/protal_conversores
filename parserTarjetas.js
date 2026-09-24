/**
 * Convierte una fecha AAAAMMDD a DD/MM/AAAA.
 */
function parseHeaderDate(dateStr) {
    if (
        !dateStr ||
        dateStr.length !== 8 ||
        !/^\d{8}$/.test(dateStr)
    ) {
        return 'N/A';
    }

    const yyyy = dateStr.substring(0, 4);
    const mm = dateStr.substring(4, 6);
    const dd = dateStr.substring(6, 8);

    return `${dd}/${mm}/${yyyy}`;
}


/**
 * Convierte un importe con dos decimales implícitos.
 */
function parseAmount(rawValue) {
    const value = String(rawValue || '').trim();

    if (
        !value ||
        !/^-?\d+$/.test(value)
    ) {
        return '0.00';
    }

    const parsedValue = parseInt(value, 10);

    if (Number.isNaN(parsedValue)) {
        return '0.00';
    }

    return (parsedValue / 100).toFixed(2);
}


/**
 * Procesa una línea de ancho fijo
 * según el formato detectado.
 */
function parseLine(
    line,
    formatType,
    cachedDate
) {
    if (
        !line ||
        line.trim() === '' ||
        line.startsWith('*')
    ) {
        return null;
    }

    const type = line.charAt(0);

    /**
     * Cabecera
     */
    if (type === '0') {
        return {
            type: 'CABECERA'
        };
    }

    /**
     * Cierre
     */
    if (type === '9') {
        return {
            type: 'CIERRE'
        };
    }

    /**
     * Solamente los registros tipo 1
     * contienen detalle.
     */
    if (type !== '1') {
        return null;
    }


    /**
     * ============================================================
     * FORMATO LIQC
     * ============================================================
     */
    if (formatType === 'LIQC') {
        const codError =
            line.substring(115, 118).trim() ||
            '000';

        let msgError =
            line.substring(118, 150).trim();

        if (!msgError) {
            msgError =
                codError === '000' ||
                codError === '00'
                    ? 'APROBADA'
                    : 'RECHAZADA';
        }

        return {
            type: 'DETALLE',

            comercio_id:
                line.substring(0, 15).trim(),

            banco_id:
                line.substring(15, 25).trim(),

            tarjeta_token:
                line.substring(25, 41).trim(),

            fecha_proc:
                cachedDate,

            monto_1:
                parseAmount(
                    line.substring(49, 64)
                ),

            monto_2:
                parseAmount(
                    line.substring(64, 79)
                ),

            monto_3:
                parseAmount(
                    line.substring(79, 94)
                ),

            codigo_error:
                codError,

            mensaje_error:
                msgError
        };
    }


    /**
     * ============================================================
     * VISA DÉBITO
     *
     * RDEBLIQD: movimientos validados.
     * LDEBLIQD: movimientos liquidados.
     *
     * Registros de 150 caracteres.
     * ============================================================
     */
    if (
        formatType === 'RDEBLIQD' ||
        formatType === 'LDEBLIQD'
    ) {
        const nroTarjeta =
            line.substring(1, 17).trim();

        const refComprobante =
            line.substring(20, 28).trim();

        const fechaOrig =
            line.substring(28, 36).trim();

        const importeRaw =
            line.substring(40, 55).trim();

        const idDebito =
            line.substring(55, 70).trim();

        const codError =
            line.substring(100, 103).trim() ||
            '000';

        let msgError =
            line.substring(103, 143).trim();

        if (!msgError) {
            msgError =
                codError === '000' ||
                codError === '00'
                    ? 'APROBADA'
                    : 'RECHAZADA';
        }

        const fechaFormateada =
            parseHeaderDate(fechaOrig);

        return {
            type: 'DETALLE',

            comercio_id:
                idDebito,

            banco_id:
                refComprobante,

            tarjeta_token:
                nroTarjeta,

            fecha_proc:
                fechaFormateada !== 'N/A'
                    ? fechaFormateada
                    : cachedDate,

            monto_1:
                parseAmount(importeRaw),

            monto_2:
                '0.00',

            monto_3:
                '0.00',

            codigo_error:
                codError,

            mensaje_error:
                msgError
        };
    }


    /**
     * ============================================================
     * VISA CRÉDITO
     *
     * RDEBLIQC / DEBLIQC
     *
     * Registros de 300 caracteres.
     *
     * Posiciones verificadas:
     * - Tarjeta / Token: 27-42
     * - Monto bruto: 63-77
     * ============================================================
     */
    
    if (formatType === 'DEBLIQC') {

    const codigoBanco =
        line.substring(1, 4).trim();

    const codigoCasa =
        line.substring(4, 7).trim();

    const numeroLote =
        line.substring(7, 11).trim();

    const codigoTransaccion =
        line.substring(11, 15).trim();

    const numeroEstablecimiento =
        line.substring(16, 26).trim();

    const nroTarjeta =
        line.substring(26, 42).trim();

    const numeroCupon =
        line.substring(42, 50).trim();

    const fechaOrigenRaw =
        line.substring(50, 56).trim();

    const codigoAutorizacion =
        line.substring(56, 61).trim();

    const importeRaw =
        line.substring(62, 77).trim();

    const cuotas =
        line.substring(77, 79).trim();

    const identificador =
        line.substring(94, 109).trim();

    const marcaPrimerDebito =
        line.substring(109, 110).trim();

    const numeroCuenta =
        line.substring(110, 120).trim();

    const estadoMovimiento =
        line.substring(129, 130).trim();

    const codigoMotivo1 =
        line.substring(130, 132).trim();

    const descripcionMotivo1 =
        line.substring(132, 161).trim();

    const codigoMotivo2 =
        line.substring(161, 163).trim();

    const descripcionMotivo2 =
        line.substring(163, 192).trim();


    /**
     * Fecha de origen en formato DDMMAA.
     */
    let fechaOrigen = cachedDate;

    if (
        fechaOrigenRaw &&
        /^\d{6}$/.test(fechaOrigenRaw)
    ) {
        const dd =
            fechaOrigenRaw.substring(0, 2);

        const mm =
            fechaOrigenRaw.substring(2, 4);

        const aa =
            fechaOrigenRaw.substring(4, 6);

        fechaOrigen =
            `${dd}/${mm}/20${aa}`;
    }


    /**
     * Determinar descripción del estado.
     */
    let mensajeEstado = 'APROBADA';

    if (descripcionMotivo1) {
        mensajeEstado =
            descripcionMotivo1;
    } else if (descripcionMotivo2) {
        mensajeEstado =
            descripcionMotivo2;
    } else if (
        codigoMotivo1 ||
        codigoMotivo2
    ) {
        mensajeEstado =
            'RECHAZADA';
    }


    return {
        type: 'DETALLE',

        codigo_banco:
            codigoBanco,

        codigo_casa:
            codigoCasa,

        numero_lote:
            numeroLote,

        codigo_transaccion:
            codigoTransaccion,

        numero_establecimiento:
            numeroEstablecimiento,

        tarjeta_token:
            nroTarjeta,

        numero_cupon:
            numeroCupon,

        fecha_proc:
            fechaOrigen,

        codigo_autorizacion:
            codigoAutorizacion,

        monto_1:
            parseAmount(importeRaw),

        cuotas:
            cuotas,

        identificador:
            identificador,

        marca_primer_debito:
            marcaPrimerDebito,

        numero_cuenta:
            numeroCuenta,

        estado_movimiento:
            estadoMovimiento,

        codigo_error:
            codigoMotivo1 ||
            codigoMotivo2 ||
            '00',

        mensaje_error:
            mensajeEstado,

        codigo_motivo_1:
            codigoMotivo1,

        descripcion_motivo_1:
            descripcionMotivo1,

        codigo_motivo_2:
            codigoMotivo2,

        descripcion_motivo_2:
            descripcionMotivo2
    };
}

    /**
     * ============================================================
     * FORMATO GENÉRICO DE RESPALDO
     * ============================================================
     */
    return {
        type: 'DETALLE',

        comercio_id:
            'N/A',

        banco_id:
            line.substring(17, 25).trim(),

        tarjeta_token:
            line.substring(0, 17).trim(),

        fecha_proc:
            cachedDate,

        monto_1:
            parseAmount(
                line.substring(33, 48)
            ),

        monto_2:
            parseAmount(
                line.substring(48, 63)
            ),

        monto_3:
            parseAmount(
                line.substring(63, 78)
            ),

        codigo_error:
            '000',

        mensaje_error:
            'APROBADA'
    };
}


module.exports = {
    parseHeaderDate,
    parseAmount,
    parseLine
};