/* ========================================================
   CONCILIADOR DE PAGOS
======================================================== */


/**
 * Convierte una fecha YYYY-MM-DD en Date.
 */
function fechaADate(fecha) {

    const [anio, mes, dia] =
        fecha
            .split("-")
            .map(Number);

    return new Date(
        anio,
        mes - 1,
        dia
    );
}


/**
 * Calcula la diferencia absoluta de días
 * entre dos fechas YYYY-MM-DD.
 */
function diferenciaDias(
    fechaA,
    fechaB
) {

    const a =
        fechaADate(fechaA);

    const b =
        fechaADate(fechaB);

    const diferencia =
        Math.abs(
            a.getTime() -
            b.getTime()
        );

    return Math.round(
        diferencia /
        (1000 * 60 * 60 * 24)
    );
}


/* ========================================================
   COMPARACIÓN DE COMBINACIONES
======================================================== */


/**
 * Determina si una combinación encontrada
 * es mejor que otra.
 *
 * Prioridades:
 *
 * 1. Menor distancia total de fechas.
 * 2. Menor distancia máxima.
 * 3. Menor cantidad de liquidaciones.
 */
function esMejorCombinacion(
    nueva,
    actual
) {

    if (!actual) {
        return true;
    }


    if (
        nueva.distanciaTotal <
        actual.distanciaTotal
    ) {
        return true;
    }


    if (
        nueva.distanciaTotal >
        actual.distanciaTotal
    ) {
        return false;
    }


    if (
        nueva.distanciaMaxima <
        actual.distanciaMaxima
    ) {
        return true;
    }


    if (
        nueva.distanciaMaxima >
        actual.distanciaMaxima
    ) {
        return false;
    }


    return (
        nueva.liquidaciones.length <
        actual.liquidaciones.length
    );
}


/* ========================================================
   BÚSQUEDA DE COMBINACIONES
======================================================== */


/**
 * Busca una combinación de liquidaciones cuyo
 * Total Bruto sea exactamente igual al importe
 * del Mayor.
 *
 * Máximo:
 * 20 liquidaciones.
 */
