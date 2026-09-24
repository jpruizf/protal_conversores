/**
 * Convierte una fecha DD/MM/AAAA
 * a objeto Date.
 */
function convertirFechaADate(fecha) {
    if (!fecha) {
        return null;
    }

    const partes =
        String(fecha)
            .trim()
            .split("/");

    if (partes.length !== 3) {
        return null;
    }

    const [
        dia,
        mes,
        anio
    ] = partes.map(Number);

    if (
        !dia ||
        !mes ||
        !anio
    ) {
        return null;
    }

    return new Date(
        anio,
        mes - 1,
        dia
    );
}


/**
 * Convierte un objeto Date
 * al formato DD/MM/AAAA.
 */
function formatearFecha(fecha) {
    if (!(fecha instanceof Date)) {
        return "";
    }

    const dia =
        String(
            fecha.getDate()
        ).padStart(2, "0");

    const mes =
        String(
            fecha.getMonth() + 1
        ).padStart(2, "0");

    const anio =
        fecha.getFullYear();

    return `${dia}/${mes}/${anio}`;
}


/**
 * Obtiene la fecha correspondiente
 * al día anterior.
 */
function obtenerFechaLiquidacion(
    fechaEmision
) {
    const fecha =
        convertirFechaADate(
            fechaEmision
        );

    if (!fecha) {
        throw new Error(
            `Fecha de emisión inválida: ${fechaEmision}`
        );
    }

    fecha.setDate(
        fecha.getDate() - 1
    );

    return formatearFecha(
        fecha
    );
}


/**
 * Redondea importes a dos decimales.
 */
function redondearImporte(valor) {
    return Number(
        Number(valor || 0)
            .toFixed(2)
    );
}


/**
 * Determina el estado de conciliación.
 */
function determinarEstado({
    cantidadLiquidaciones,
    diferenciaImporte,
    diferenciaRegistros,
    totalRecaudadoPDF,
    totalRegistrosPDF
}) {

    if (
        totalRecaudadoPDF === null ||
        totalRecaudadoPDF === undefined
    ) {
        return "FALTA IMPORTE PDF";
    }

    if (
        totalRegistrosPDF === null ||
        totalRegistrosPDF === undefined
    ) {
        return "FALTA TOTAL REGISTROS PDF";
    }

    if (
        cantidadLiquidaciones === 0
    ) {
        return "SIN LIQUIDACIONES";
    }

    const coincideImporte =
        Math.abs(
            diferenciaImporte
        ) <= 0.01;

    const coincideRegistros =
        diferenciaRegistros === 0;


    if (
        coincideImporte &&
        coincideRegistros
    ) {
        return "COINCIDE";
    }


    if (
        !coincideImporte &&
        coincideRegistros
    ) {
        return "NO COINCIDE IMPORTE";
    }


    if (
        coincideImporte &&
        !coincideRegistros
    ) {
        return "NO COINCIDE REGISTROS";
    }


    return (
        "NO COINCIDE IMPORTE Y REGISTROS"
    );
}


/**
 * Concilia un único resumen
 * de comisiones contra las
 * liquidaciones.
 */