function buscarCombinacion(
    objetivoCentavos,
    fechaMayor,
    candidatas,
    maxLiquidaciones = 20
) {

    /* ====================================================
       DESCARTAMOS IMPORTES IMPOSIBLES
    ==================================================== */

    const disponibles =
        candidatas
            .filter(
                liquidacion =>
                    !liquidacion.utilizada &&
                    liquidacion.brutoCentavos > 0 &&
                    liquidacion.brutoCentavos <=
                        objetivoCentavos
            )
            .map(
                liquidacion => ({
                    ...liquidacion,

                    distanciaDias:
                        diferenciaDias(
                            fechaMayor,
                            liquidacion.fecha
                        )
                })
            );


    /* ====================================================
       COINCIDENCIA DIRECTA
    ==================================================== */

    const directas =
        disponibles.filter(
            liquidacion =>
                liquidacion.brutoCentavos ===
                objetivoCentavos
        );


    if (directas.length > 0) {

        directas.sort(
            (a, b) =>
                a.distanciaDias -
                b.distanciaDias
        );

        return [
            directas[0]
        ];
    }


    /*
     * Priorizamos:
     *
     * 1. Fechas más cercanas.
     * 2. Importes mayores.
     *
     * Esto ayuda al algoritmo a encontrar
     * soluciones razonables rápidamente.
     */
    disponibles.sort(
        (a, b) => {

            if (
                a.distanciaDias !==
                b.distanciaDias
            ) {
                return (
                    a.distanciaDias -
                    b.distanciaDias
                );
            }

            return (
                b.brutoCentavos -
                a.brutoCentavos
            );
        }
    );


    /*
     * Suma acumulada desde cada posición.
     * Permite abandonar ramas que ya no
     * pueden alcanzar el objetivo.
     */
    const sumaRestante =
        new Array(
            disponibles.length + 1
        ).fill(0);


    for (
        let i =
            disponibles.length - 1;
        i >= 0;
        i--
    ) {

        sumaRestante[i] =
            sumaRestante[i + 1] +
            disponibles[i]
                .brutoCentavos;
    }


    let mejor = null;

    const seleccion = [];


    /**
     * Evita recorrer reiteradamente
     * estados claramente inferiores.
     */
    const estadosVisitados =
        new Map();


    function buscar(
        indice,
        sumaActual,
        distanciaTotal,
        distanciaMaxima
    ) {

        /* ================================================
           SOLUCIÓN ENCONTRADA
        ================================================ */

        if (
            sumaActual ===
            objetivoCentavos
        ) {

            const encontrada = {

                liquidaciones:
                    [...seleccion],

                distanciaTotal,

                distanciaMaxima
            };


            if (
                esMejorCombinacion(
                    encontrada,
                    mejor
                )
            ) {
                mejor = encontrada;
            }

            return;
        }


        /* ================================================
           PODAS
        ================================================ */

        if (
            sumaActual >
            objetivoCentavos
        ) {
            return;
        }


        if (
            indice >=
            disponibles.length
        ) {
            return;
        }


        if (
            seleccion.length >=
            maxLiquidaciones
        ) {
            return;
        }


        /*
         * Ni utilizando todos los importes
         * restantes alcanzaríamos el objetivo.
         */
        if (
            sumaActual +
            sumaRestante[indice] <
            objetivoCentavos
        ) {
            return;
        }


        /*
         * Si ya encontramos una combinación
         * temporalmente mejor que esta rama,
         * no seguimos explorándola.
         */
        if (
            mejor &&
            distanciaTotal >
            mejor.distanciaTotal
        ) {
            return;
        }


        const claveEstado =
            `${indice}|` +
            `${sumaActual}|` +
            `${seleccion.length}`;


        const mejorDistanciaAnterior =
            estadosVisitados.get(
                claveEstado
            );


        if (
            mejorDistanciaAnterior !==
                undefined &&
            mejorDistanciaAnterior <=
                distanciaTotal
        ) {
            return;
        }


        estadosVisitados.set(
            claveEstado,
            distanciaTotal
        );


        const liquidacion =
            disponibles[indice];


        /* ================================================
           OPCIÓN 1
           UTILIZAR LA LIQUIDACIÓN
        ================================================ */

        if (
            sumaActual +
            liquidacion.brutoCentavos <=
            objetivoCentavos
        ) {

            seleccion.push(
                liquidacion
            );


            buscar(

                indice + 1,

                sumaActual +
                    liquidacion
                        .brutoCentavos,

                distanciaTotal +
                    liquidacion
                        .distanciaDias,

                Math.max(
                    distanciaMaxima,
                    liquidacion
                        .distanciaDias
                )
            );


            seleccion.pop();
        }


        /* ================================================
           OPCIÓN 2
           OMITIR LA LIQUIDACIÓN
        ================================================ */

        buscar(
            indice + 1,
            sumaActual,
            distanciaTotal,
            distanciaMaxima
        );
    }


    buscar(
        0,
        0,
        0,
        0
    );


    return mejor
        ? mejor.liquidaciones
        : null;
}


/* ========================================================
   MAYOR ↔ LIQUIDACIONES
======================================================== */


/**
 * Procesa el Mayor estrictamente por fecha.
 *
 * Búsqueda:
 *
 * mismo día
 * ±1 día
 * ±2 días
 * ±3 días
 */
function conciliarMayorLiquidaciones(
    mayor,
    liquidaciones
) {

    const resultados = [];


    /*
     * Copiamos los arrays para no modificar
     * directamente los datos recibidos.
     */
    const mayorOrdenado =
        [...mayor].sort(
            (a, b) =>
                a.fecha.localeCompare(
                    b.fecha
                )
        );


    const liquidacionesTrabajo =
        liquidaciones.map(
            liquidacion => ({
                ...liquidacion,
                utilizada: false
            })
        );


    for (
        const registroMayor
        of mayorOrdenado
    ) {

        let combinacion =
            null;

        let rangoUtilizado =
            null;


        /* ================================================
           EXPANSIÓN PROGRESIVA DE FECHAS
        ================================================ */

        const rangosBusqueda = [0, 1, 2, 3, 5, 7]
        for (
            const rango
            of rangosBusqueda
        ) {

            const candidatas =
                liquidacionesTrabajo
                    .filter(
                        liquidacion => {

                            if (
                                liquidacion
                                    .utilizada
                            ) {
                                return false;
                            }


                            const diferencia =
                                diferenciaDias(
                                    registroMayor
                                        .fecha,

                                    liquidacion
                                        .fecha
                                );


                            return (
                                diferencia <=
                                rango
                            );
                        }
                    );


            if (
                candidatas.length === 0
            ) {
                continue;
            }


            combinacion =
                buscarCombinacion(

                    registroMayor
                        .debeCentavos,

                    registroMayor.fecha,

                    candidatas,

                    20
                );


            if (combinacion) {

                rangoUtilizado =
                    rango;

                break;
            }
        }


        /* ================================================
           SIN COINCIDENCIA
        ================================================ */

        if (!combinacion) {

            resultados.push({

                asiento:
                    registroMayor.asiento,

                fecha:
                    registroMayor.fecha,

                detalle:
                    registroMayor.detalle,

                mayorCentavos:
                    registroMayor
                        .debeCentavos,

                brutoLiquidacionesCentavos:
                    0,

                netoLiquidacionesCentavos:
                    0,

                cantidadLiquidaciones:
                    0,

                rangoDias:
                    null,

                liquidaciones:
                    [],

                estado:
                    "SIN_LIQUIDACION"
            });

            continue;
        }


        /* ================================================
           MARCAR LIQUIDACIONES UTILIZADAS
        ================================================ */

        const idsSeleccionados =
            new Set(
                combinacion.map(
                    liquidacion =>
                        liquidacion.id
                )
            );


        for (
            const liquidacion
            of liquidacionesTrabajo
        ) {

            if (
                idsSeleccionados.has(
                    liquidacion.id
                )
            ) {
                liquidacion.utilizada =
                    true;
            }
        }


        /* ================================================
           TOTALES
        ================================================ */

        const totalBruto =
            combinacion.reduce(
                (
                    acumulado,
                    liquidacion
                ) =>
                    acumulado +
                    liquidacion
                        .brutoCentavos,

                0
            );


        const totalNeto =
            combinacion.reduce(
                (
                    acumulado,
                    liquidacion
                ) =>
                    acumulado +
                    liquidacion
                        .netoCentavos,

                0
            );


        resultados.push({

            asiento:
                registroMayor.asiento,

            fecha:
                registroMayor.fecha,

            detalle:
                registroMayor.detalle,

            mayorCentavos:
                registroMayor
                    .debeCentavos,

            brutoLiquidacionesCentavos:
                totalBruto,

            netoLiquidacionesCentavos:
                totalNeto,

            cantidadLiquidaciones:
                combinacion.length,

            rangoDias:
                rangoUtilizado,

            liquidaciones:
                combinacion,

            estado:
                "MAYOR_LIQUIDACION_OK"
        });
    }


    const liquidacionesSinUsar =
        liquidacionesTrabajo.filter(
            liquidacion =>
                !liquidacion.utilizada
        );


    return {
        resultados,
        liquidacionesSinUsar
    };
}


/* ========================================================
   AGRUPACIÓN POR FECHA
======================================================== */