function conciliarResumen(
    resumenComision,
    liquidaciones
) {

    if (!resumenComision) {
        throw new Error(
            "No se recibió resumen de comisiones."
        );
    }

    if (!Array.isArray(liquidaciones)) {
        throw new Error(
            "Las liquidaciones deben ser un array."
        );
    }


    const fechaLiquidacion =
        obtenerFechaLiquidacion(
            resumenComision.fechaEmision
        );


    /**
     * Buscamos TODAS las liquidaciones
     * correspondientes al día anterior
     * a la fecha de emisión.
     */
    const liquidacionesCoincidentes =
        liquidaciones.filter(
            liquidacion =>
                liquidacion.fecha ===
                fechaLiquidacion
        );


    /**
     * Sumamos cantidad de transacciones.
     */
    const totalTransaccionesLiquidacion =
        liquidacionesCoincidentes.reduce(
            (acumulador, liquidacion) =>
                acumulador +
                Number(
                    liquidacion
                        .cantidadTransacciones ||
                    0
                ),
            0
        );


    /**
     * Sumamos importe bruto.
     */
    const importeBrutoLiquidaciones =
        redondearImporte(
            liquidacionesCoincidentes.reduce(
                (
                    acumulador,
                    liquidacion
                ) =>
                    acumulador +
                    Number(
                        liquidacion
                            .importeBruto ||
                        0
                    ),
                0
            )
        );


    const cantidadLiquidaciones =
        liquidacionesCoincidentes.length;


    /**
     * Diferencia monetaria:
     *
     * Total recaudado PDF
     * -
     * Importe bruto liquidaciones
     */
    const diferenciaImporte =
        redondearImporte(
            Number(
                resumenComision
                    .totalRecaudado ||
                0
            ) -
            importeBrutoLiquidaciones
        );


    /**
     * Diferencia de registros:
     *
     * Total registros PDF
     * -
     * Total transacciones Excel
     */
    const diferenciaRegistros =
        Number(
            resumenComision
                .totalRegistros ||
            0
        ) -
        totalTransaccionesLiquidacion;


    const estado =
        determinarEstado({
            cantidadLiquidaciones,

            diferenciaImporte,

            diferenciaRegistros,

            totalRecaudadoPDF:
                resumenComision
                    .totalRecaudado,

            totalRegistrosPDF:
                resumenComision
                    .totalRegistros
        });


    /**
     * Información auxiliar.
     *
     * Aunque inicialmente no aparezca
     * completa en el Excel final,
     * será útil para diagnóstico.
     */
    const archivosLiquidacion =
        [
            ...new Set(
                liquidacionesCoincidentes
                    .map(
                        item =>
                            item.archivoOrigen
                    )
                    .filter(Boolean)
            )
        ];


    const mediosPagoLiquidacion =
        [
            ...new Set(
                liquidacionesCoincidentes
                    .map(
                        item =>
                            item.medioPago
                    )
                    .filter(Boolean)
            )
        ];


    return {
        /**
         * Datos PDF
         */
        nombreArchivoPDF:
            resumenComision
                .nombreArchivoOriginal ||
            "",

        fechaEmision:
            resumenComision
                .fechaEmision,

        totalRegistrosPDF:
            resumenComision
                .totalRegistros,

        totalRecaudadoPDF:
            resumenComision
                .totalRecaudado,

        comision:
            resumenComision
                .comision,

        ivaComision:
            resumenComision
                .ivaComision,

        retencionRG3130:
            resumenComision
                .retencionRG3130,

        efectivo:
            resumenComision
                .efectivo,

        debito:
            resumenComision
                .debito,

        pagosQR:
            resumenComision
                .pagosQR,


        /**
         * Datos Excel
         */
        fechaLiquidacion,

        totalTransaccionesLiquidacion,

        importeBrutoLiquidaciones,

        cantidadLiquidaciones,


        /**
         * Control
         */
        diferenciaImporte,

        diferenciaRegistros,

        estado,


        /**
         * Diagnóstico
         */
        archivosLiquidacion,

        mediosPagoLiquidacion,

        liquidaciones:
            liquidacionesCoincidentes
    };
}


/**
 * Concilia uno o varios
 * resúmenes de comisiones.
 */
function conciliarComisiones(
    resumenesComision,
    liquidaciones
) {

    if (
        !Array.isArray(
            resumenesComision
        )
    ) {
        throw new Error(
            "Los resúmenes de comisión deben ser un array."
        );
    }

    if (
        !Array.isArray(
            liquidaciones
        )
    ) {
        throw new Error(
            "Las liquidaciones deben ser un array."
        );
    }


    return resumenesComision.map(
        resumen =>
            conciliarResumen(
                resumen,
                liquidaciones
            )
    );
}


module.exports = {
    conciliarResumen,
    conciliarComisiones,
    obtenerFechaLiquidacion
};