function agruparNetosPorFecha(
    liquidaciones
) {

    const grupos =
        new Map();


    for (
        const liquidacion
        of liquidaciones
    ) {

        if (
            !grupos.has(
                liquidacion.fecha
            )
        ) {

            grupos.set(
                liquidacion.fecha,
                {
                    fecha:
                        liquidacion.fecha,

                    totalNetoCentavos:
                        0,

                    cantidadLiquidaciones:
                        0
                }
            );
        }


        const grupo =
            grupos.get(
                liquidacion.fecha
            );


        grupo.totalNetoCentavos +=
            liquidacion
                .netoCentavos;

        grupo.cantidadLiquidaciones++;
    }


    return grupos;
}


function agruparBancoPorFecha(
    banco
) {

    const grupos =
        new Map();


    for (
        const movimiento
        of banco
    ) {

        if (
            !grupos.has(
                movimiento.fecha
            )
        ) {

            grupos.set(
                movimiento.fecha,
                {
                    fecha:
                        movimiento.fecha,

                    totalBancoCentavos:
                        0,

                    cantidadMovimientos:
                        0
                }
            );
        }


        const grupo =
            grupos.get(
                movimiento.fecha
            );


        grupo.totalBancoCentavos +=
            movimiento
                .creditoCentavos;

        grupo.cantidadMovimientos++;
    }


    return grupos;
}


/* ========================================================
   LIQUIDACIONES ↔ BANCO
======================================================== */


function conciliarLiquidacionesBanco(
    liquidaciones,
    banco
) {

    const netosPorFecha =
        agruparNetosPorFecha(
            liquidaciones
        );


    const bancoPorFecha =
        agruparBancoPorFecha(
            banco
        );


    const fechas =
        new Set([
            ...netosPorFecha.keys(),
            ...bancoPorFecha.keys()
        ]);


    const resultados = [];


    const fechasOrdenadas =
        [...fechas].sort();


    for (
        const fecha
        of fechasOrdenadas
    ) {

        const liquidacion =
            netosPorFecha.get(
                fecha
            );


        const movimientoBanco =
            bancoPorFecha.get(
                fecha
            );


        const netoCentavos =
            liquidacion
                ? liquidacion
                    .totalNetoCentavos
                : 0;


        const bancoCentavos =
            movimientoBanco
                ? movimientoBanco
                    .totalBancoCentavos
                : 0;


        const diferenciaCentavos =
            netoCentavos -
            bancoCentavos;


        let estado;


        if (
            diferenciaCentavos === 0
        ) {

            estado =
                "CONCILIADO";

        } else if (
            diferenciaCentavos > 0
        ) {

            estado =
                "FALTA_BANCO";

        } else {

            estado =
                "SOBRA_BANCO";
        }


        resultados.push({

            fecha,

            netoLiquidacionesCentavos:
                netoCentavos,

            bancoCentavos,

            diferenciaCentavos:
                Math.abs(
                    diferenciaCentavos
                ),

            cantidadLiquidaciones:
                liquidacion
                    ? liquidacion
                        .cantidadLiquidaciones
                    : 0,

            cantidadMovimientosBanco:
                movimientoBanco
                    ? movimientoBanco
                        .cantidadMovimientos
                    : 0,

            estado
        });
    }


    return resultados;
}


/* ========================================================
   PROCESO GENERAL
======================================================== */


function conciliar(
    mayor,
    liquidaciones,
    banco
) {

    /* ====================================================
       FASE 2
       MAYOR ↔ LIQUIDACIONES
    ==================================================== */

    const conciliacionMayor =
        conciliarMayorLiquidaciones(
            mayor,
            liquidaciones
        );


    /* ====================================================
       FASE 3
       LIQUIDACIONES ↔ BANCO
    ==================================================== */

    const conciliacionBanco =
        conciliarLiquidacionesBanco(
            liquidaciones,
            banco
        );


    return {

        mayorLiquidaciones:
            conciliacionMayor
                .resultados,

        liquidacionesSinUsar:
            conciliacionMayor
                .liquidacionesSinUsar,

        banco:
            conciliacionBanco
    };
}


/* ========================================================
   EXPORTS
======================================================== */


module.exports = {

    conciliar,

    conciliarMayorLiquidaciones,

    conciliarLiquidacionesBanco
};